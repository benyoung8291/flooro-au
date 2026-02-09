import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Room, ScaleCalibration, ProjectMaterial } from '@/lib/canvas/types';
import { Material } from './useMaterials';
import { projectMaterialToMaterial } from './useProjectMaterials';
import { calculateRoomNetArea } from '@/lib/canvas/geometry';
import { calculateRoomAccessories } from '@/lib/accessories/calculations';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { calculateSellFromMargin } from './useQuoteLineItems';

interface GenerateQuoteInput {
  projectId: string;
  projectName: string;
  projectAddress?: string;
  rooms: Room[];
  scale: ScaleCalibration | null;
  materials: Material[];
  projectMaterials: ProjectMaterial[];
  stripPlans?: Map<string, StripPlanResult>;
  defaultMargin?: number;
}

interface QuoteLineItemInsert {
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

export function getAreaM2(room: Room, scale: ScaleCalibration | null): number {
  if (!scale) return 0;
  const netPx = calculateRoomNetArea(room);
  return netPx / (scale.pixelsPerMm * scale.pixelsPerMm) / 1_000_000;
}

export function getOrderAreaM2(
  room: Room,
  scale: ScaleCalibration | null,
  material: Material | undefined,
  stripPlan?: StripPlanResult
): number {
  if (!scale || !material) return 0;

  if (material.type === 'roll' && stripPlan) {
    return stripPlan.totalMaterialAreaM2;
  }

  const netM2 = getAreaM2(room, scale);
  const wastePercent = room.wastePercent ?? (material.specs as any).wastePercent ?? 10;
  return netM2 * (1 + wastePercent / 100);
}

export function resolveMaterial(
  materialId: string | null,
  materials: Material[],
  projectMaterials: ProjectMaterial[]
): Material | undefined {
  if (!materialId) return undefined;
  const pm = projectMaterials.find(p => p.id === materialId);
  if (pm) return projectMaterialToMaterial(pm);
  return materials.find(m => m.id === materialId);
}

export function useGenerateQuoteFromProject() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuote = async (input: GenerateQuoteInput) => {
    if (!user || !profile?.organization_id) {
      toast.error('Not authenticated');
      return null;
    }

    const {
      projectId,
      projectName,
      projectAddress,
      rooms,
      scale,
      materials,
      projectMaterials,
      stripPlans,
      defaultMargin = 30,
    } = input;

    const roomsWithMaterials = rooms.filter(r => r.materialId);
    if (roomsWithMaterials.length === 0) {
      toast.error('No rooms have materials assigned. Assign materials before generating a quote.');
      return null;
    }

    setIsGenerating(true);

    try {
      // 1. Generate quote number
      const { data: quoteNumber, error: rpcError } = await (supabase as any)
        .rpc('generate_quote_number', { _org_id: profile.organization_id });
      if (rpcError) throw rpcError;

      // 2. Load org terms
      const { data: org } = await supabase
        .from('organizations')
        .select('terms_and_conditions')
        .eq('id', profile.organization_id)
        .single();

      // 3. Create the quote header
      const { data: quote, error: quoteError } = await (supabase as any)
        .from('quotes')
        .insert({
          organization_id: profile.organization_id,
          project_id: projectId,
          quote_number: quoteNumber,
          title: `${projectName} - Flooring Quote`,
          client_address: projectAddress || null,
          terms_and_conditions: org?.terms_and_conditions || null,
          tax_rate: 10,
          created_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // 4. Build line items per room
      const lineItems: QuoteLineItemInsert[] = [];
      let parentOrder = 0;

      for (const room of roomsWithMaterials) {
        const material = resolveMaterial(room.materialId, materials, projectMaterials);
        if (!material) continue;

        const netM2 = getAreaM2(room, scale);
        const orderM2 = getOrderAreaM2(room, scale, material, stripPlans?.get(room.id));
        const specs = material.specs as any;
        const costPerM2 = specs.pricePerM2 || specs.price || 0;
        const sellPerM2 = calculateSellFromMargin(costPerM2, defaultMargin);

        // Parent: room name (no qty/cost on parent, aggregated from children)
        const parentTempId = `parent-${room.id}`;
        lineItems.push({
          organization_id: profile.organization_id,
          quote_id: quote.id,
          parent_line_item_id: null,
          description: room.name,
          quantity: 0,
          cost_price: 0,
          sell_price: 0,
          margin_percentage: 0,
          unit_price: 0,
          line_total: 0,
          estimated_hours: 0,
          item_order: parentOrder++,
          is_optional: false,
          is_active: true,
          source_room_id: room.id,
          metadata: { _tempId: parentTempId },
        });

        // Children for this room
        let childOrder = 0;

        // Child 1: Material supply
        const materialTotal = orderM2 * sellPerM2;
        lineItems.push({
          organization_id: profile.organization_id,
          quote_id: quote.id,
          parent_line_item_id: parentTempId, // will be resolved after parent insert
          description: `${material.name} Supply`,
          quantity: Math.round(orderM2 * 100) / 100,
          cost_price: Math.round(costPerM2 * 100) / 100,
          sell_price: Math.round(sellPerM2 * 100) / 100,
          margin_percentage: defaultMargin,
          unit_price: Math.round(sellPerM2 * 100) / 100,
          line_total: Math.round(materialTotal * 100) / 100,
          estimated_hours: 0,
          item_order: childOrder++,
          is_optional: false,
          is_active: true,
          source_room_id: room.id,
          metadata: { type: 'material', wastePercent: room.wastePercent ?? specs.wastePercent ?? 10 },
        });

        // Child 2: Installation (if configured)
        if (room.installCost && room.installCost.rate > 0) {
          const isPerM2 = room.installCost.type === 'per_m2';
          const installQty = isPerM2 ? Math.round(netM2 * 100) / 100 : 1;
          const installCost = room.installCost.rate;
          const installSell = room.installCost.sellRate || calculateSellFromMargin(installCost, defaultMargin);
          let effectiveCost = installCost;
          let effectiveSell = installSell;

          // Apply OOH multiplier
          if (room.installCost.oohAllowance) {
            const mult = room.installCost.oohMultiplier || 1.5;
            effectiveCost = installCost * mult;
            effectiveSell = installSell * mult;
          }

          const installMargin = effectiveSell > 0
            ? Math.round(((effectiveSell - effectiveCost) / effectiveSell) * 100 * 100) / 100
            : defaultMargin;

          lineItems.push({
            organization_id: profile.organization_id,
            quote_id: quote.id,
            parent_line_item_id: parentTempId,
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
              priceBookItemId: room.installCost.priceBookItemId || null,
            },
          });
        }

        // Child 3+: Accessories
        if (room.accessories) {
          const accessoryCalc = calculateRoomAccessories(
            room,
            scale,
            netM2,
            materials,
            stripPlans?.get(room.id)
          );

          const accessoryItems: Array<{ description: string; qty: number; unit: string; costPerUnit: number; type: string }> = [];

          if (accessoryCalc.coving) {
            accessoryItems.push({
              description: accessoryCalc.coving.materialName || 'Wall Coving',
              qty: Math.round(accessoryCalc.coving.quantity * 100) / 100,
              unit: 'm',
              costPerUnit: accessoryCalc.coving.unitPrice,
              type: 'coving',
            });
          }

          if (accessoryCalc.weldRod) {
            accessoryItems.push({
              description: accessoryCalc.weldRod.materialName || 'Weld Rod',
              qty: Math.round(accessoryCalc.weldRod.quantity * 100) / 100,
              unit: 'm',
              costPerUnit: accessoryCalc.weldRod.unitPrice,
              type: 'weld_rod',
            });
          }

          if (accessoryCalc.smoothEdge) {
            accessoryItems.push({
              description: accessoryCalc.smoothEdge.materialName || 'Smooth Edge',
              qty: Math.round(accessoryCalc.smoothEdge.quantity * 100) / 100,
              unit: 'm',
              costPerUnit: accessoryCalc.smoothEdge.unitPrice,
              type: 'smooth_edge',
            });
          }

          if (accessoryCalc.underlayment) {
            accessoryItems.push({
              description: accessoryCalc.underlayment.materialName || 'Underlayment',
              qty: Math.round(accessoryCalc.underlayment.quantity * 100) / 100,
              unit: 'm²',
              costPerUnit: accessoryCalc.underlayment.unitPrice,
              type: 'underlayment',
            });
          }

          if (accessoryCalc.adhesive) {
            accessoryItems.push({
              description: accessoryCalc.adhesive.materialName || 'Adhesive',
              qty: accessoryCalc.adhesive.quantity,
              unit: 'units',
              costPerUnit: accessoryCalc.adhesive.unitPrice,
              type: 'adhesive',
            });
          }

          if (accessoryCalc.transitions) {
            for (const t of accessoryCalc.transitions) {
              accessoryItems.push({
                description: t.materialName || 'Transition',
                qty: t.quantity,
                unit: 'pcs',
                costPerUnit: t.unitPrice,
                type: 'transition',
              });
            }
          }

          for (const acc of accessoryItems) {
            const accSell = calculateSellFromMargin(acc.costPerUnit, defaultMargin);
            lineItems.push({
              organization_id: profile.organization_id,
              quote_id: quote.id,
              parent_line_item_id: parentTempId,
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

      // 5. Insert line items — parents first, then children with real IDs
      const parentItems = lineItems.filter(li => li.parent_line_item_id === null);
      const childItems = lineItems.filter(li => li.parent_line_item_id !== null);
      const tempIdToRealId = new Map<string, string>();

      // Insert parents
      for (const parent of parentItems) {
        const tempId = (parent.metadata as any)?._tempId;
        const { _tempId, ...cleanMeta } = (parent.metadata as any) || {};
        const { data: inserted, error } = await (supabase as any)
          .from('quote_line_items')
          .insert({ ...parent, metadata: cleanMeta })
          .select()
          .single();

        if (error) throw error;
        if (tempId) tempIdToRealId.set(tempId, inserted.id);
      }

      // Insert children with resolved parent IDs
      if (childItems.length > 0) {
        const resolvedChildren = childItems.map(child => ({
          ...child,
          parent_line_item_id: tempIdToRealId.get(child.parent_line_item_id!) || child.parent_line_item_id,
        }));

        const { error: childError } = await (supabase as any)
          .from('quote_line_items')
          .insert(resolvedChildren);

        if (childError) throw childError;
      }

      // 6. Calculate and update quote totals
      const activeChildren = childItems.filter(c => !c.is_optional);
      const subtotal = activeChildren.reduce((sum, c) => sum + c.line_total, 0);
      const totalCost = activeChildren.reduce((sum, c) => sum + (c.quantity * c.cost_price), 0);
      const totalMargin = subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0;
      const taxAmount = subtotal * 0.1; // 10% GST
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
        .eq('id', quote.id);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['quotes'] });

      toast.success(`Quote ${quoteNumber} generated from ${roomsWithMaterials.length} rooms`);
      return quote.id as string;
    } catch (error: any) {
      toast.error(`Failed to generate quote: ${error.message}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAndNavigate = async (input: GenerateQuoteInput) => {
    const quoteId = await generateQuote(input);
    if (quoteId) {
      navigate(`/quotes/${quoteId}`);
    }
  };

  return {
    generateQuote,
    generateAndNavigate,
    isGenerating,
  };
}

/**
 * Check if a quote already exists for a given project
 */
export function useProjectQuote(projectId: string | undefined) {
  const { data: profile } = useUserProfile();

  // We use a simple query check - not a full hook to avoid circular deps
  const checkExistingQuote = async (): Promise<string | null> => {
    if (!projectId || !profile?.organization_id) return null;

    const { data, error } = await (supabase as any)
      .from('quotes')
      .select('id')
      .eq('project_id', projectId)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data.id as string;
  };

  return { checkExistingQuote };
}
