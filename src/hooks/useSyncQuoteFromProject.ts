import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Room, ScaleCalibration, ProjectMaterial } from '@/lib/canvas/types';
import { Material } from './useMaterials';
import { getAreaM2, getOrderAreaM2, resolveMaterial } from './useGenerateQuoteFromProject';
import { calculateRoomAccessories } from '@/lib/accessories/calculations';
import { calculateSellFromMargin } from './useQuoteLineItems';
import { calculateStripPlan, extractRollMaterialSpecs } from '@/lib/rollGoods';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { FloorPlanPage } from '@/lib/canvas/types';

export interface OrphanedRoomInfo {
  parentId: string;
  description: string;
  childIds: string[];
}

export interface SyncResult {
  updatedRooms: number;
  addedRooms: number;
  orphanedRooms: OrphanedRoomInfo[];
  totalItemsUpdated: number;
}

interface DbLineItem {
  id: string;
  organization_id: string;
  quote_id: string;
  parent_line_item_id: string | null;
  description: string;
  quantity: number;
  cost_price: number;
  sell_price: number;
  margin_percentage: number;
  unit_price: number;
  line_total: number;
  estimated_hours: number;
  item_order: number;
  is_optional: boolean;
  is_active: boolean;
  source_room_id: string | null;
  metadata: Record<string, unknown>;
}

function computeStripPlan(
  room: Room,
  material: Material,
  scale: ScaleCalibration
): StripPlanResult | undefined {
  if (material.type !== 'roll') return undefined;
  try {
    const rollSpecs = extractRollMaterialSpecs(material.specs as Record<string, unknown>);
    const covingHeightMm = room.accessories?.coving?.enabled ? (room.accessories.coving.heightMm || 100) : 0;
    return calculateStripPlan(room, rollSpecs, scale, {
      fillDirection: room.fillDirection || 0,
      firstSeamOffset: room.seamOptions?.firstSeamOffset || 0,
      manualSeams: room.seamOptions?.manualSeams || [],
      avoidSeamZones: room.seamOptions?.avoidZones || [],
      wasteOverride: room.wastePercent,
      covingHeightMm,
    });
  } catch {
    return undefined;
  }
}

