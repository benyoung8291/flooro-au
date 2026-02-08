import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────

export interface LineItem {
  id: string;
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
  price_book_item_id: string | null;
  is_from_price_book: boolean;
  source_room_id: string | null;
  metadata: Record<string, unknown>;
  subItems: LineItem[];
  // UI-only flags
  _isNew?: boolean;
  _isExpanded?: boolean;
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
  price_book_item_id: string | null;
  is_from_price_book: boolean;
  source_room_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Pricing Calculations (matching FieldFlow's calculatePricing) ────

export function calculateSellFromMargin(costPrice: number, marginPercentage: number): number {
  if (marginPercentage >= 100) return costPrice * 10; // cap
  if (marginPercentage <= 0) return costPrice;
  return costPrice / (1 - marginPercentage / 100);
}

export function calculateMarginFromSell(costPrice: number, sellPrice: number): number {
  if (sellPrice <= 0) return 0;
  return ((sellPrice - costPrice) / sellPrice) * 100;
}

export function calculatePricing(
  field: 'cost' | 'sell' | 'margin',
  value: number,
  current: { cost_price: number; sell_price: number; margin_percentage: number }
): { cost_price: number; sell_price: number; margin_percentage: number } {
  switch (field) {
    case 'cost': {
      const newSell = calculateSellFromMargin(value, current.margin_percentage);
      return {
        cost_price: value,
        sell_price: Math.round(newSell * 100) / 100,
        margin_percentage: current.margin_percentage,
      };
    }
    case 'sell': {
      const newMargin = calculateMarginFromSell(current.cost_price, value);
      return {
        cost_price: current.cost_price,
        sell_price: value,
        margin_percentage: Math.round(newMargin * 100) / 100,
      };
    }
    case 'margin': {
      const newSell = calculateSellFromMargin(current.cost_price, value);
      return {
        cost_price: current.cost_price,
        sell_price: Math.round(newSell * 100) / 100,
        margin_percentage: value,
      };
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function generateTempId(): string {
  return `temp-${crypto.randomUUID()}`;
}

function dbToLineItem(db: DbLineItem, isNew = false): LineItem {
  return {
    id: db.id,
    quote_id: db.quote_id,
    parent_line_item_id: db.parent_line_item_id,
    description: db.description || '',
    quantity: Number(db.quantity) || 0,
    cost_price: Number(db.cost_price) || 0,
    sell_price: Number(db.sell_price) || 0,
    margin_percentage: Number(db.margin_percentage) || 0,
    unit_price: Number(db.unit_price) || 0,
    line_total: Number(db.line_total) || 0,
    estimated_hours: Number(db.estimated_hours) || 0,
    item_order: Number(db.item_order) || 0,
    is_optional: db.is_optional ?? false,
    is_active: db.is_active ?? true,
    price_book_item_id: db.price_book_item_id,
    is_from_price_book: db.is_from_price_book ?? false,
    source_room_id: db.source_room_id,
    metadata: (db.metadata as Record<string, unknown>) || {},
    subItems: [],
    _isNew: isNew,
    _isExpanded: true,
  };
}

function buildHierarchy(flatItems: DbLineItem[]): LineItem[] {
  const parentItems: LineItem[] = [];
  const childMap = new Map<string, LineItem[]>();

  // Separate parents and children
  for (const item of flatItems) {
    const lineItem = dbToLineItem(item);
    if (item.parent_line_item_id) {
      const existing = childMap.get(item.parent_line_item_id) || [];
      existing.push(lineItem);
      childMap.set(item.parent_line_item_id, existing);
    } else {
      parentItems.push(lineItem);
    }
  }

  // Attach children to parents
  for (const parent of parentItems) {
    parent.subItems = (childMap.get(parent.id) || [])
      .sort((a, b) => a.item_order - b.item_order);
    parent._isExpanded = true;
  }

  return parentItems.sort((a, b) => a.item_order - b.item_order);
}

function flattenHierarchy(items: LineItem[]): Omit<LineItem, 'subItems' | '_isNew' | '_isExpanded'>[] {
  const flat: Omit<LineItem, 'subItems' | '_isNew' | '_isExpanded'>[] = [];
  for (const parent of items) {
    const { subItems, _isNew, _isExpanded, ...parentData } = parent;
    flat.push(parentData);
    for (const child of subItems) {
      const { subItems: _, _isNew: __, _isExpanded: ___, ...childData } = child;
      flat.push(childData);
    }
  }
  return flat;
}

function snapshotKey(items: LineItem[]): string {
  return JSON.stringify(flattenHierarchy(items));
}

// ─── Main Hook ───────────────────────────────────────────────────────

export function useQuoteLineItems(quoteId: string | undefined) {
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [editedLineItems, setEditedLineItems] = useState<LineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const dbSnapshotRef = useRef<string>('');
  const autoBackupTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch from DB
  const { data: dbItems, isLoading, refetch } = useQuery({
    queryKey: ['quote_line_items', quoteId],
    queryFn: async (): Promise<DbLineItem[]> => {
      if (!quoteId) return [];

      const { data, error } = await (supabase as any)
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('is_active', true)
        .order('item_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!quoteId,
  });

  // Build hierarchy when DB data changes
  useEffect(() => {
    if (dbItems) {
      const hierarchy = buildHierarchy(dbItems);
      setEditedLineItems(hierarchy);
      dbSnapshotRef.current = snapshotKey(hierarchy);
    }
  }, [dbItems]);

  // Auto-backup to localStorage every 30s
  useEffect(() => {
    if (!quoteId) return;

    autoBackupTimerRef.current = setInterval(() => {
      if (editedLineItems.length > 0) {
        try {
          localStorage.setItem(
            `quote-backup-${quoteId}`,
            JSON.stringify(flattenHierarchy(editedLineItems))
          );
        } catch {
          // Silently fail if localStorage is full
        }
      }
    }, 30000);

    return () => {
      if (autoBackupTimerRef.current) {
        clearInterval(autoBackupTimerRef.current);
      }
    };
  }, [quoteId, editedLineItems]);

  // Detect unsaved changes
  const hasUnsavedChanges = snapshotKey(editedLineItems) !== dbSnapshotRef.current;

  // ─── Mutation helpers ──────────────────────────────────────────────

  const updateLineItem = useCallback((itemId: string, updates: Partial<LineItem>) => {
    setEditedLineItems(prev => prev.map(parent => {
      if (parent.id === itemId) {
        const updated = { ...parent, ...updates };
        // Recalc line_total if qty or sell changed
        if ('quantity' in updates || 'sell_price' in updates) {
          updated.line_total = (updated.quantity || 0) * (updated.sell_price || 0);
        }
        return updated;
      }
      return {
        ...parent,
        subItems: parent.subItems.map(child => {
          if (child.id === itemId) {
            const updated = { ...child, ...updates };
            if ('quantity' in updates || 'sell_price' in updates) {
              updated.line_total = (updated.quantity || 0) * (updated.sell_price || 0);
            }
            return updated;
          }
          return child;
        }),
      };
    }));
  }, []);

  const updateLineItemPricing = useCallback((
    itemId: string,
    field: 'cost' | 'sell' | 'margin',
    value: number
  ) => {
    setEditedLineItems(prev => prev.map(parent => {
      if (parent.id === itemId) {
        const pricing = calculatePricing(field, value, parent);
        return {
          ...parent,
          ...pricing,
          line_total: parent.quantity * pricing.sell_price,
        };
      }
      return {
        ...parent,
        subItems: parent.subItems.map(child => {
          if (child.id === itemId) {
            const pricing = calculatePricing(field, value, child);
            return {
              ...child,
              ...pricing,
              line_total: child.quantity * pricing.sell_price,
            };
          }
          return child;
        }),
      };
    }));
  }, []);

  const addLineItem = useCallback((description = 'New Item') => {
    if (!quoteId) return;
    const maxOrder = editedLineItems.reduce((max, item) => Math.max(max, item.item_order), -1);
    const newItem: LineItem = {
      id: generateTempId(),
      quote_id: quoteId,
      parent_line_item_id: null,
      description,
      quantity: 1,
      cost_price: 0,
      sell_price: 0,
      margin_percentage: 0,
      unit_price: 0,
      line_total: 0,
      estimated_hours: 0,
      item_order: maxOrder + 1,
      is_optional: false,
      is_active: true,
      price_book_item_id: null,
      is_from_price_book: false,
      source_room_id: null,
      metadata: {},
      subItems: [],
      _isNew: true,
      _isExpanded: true,
    };
    setEditedLineItems(prev => [...prev, newItem]);
    return newItem.id;
  }, [quoteId, editedLineItems]);

  const addSubItem = useCallback((parentId: string, description = 'New Sub-item') => {
    if (!quoteId) return;
    setEditedLineItems(prev => prev.map(parent => {
      if (parent.id === parentId) {
        const maxOrder = parent.subItems.reduce((max, item) => Math.max(max, item.item_order), -1);
        const newChild: LineItem = {
          id: generateTempId(),
          quote_id: quoteId,
          parent_line_item_id: parentId,
          description,
          quantity: 1,
          cost_price: 0,
          sell_price: 0,
          margin_percentage: 0,
          unit_price: 0,
          line_total: 0,
          estimated_hours: 0,
          item_order: maxOrder + 1,
          is_optional: false,
          is_active: true,
          price_book_item_id: null,
          is_from_price_book: false,
          source_room_id: null,
          metadata: {},
          subItems: [],
          _isNew: true,
          _isExpanded: false,
        };
        return {
          ...parent,
          _isExpanded: true,
          subItems: [...parent.subItems, newChild],
        };
      }
      return parent;
    }));
  }, [quoteId]);

  const removeLineItem = useCallback((itemId: string) => {
    setEditedLineItems(prev => {
      // Check if it's a parent
      const isParent = prev.some(p => p.id === itemId);
      if (isParent) {
        return prev.filter(p => p.id !== itemId);
      }
      // It's a child
      return prev.map(parent => ({
        ...parent,
        subItems: parent.subItems.filter(c => c.id !== itemId),
      }));
    });
  }, []);

  const duplicateLineItem = useCallback((itemId: string) => {
    setEditedLineItems(prev => {
      const newItems = [...prev];
      // Find parent to duplicate
      const parentIndex = newItems.findIndex(p => p.id === itemId);
      if (parentIndex >= 0) {
        const source = newItems[parentIndex];
        const newParentId = generateTempId();
        const duplicate: LineItem = {
          ...source,
          id: newParentId,
          description: `${source.description} (Copy)`,
          item_order: source.item_order + 1,
          _isNew: true,
          subItems: source.subItems.map(child => ({
            ...child,
            id: generateTempId(),
            parent_line_item_id: newParentId,
            _isNew: true,
          })),
        };
        // Re-order items after the duplicate
        const after = newItems.slice(parentIndex + 1).map(item => ({
          ...item,
          item_order: item.item_order + 1,
        }));
        return [
          ...newItems.slice(0, parentIndex + 1),
          duplicate,
          ...after,
        ];
      }
      return prev;
    });
  }, []);

  const toggleExpanded = useCallback((parentId: string) => {
    setEditedLineItems(prev => prev.map(parent => {
      if (parent.id === parentId) {
        return { ...parent, _isExpanded: !parent._isExpanded };
      }
      return parent;
    }));
  }, []);

  const reorderParents = useCallback((fromIndex: number, toIndex: number) => {
    setEditedLineItems(prev => {
      const items = [...prev];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return items.map((item, i) => ({ ...item, item_order: i }));
    });
  }, []);

  // ─── Save to DB (batch diff) ───────────────────────────────────────

  const saveLineItems = useCallback(async () => {
    if (!quoteId || !profile?.organization_id) return;

    setIsSaving(true);
    try {
      const currentFlat = flattenHierarchy(editedLineItems);
      const dbFlat = dbItems || [];
      const dbIds = new Set(dbFlat.map(d => d.id));

      // Items to insert (temp IDs)
      const toInsert = currentFlat.filter(item => item.id.startsWith('temp-'));
      // Items to update (existing IDs still present)
      const toUpdate = currentFlat.filter(item => !item.id.startsWith('temp-') && dbIds.has(item.id));
      // Items to delete (in DB but not in current)
      const currentIds = new Set(currentFlat.map(c => c.id));
      const toDelete = dbFlat.filter(d => !currentIds.has(d.id)).map(d => d.id);

      // We need to handle parent items first for new inserts to get real IDs
      const tempIdMap = new Map<string, string>();

      // Insert parents first
      const parentInserts = toInsert.filter(item => !item.parent_line_item_id || !item.parent_line_item_id.startsWith('temp-'));
      const childInserts = toInsert.filter(item => item.parent_line_item_id && item.parent_line_item_id.startsWith('temp-'));

      for (const item of parentInserts) {
        const { data, error } = await (supabase as any)
          .from('quote_line_items')
          .insert({
            organization_id: profile.organization_id,
            quote_id: quoteId,
            parent_line_item_id: item.parent_line_item_id,
            description: item.description,
            quantity: item.quantity,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            margin_percentage: item.margin_percentage,
            unit_price: item.unit_price,
            line_total: item.line_total,
            estimated_hours: item.estimated_hours,
            item_order: item.item_order,
            is_optional: item.is_optional,
            is_active: item.is_active,
            price_book_item_id: item.price_book_item_id,
            is_from_price_book: item.is_from_price_book,
            source_room_id: item.source_room_id,
            metadata: item.metadata,
          })
          .select()
          .single();

        if (error) throw error;
        tempIdMap.set(item.id, data.id);
      }

      // Insert children with mapped parent IDs
      for (const item of childInserts) {
        const realParentId = tempIdMap.get(item.parent_line_item_id!) || item.parent_line_item_id;
        const { data, error } = await (supabase as any)
          .from('quote_line_items')
          .insert({
            organization_id: profile.organization_id,
            quote_id: quoteId,
            parent_line_item_id: realParentId,
            description: item.description,
            quantity: item.quantity,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            margin_percentage: item.margin_percentage,
            unit_price: item.unit_price,
            line_total: item.line_total,
            estimated_hours: item.estimated_hours,
            item_order: item.item_order,
            is_optional: item.is_optional,
            is_active: item.is_active,
            price_book_item_id: item.price_book_item_id,
            is_from_price_book: item.is_from_price_book,
            source_room_id: item.source_room_id,
            metadata: item.metadata,
          })
          .select()
          .single();

        if (error) throw error;
        tempIdMap.set(item.id, data.id);
      }

      // Batch update existing items
      for (const item of toUpdate) {
        const { error } = await (supabase as any)
          .from('quote_line_items')
          .update({
            parent_line_item_id: item.parent_line_item_id,
            description: item.description,
            quantity: item.quantity,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            margin_percentage: item.margin_percentage,
            unit_price: item.unit_price,
            line_total: item.line_total,
            estimated_hours: item.estimated_hours,
            item_order: item.item_order,
            is_optional: item.is_optional,
            is_active: item.is_active,
            price_book_item_id: item.price_book_item_id,
            is_from_price_book: item.is_from_price_book,
            source_room_id: item.source_room_id,
            metadata: item.metadata,
          })
          .eq('id', item.id);

        if (error) throw error;
      }

      // Delete removed items
      if (toDelete.length > 0) {
        const { error } = await (supabase as any)
          .from('quote_line_items')
          .delete()
          .in('id', toDelete);

        if (error) throw error;
      }

      // Update quote totals
      await updateQuoteTotals(quoteId);

      // Refresh from DB
      await refetch();

      // Clear localStorage backup
      localStorage.removeItem(`quote-backup-${quoteId}`);

      toast.success('Quote saved');
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [quoteId, profile?.organization_id, editedLineItems, dbItems, refetch]);

  return {
    lineItems: editedLineItems,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    updateLineItem,
    updateLineItemPricing,
    addLineItem,
    addSubItem,
    removeLineItem,
    duplicateLineItem,
    toggleExpanded,
    reorderParents,
    saveLineItems,
    setEditedLineItems,
  };
}

// ─── Update Quote Totals ─────────────────────────────────────────────

async function updateQuoteTotals(quoteId: string) {
  const { data: items, error: fetchErr } = await (supabase as any)
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('is_active', true);

  if (fetchErr) throw fetchErr;

  // Only count non-optional items in totals
  const activeItems = (items || []).filter((item: any) => !item.is_optional);

  const subtotal = activeItems.reduce((sum: number, item: any) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.sell_price) || 0);
  }, 0);

  const totalCost = activeItems.reduce((sum: number, item: any) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.cost_price) || 0);
  }, 0);

  const totalMargin = subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0;

  const estimatedHours = (items || []).reduce((sum: number, item: any) => {
    return sum + (Number(item.estimated_hours) || 0);
  }, 0);

  // Get current quote for tax rate
  const { data: quote } = await (supabase as any)
    .from('quotes')
    .select('tax_rate')
    .eq('id', quoteId)
    .single();

  const taxRate = Number(quote?.tax_rate) || 10;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const { error: updateErr } = await (supabase as any)
    .from('quotes')
    .update({
      subtotal: Math.round(subtotal * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      total_margin: Math.round(totalMargin * 100) / 100,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      estimated_hours: Math.round(estimatedHours * 100) / 100,
    })
    .eq('id', quoteId);

  if (updateErr) throw updateErr;
}