export function useSyncQuoteFromProject() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const removeOrphanedRooms = async (quoteId: string, parentIds: string[], childIds: string[]) => {
    setIsRemoving(true);
    try {
      const allIds = [...parentIds, ...childIds];
      // Soft-delete by setting is_active = false — use individual updates for reliability
      const updateResults = await Promise.all(
        allIds.map(id =>
          supabase
            .from('quote_line_items')
            .update({ is_active: false } as any)
            .eq('id', id)
        )
      );
      const firstError = updateResults.find(r => r.error)?.error;
      if (firstError) throw firstError;

      // Recalculate quote totals
      const { data: allItems } = await (supabase as any)
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('is_active', true);

      if (allItems) {
        const activeChildren = allItems.filter((i: any) => i.parent_line_item_id && !i.is_optional);
        const subtotal = activeChildren.reduce((sum: number, c: any) => sum + Number(c.line_total), 0);
        const totalCost = activeChildren.reduce((sum: number, c: any) => sum + (Number(c.quantity) * Number(c.cost_price)), 0);
        const totalMargin = subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0;

        const { data: quote } = await (supabase as any)
          .from('quotes')
          .select('tax_rate')
          .eq('id', quoteId)
          .single();

        const taxRate = Number(quote?.tax_rate) || 10;
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;

        await (supabase as any)
          .from('quotes')
          .update({
            subtotal: Math.round(subtotal * 100) / 100,
            total_cost: Math.round(totalCost * 100) / 100,
            total_margin: Math.round(totalMargin * 100) / 100,
            tax_amount: Math.round(taxAmount * 100) / 100,
            total_amount: Math.round(totalAmount * 100) / 100,
          })
          .eq('id', quoteId);
      }

      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quote_line_items', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });

      toast.success(`Removed ${parentIds.length} orphaned room${parentIds.length !== 1 ? 's' : ''} from quote`);
    } catch (error: any) {
      toast.error(`Failed to remove rooms: ${error.message}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const syncQuote = async (quoteId: string): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      // 1. Fetch the quote to get project_id and org
      const { data: quote, error: qErr } = await (supabase as any)
        .from('quotes')
        .select('id, project_id, organization_id, tax_rate')
        .eq('id', quoteId)
        .single();
      if (qErr) throw qErr;
      if (!quote.project_id) throw new Error('Quote is not linked to a project');

      // 2. Fetch the project's json_data
      const { data: project, error: pErr } = await (supabase as any)
        .from('projects')
        .select('json_data')
        .eq('id', quote.project_id)
        .single();
      if (pErr) throw pErr;

      const jsonData = project.json_data as Record<string, unknown>;

      // Extract all rooms across all pages
      const pages = (jsonData.pages as FloorPlanPage[]) || [];
      let allRooms: Room[] = [];
      let scale: ScaleCalibration | null = null;

      if (pages.length > 0) {
        for (const page of pages) {
          allRooms = [...allRooms, ...page.rooms];
          if (!scale && page.scale) scale = page.scale;
        }
      } else {
        allRooms = (jsonData.rooms as Room[]) || [];
        scale = (jsonData.scale as ScaleCalibration) || null;
      }

      const projectMaterials = (jsonData.projectMaterials as ProjectMaterial[]) || [];

      // 3. Fetch materials library
      const { data: materialsData } = await (supabase as any)
        .from('materials')
        .select('*')
        .or(`organization_id.eq.${quote.organization_id},is_global.eq.true`);
      const materials: Material[] = (materialsData || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        specs: m.specs,
        is_global: m.is_global,
        organization_id: m.organization_id,
      }));

      // 4. Fetch current quote line items
      const { data: existingItems, error: liErr } = await (supabase as any)
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('is_active', true)
        .order('item_order');
      if (liErr) throw liErr;

      const dbItems: DbLineItem[] = existingItems || [];

      // Separate parents and children
      const parents = dbItems.filter(i => !i.parent_line_item_id);
      const children = dbItems.filter(i => !!i.parent_line_item_id);

      // Build lookup: source_room_id → parent
      const parentByRoom = new Map<string, DbLineItem>();
      for (const p of parents) {
        if (p.source_room_id) parentByRoom.set(p.source_room_id, p);
      }

      // Build lookup: parent_id → children by metadata type
      const childrenByParent = new Map<string, DbLineItem[]>();
      for (const c of children) {
        if (!c.parent_line_item_id) continue;
        const arr = childrenByParent.get(c.parent_line_item_id) || [];
        arr.push(c);
        childrenByParent.set(c.parent_line_item_id, arr);
      }

      const roomsWithMaterials = allRooms.filter(r => r.materialId);
      const updates: Array<{ id: string; updates: Partial<DbLineItem> }> = [];
      const inserts: Array<Omit<DbLineItem, 'id'> & { _tempParentKey?: string }> = [];
      let updatedRooms = 0;
      let addedRooms = 0;
      let totalItemsUpdated = 0;

      // Calculate average margin from existing children for new items
      const existingMargins = children
        .filter(c => c.margin_percentage > 0)
        .map(c => c.margin_percentage);
      const avgMargin = existingMargins.length > 0
        ? existingMargins.reduce((a, b) => a + b, 0) / existingMargins.length
        : 30;
      const defaultMargin = Math.round(avgMargin * 100) / 100;

      for (const room of roomsWithMaterials) {
        const material = resolveMaterial(room.materialId, materials, projectMaterials);
        if (!material) continue;

        const stripPlan = computeStripPlan(room, material, scale!);
        const netM2 = getAreaM2(room, scale);
        const orderM2 = getOrderAreaM2(room, scale, material, stripPlan);

        const existingParent = parentByRoom.get(room.id);

        if (existingParent) {
          // Update existing room
          updatedRooms++;

          // Update parent description if room name changed
          if (existingParent.description !== room.name) {
            updates.push({
              id: existingParent.id,
              updates: { description: room.name },
            });
            totalItemsUpdated++;
          }

          // Update children by metadata type
          const existingChildren = childrenByParent.get(existingParent.id) || [];

          for (const child of existingChildren) {
            const metaType = (child.metadata as any)?.type as string;
            if (!metaType) continue;

            let newQty: number | null = null;
            let newDescription: string | undefined;

            switch (metaType) {
              case 'material': {
                newQty = Math.round(orderM2 * 100) / 100;
                // Update description if material changed
                const expectedDesc = `${material.name} Supply`;
                if (child.description !== expectedDesc) {
                  newDescription = expectedDesc;
                }
                break;
              }
              case 'installation': {
                const installType = (child.metadata as any)?.installType;
                newQty = installType === 'per_m2'
                  ? Math.round(netM2 * 100) / 100
                  : 1;
                break;
              }
              case 'coving':
              case 'weld_rod':
              case 'smooth_edge':
              case 'underlayment':
              case 'adhesive':
              case 'transition': {
                // Recalculate accessories
                const accCalc = calculateRoomAccessories(room, scale, netM2, materials, stripPlan);
                const accMap: Record<string, { quantity: number }> = {};
                if (accCalc.coving) accMap['coving'] = accCalc.coving;
                if (accCalc.weldRod) accMap['weld_rod'] = accCalc.weldRod;
                if (accCalc.smoothEdge) accMap['smooth_edge'] = accCalc.smoothEdge;
                if (accCalc.underlayment) accMap['underlayment'] = accCalc.underlayment;
                if (accCalc.adhesive) accMap['adhesive'] = accCalc.adhesive;
                // Transitions are arrays, handle first match
                if (accCalc.transitions?.length) {
                  accMap['transition'] = accCalc.transitions[0];
                }

                const accData = accMap[metaType];
                if (accData) {
                  newQty = Math.round(accData.quantity * 100) / 100;
                }
                break;
              }
            }

            if (newQty !== null && newQty !== Number(child.quantity)) {
              const childUpdates: Partial<DbLineItem> = {
                quantity: newQty,
                line_total: Math.round(newQty * Number(child.sell_price) * 100) / 100,
              };
              if (newDescription) {
                childUpdates.description = newDescription;
              }
              updates.push({ id: child.id, updates: childUpdates });
              totalItemsUpdated++;
            } else if (newDescription && newDescription !== child.description) {
              updates.push({ id: child.id, updates: { description: newDescription } });
              totalItemsUpdated++;
            }
          }
        } else {
          // New room — create parent + children
          addedRooms++;
          const parentKey = `new-parent-${room.id}`;
          const maxOrder = parents.length + addedRooms - 1;

          // Parent
          inserts.push({
            organization_id: quote.organization_id,
            quote_id: quoteId,
            parent_line_item_id: null,
            description: room.name,
            quantity: 0,
            cost_price: 0,
            sell_price: 0,
            margin_percentage: 0,
            unit_price: 0,
            line_total: 0,
            estimated_hours: 0,
            item_order: maxOrder,
            is_optional: false,
            is_active: true,
            source_room_id: room.id,
            metadata: {},
            _tempParentKey: parentKey,
          });

          let childOrder = 0;
          const specs = material.specs as any;
          const costPerM2 = specs.pricePerM2 || specs.price || 0;
          const sellPerM2 = calculateSellFromMargin(costPerM2, defaultMargin);

          // Material supply
          const materialQty = Math.round(orderM2 * 100) / 100;
          inserts.push({
            organization_id: quote.organization_id,
            quote_id: quoteId,
            parent_line_item_id: parentKey, // resolved later
            description: `${material.name} Supply`,
            quantity: materialQty,
            cost_price: Math.round(costPerM2 * 100) / 100,
            sell_price: Math.round(sellPerM2 * 100) / 100,
            margin_percentage: defaultMargin,
            unit_price: Math.round(sellPerM2 * 100) / 100,
            line_total: Math.round(materialQty * sellPerM2 * 100) / 100,
            estimated_hours: 0,
            item_order: childOrder++,
            is_optional: false,
            is_active: true,
            source_room_id: room.id,
            metadata: { type: 'material', wastePercent: room.wastePercent ?? specs.wastePercent ?? 10 },
          });

          // Installation
          if (room.installCost && room.installCost.rate > 0) {
            const isPerM2 = room.installCost.type === 'per_m2';
            const installQty = isPerM2 ? Math.round(netM2 * 100) / 100 : 1;
            let effectiveCost = room.installCost.rate;
            let effectiveSell = room.installCost.sellRate || calculateSellFromMargin(effectiveCost, defaultMargin);
            if (room.installCost.oohAllowance) {
              const mult = room.installCost.oohMultiplier || 1.5;
              effectiveCost *= mult;
              effectiveSell *= mult;
            }
            const installMargin = effectiveSell > 0
              ? Math.round(((effectiveSell - effectiveCost) / effectiveSell) * 100 * 100) / 100
              : defaultMargin;

            inserts.push({
              organization_id: quote.organization_id,
              quote_id: quoteId,
              parent_line_item_id: parentKey,
              description: `Installation${room.installCost.oohAllowance ? ' (OOH)' : ''}`,
              quantity: installQty,
              cost_price: Math.round(effectiveCost * 100) / 100,
              sell_price: Math.round(effectiveSell * 100) / 100,
              margin_percentage: installMargin,
              unit_price: Math.round(effectiveSell * 100) / 100,
              line_total: Math.round(installQty * effectiveSell * 100) / 100,
              estimated_hours: 0,
              item_order: childOrder++,
              is_optional: false,
              is_active: true,
              source_room_id: room.id,
              metadata: {
                type: 'installation',
                installType: room.installCost.type,
                ooh: room.installCost.oohAllowance || false,
              },
            });
          }

          // Accessories
          if (room.accessories) {
            const accCalc = calculateRoomAccessories(room, scale, netM2, materials, stripPlan);
            const accItems: Array<{ description: string; qty: number; costPerUnit: number; type: string }> = [];

            if (accCalc.coving) accItems.push({ description: accCalc.coving.materialName || 'Wall Coving', qty: Math.round(accCalc.coving.quantity * 100) / 100, costPerUnit: accCalc.coving.unitPrice, type: 'coving' });
            if (accCalc.weldRod) accItems.push({ description: accCalc.weldRod.materialName || 'Weld Rod', qty: Math.round(accCalc.weldRod.quantity * 100) / 100, costPerUnit: accCalc.weldRod.unitPrice, type: 'weld_rod' });
            if (accCalc.smoothEdge) accItems.push({ description: accCalc.smoothEdge.materialName || 'Smooth Edge', qty: Math.round(accCalc.smoothEdge.quantity * 100) / 100, costPerUnit: accCalc.smoothEdge.unitPrice, type: 'smooth_edge' });
            if (accCalc.underlayment) accItems.push({ description: accCalc.underlayment.materialName || 'Underlayment', qty: Math.round(accCalc.underlayment.quantity * 100) / 100, costPerUnit: accCalc.underlayment.unitPrice, type: 'underlayment' });
            if (accCalc.adhesive) accItems.push({ description: accCalc.adhesive.materialName || 'Adhesive', qty: accCalc.adhesive.quantity, costPerUnit: accCalc.adhesive.unitPrice, type: 'adhesive' });
            if (accCalc.transitions) {
              for (const t of accCalc.transitions) {
                accItems.push({ description: t.materialName || 'Transition', qty: t.quantity, costPerUnit: t.unitPrice, type: 'transition' });
              }
            }

            for (const acc of accItems) {
              const accSell = calculateSellFromMargin(acc.costPerUnit, defaultMargin);
              inserts.push({
                organization_id: quote.organization_id,
                quote_id: quoteId,
                parent_line_item_id: parentKey,
                description: acc.description,
                quantity: acc.qty,
                cost_price: Math.round(acc.costPerUnit * 100) / 100,
                sell_price: Math.round(accSell * 100) / 100,
                margin_percentage: defaultMargin,
                unit_price: Math.round(accSell * 100) / 100,
                line_total: Math.round(acc.qty * accSell * 100) / 100,
                estimated_hours: 0,
                item_order: childOrder++,
                is_optional: false,
                is_active: true,
                source_room_id: room.id,
                metadata: { type: acc.type },
              });
            }
          }
        }
      }

      // Find orphaned rooms (in quote but not in takeoff)
      const takeoffRoomIds = new Set(allRooms.map(r => r.id));
      const orphanedRooms: OrphanedRoomInfo[] = [];
      for (const parent of parents) {
        if (parent.source_room_id && !takeoffRoomIds.has(parent.source_room_id)) {
          const parentChildren = childrenByParent.get(parent.id) || [];
          orphanedRooms.push({
            parentId: parent.id,
            description: parent.description,
            childIds: parentChildren.map(c => c.id),
          });
        }
      }

      // 5. Apply updates
      for (const { id, updates: upd } of updates) {
        await (supabase as any)
          .from('quote_line_items')
          .update(upd)
          .eq('id', id);
      }

      // 6. Insert new items (parents first, then children)
      if (inserts.length > 0) {
        const parentInserts = inserts.filter(i => !i.parent_line_item_id || i._tempParentKey);
        const childInserts = inserts.filter(i => i.parent_line_item_id && !i._tempParentKey);

        const tempKeyToRealId = new Map<string, string>();

        // Insert parents
        for (const pInsert of parentInserts) {
          const { _tempParentKey, ...cleanInsert } = pInsert;
          const { data: inserted, error } = await (supabase as any)
            .from('quote_line_items')
            .insert(cleanInsert)
            .select()
            .single();
          if (error) throw error;
          if (_tempParentKey) tempKeyToRealId.set(_tempParentKey, inserted.id);
        }

        // Insert children with resolved parent IDs
        if (childInserts.length > 0) {
          const resolved = childInserts.map(c => {
            const { _tempParentKey, ...clean } = c;
            return {
              ...clean,
              parent_line_item_id: tempKeyToRealId.get(c.parent_line_item_id!) || c.parent_line_item_id,
            };
          });
          const { error } = await (supabase as any)
            .from('quote_line_items')
            .insert(resolved);
          if (error) throw error;
        }
      }

      // 7. Recalculate quote totals
      const { data: allItems } = await (supabase as any)
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('is_active', true);

      if (allItems) {
        const activeChildren = allItems.filter((i: any) => i.parent_line_item_id && !i.is_optional);
        const subtotal = activeChildren.reduce((sum: number, c: any) => sum + Number(c.line_total), 0);
        const totalCost = activeChildren.reduce((sum: number, c: any) => sum + (Number(c.quantity) * Number(c.cost_price)), 0);
        const totalMargin = subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0;
        const taxRate = Number(quote.tax_rate) || 10;
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;

        await (supabase as any)
          .from('quotes')
          .update({
            subtotal: Math.round(subtotal * 100) / 100,
            total_cost: Math.round(totalCost * 100) / 100,
            total_margin: Math.round(totalMargin * 100) / 100,
            tax_amount: Math.round(taxAmount * 100) / 100,
            total_amount: Math.round(totalAmount * 100) / 100,
          })
          .eq('id', quoteId);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quote_line_items', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });

      const result: SyncResult = {
        updatedRooms,
        addedRooms,
        orphanedRooms,
        totalItemsUpdated,
      };

      // Build toast message
      const parts: string[] = [];
      if (updatedRooms > 0) parts.push(`Updated ${updatedRooms} room${updatedRooms !== 1 ? 's' : ''}`);
      if (addedRooms > 0) parts.push(`added ${addedRooms} new room${addedRooms !== 1 ? 's' : ''}`);
      if (orphanedRooms.length > 0) parts.push(`${orphanedRooms.length} orphaned room${orphanedRooms.length !== 1 ? 's' : ''}`);

      if (parts.length > 0) {
        toast.success(parts.join(', '));
      } else {
        toast.info('Quote is already in sync with takeoff');
      }

      return result;
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  return { syncQuote, isSyncing, removeOrphanedRooms, isRemoving };
}
