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
  _highlightFields?: Set<string>;
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

// ─── Pricing Calculations (FieldFlow markup formula) ─────────────────

export function calculateSellFromMargin(costPrice: number, marginPercentage: number): number {
  if (marginPercentage <= 0) return costPrice;
  return costPrice * (1 + marginPercentage / 100);
}

export function calculateMarginFromSell(costPrice: number, sellPrice: number): number {
  if (costPrice <= 0) return 0;
  return ((sellPrice - costPrice) / costPrice) * 100;
}

export function calculatePricing(
  field: 'cost' | 'sell' | 'margin',
  value: number,
  current: { cost_price: number; sell_price: number; margin_percentage: number }
): { cost_price: number; sell_price: number; margin_percentage: number; _changedField?: string } {
  switch (field) {
    case 'cost': {
      const newSell = calculateSellFromMargin(value, current.margin_percentage);
      return {
        cost_price: value,
        sell_price: Math.round(newSell * 100) / 100,
        margin_percentage: current.margin_percentage,
        _changedField: 'sell_price',
      };
    }
    case 'sell': {
      // Enforce sell >= cost
      const clampedSell = Math.max(value, current.cost_price);
      const newMargin = calculateMarginFromSell(current.cost_price, clampedSell);
      return {
        cost_price: current.cost_price,
        sell_price: clampedSell,
        margin_percentage: Math.round(newMargin * 100) / 100,
        _changedField: 'margin_percentage',
      };
    }
    case 'margin': {
      const newSell = calculateSellFromMargin(current.cost_price, value);
      return {
        cost_price: current.cost_price,
        sell_price: Math.round(newSell * 100) / 100,
        margin_percentage: value,
        _changedField: 'sell_price',
      };
    }
  }
}

// ─── Aggregation ─────────────────────────────────────────────────────

export function calculateAggregatedValues(parent: LineItem): {
  cost_price: number;
  sell_price: number;
  margin_percentage: number;
  line_total: number;
  estimated_hours: number;
} {
  if (parent.subItems.length === 0) {
    return {
      cost_price: parent.cost_price,
      sell_price: parent.sell_price,
      margin_percentage: parent.margin_percentage,
      line_total: parent.line_total,
      estimated_hours: parent.estimated_hours,
    };
  }

  let totalCost = 0;
  let totalSell = 0;
  let totalHours = 0;

  for (const child of parent.subItems) {
    totalCost += (child.quantity || 0) * (child.cost_price || 0);
    totalSell += (child.quantity || 0) * (child.sell_price || 0);
    totalHours += child.estimated_hours || 0;
  }

  const margin = totalCost > 0 ? ((totalSell - totalCost) / totalCost) * 100 : 0;

  return {
    cost_price: Math.round(totalCost * 100) / 100,
    sell_price: Math.round(totalSell * 100) / 100,
    margin_percentage: Math.round(margin * 100) / 100,
    line_total: Math.round(totalSell * 100) / 100,
    estimated_hours: totalHours,
  };
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

  for (const parent of parentItems) {
    parent.subItems = (childMap.get(parent.id) || [])
      .sort((a, b) => a.item_order - b.item_order);
    parent._isExpanded = true;
  }

  return parentItems.sort((a, b) => a.item_order - b.item_order);
}

function flattenHierarchy(items: LineItem[]): Omit<LineItem, 'subItems' | '_isNew' | '_isExpanded' | '_highlightFields'>[] {
  const flat: Omit<LineItem, 'subItems' | '_isNew' | '_isExpanded' | '_highlightFields'>[] = [];
  for (const parent of items) {
    const { subItems, _isNew, _isExpanded, _highlightFields, ...parentData } = parent;
    // For parents with children, store aggregated values
    if (subItems.length > 0) {
      const agg = calculateAggregatedValues(parent);
      flat.push({ ...parentData, ...agg, quantity: 1 });
    } else {
      flat.push(parentData);
    }
    for (const child of subItems) {
      const { subItems: _, _isNew: __, _isExpanded: ___, _highlightFields: ____, ...childData } = child;
      flat.push(childData);
    }
  }
  return flat;
}

function snapshotKey(items: LineItem[]): string {
  return JSON.stringify(flattenHierarchy(items));
}

// Helper to recalculate parent aggregated values after child changes
function recalcParentFromChildren(parent: LineItem): LineItem {
  if (parent.subItems.length === 0) return parent;
  const agg = calculateAggregatedValues(parent);
  return {
    ...parent,
    cost_price: agg.cost_price,
    sell_price: agg.sell_price,
    margin_percentage: agg.margin_percentage,
    line_total: agg.line_total,
    estimated_hours: agg.estimated_hours,
    quantity: 1,
  };
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
        if ('quantity' in updates || 'sell_price' in updates) {
          updated.line_total = (updated.quantity || 0) * (updated.sell_price || 0);
        }
        return updated;
      }
      // Check children
      const updatedSubItems = parent.subItems.map(child => {
        if (child.id === itemId) {
          const updated = { ...child, ...updates };
          if ('quantity' in updates || 'sell_price' in updates) {
            updated.line_total = (updated.quantity || 0) * (updated.sell_price || 0);
          }
          return updated;
        }
        return child;
      });

      const childChanged = updatedSubItems !== parent.subItems;
      if (childChanged) {
        const newParent = { ...parent, subItems: updatedSubItems };
        return recalcParentFromChildren(newParent);
      }
      return parent;
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
        const { _changedField, ...pricingData } = pricing;
        return {
          ...parent,
          ...pricingData,
          line_total: parent.quantity * pricingData.sell_price,
          _highlightFields: _changedField ? new Set([_changedField]) : undefined,
        };
      }
      const updatedSubItems = parent.subItems.map(child => {
        if (child.id === itemId) {
          const pricing = calculatePricing(field, value, child);
          const { _changedField, ...pricingData } = pricing;
          return {
            ...child,
            ...pricingData,
            line_total: child.quantity * pricingData.sell_price,
            _highlightFields: _changedField ? new Set([_changedField]) : undefined,
          };
        }
        return child;
      });

      const childChanged = updatedSubItems.some((c, i) => c !== parent.subItems[i]);
      if (childChanged) {
        const newParent = { ...parent, subItems: updatedSubItems };
        return recalcParentFromChildren(newParent);
      }
      return parent;
    }));

    // Clear highlights after animation
    setTimeout(() => {
      setEditedLineItems(prev => prev.map(parent => ({
        ...parent,
        _highlightFields: undefined,
        subItems: parent.subItems.map(child => ({ ...child, _highlightFields: undefined })),
      })));
    }, 600);
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
      if (parent.id !== parentId) return parent;

      const newChildren: LineItem[] = [];

      // If this is the first sub-item and parent has pricing data, migrate it
      if (parent.subItems.length === 0 && (parent.cost_price > 0 || parent.sell_price > 0)) {
        const migratedChild: LineItem = {
          id: generateTempId(),
          quote_id: quoteId,
          parent_line_item_id: parentId,
          description: parent.description || 'Item',
          quantity: parent.quantity || 1,
          cost_price: parent.cost_price,
          sell_price: parent.sell_price,
          margin_percentage: parent.margin_percentage,
          unit_price: parent.unit_price,
          line_total: parent.line_total,
          estimated_hours: parent.estimated_hours,
          item_order: 0,
          is_optional: false,
          is_active: true,
          price_book_item_id: parent.price_book_item_id,
          is_from_price_book: parent.is_from_price_book,
          source_room_id: parent.source_room_id,
          metadata: {},
          subItems: [],
          _isNew: true,
          _isExpanded: false,
        };
        newChildren.push(migratedChild);
      }

      const maxOrder = [...parent.subItems, ...newChildren].reduce(
        (max, item) => Math.max(max, item.item_order), -1
      );
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

      const allChildren = [...parent.subItems, ...newChildren, newChild];
      const newParent: LineItem = {
        ...parent,
        _isExpanded: true,
        subItems: allChildren,
        // Clear parent pricing since children now hold it
        cost_price: 0,
        sell_price: 0,
        margin_percentage: 0,
        unit_price: 0,
        quantity: 1,
      };

      return recalcParentFromChildren(newParent);
    }));
  }, [quoteId]);

  const removeLineItem = useCallback((itemId: string) => {
    setEditedLineItems(prev => {
      const isParent = prev.some(p => p.id === itemId);
      if (isParent) {
        return prev.filter(p => p.id !== itemId);
      }
      return prev.map(parent => {
        const newSubs = parent.subItems.filter(c => c.id !== itemId);
        if (newSubs.length !== parent.subItems.length) {
          const newParent = { ...parent, subItems: newSubs };
          return recalcParentFromChildren(newParent);
        }
        return parent;
      });
    });
  }, []);

  // Ungroup: convert all children to standalone parents, remove the parent shell
  const ungroupParent = useCallback((parentId: string) => {
    setEditedLineItems(prev => {
      const parentIndex = prev.findIndex(p => p.id === parentId);
      if (parentIndex < 0) return prev;
      const parent = prev[parentIndex];
      if (parent.subItems.length === 0) return prev;

      const promotedChildren = parent.subItems.map((child, i) => ({
        ...child,
        parent_line_item_id: null,
        item_order: parent.item_order + i + 1,
        subItems: [],
        _isNew: child.id.startsWith('temp-') ? true : child._isNew,
      }));

      const before = prev.slice(0, parentIndex);
      const after = prev.slice(parentIndex + 1).map(item => ({
        ...item,
        item_order: item.item_order + parent.subItems.length,
      }));

      return [...before, ...promotedChildren, ...after].map((item, i) => ({
        ...item,
        item_order: i,
      }));
    });
  }, []);

  // Promote: move a single sub-item to become its own standalone parent
  const promoteSubItem = useCallback((childId: string) => {
    setEditedLineItems(prev => {
      let promotedItem: LineItem | null = null;
      let parentIndex = -1;

      const newItems = prev.map((parent, idx) => {
        const childIndex = parent.subItems.findIndex(c => c.id === childId);
        if (childIndex < 0) return parent;

        parentIndex = idx;
        promotedItem = {
          ...parent.subItems[childIndex],
          parent_line_item_id: null,
          subItems: [],
        };

        const newSubs = parent.subItems.filter(c => c.id !== childId);
        const newParent = { ...parent, subItems: newSubs };
        return recalcParentFromChildren(newParent);
      });

      if (!promotedItem || parentIndex < 0) return prev;

      // Insert after the parent
      const before = newItems.slice(0, parentIndex + 1);
      const after = newItems.slice(parentIndex + 1);
      return [...before, promotedItem, ...after].map((item, i) => ({
        ...item,
        item_order: i,
      }));
    });
  }, []);

  // Group: move a standalone item into an existing parent as a sub-item
  const groupIntoParent = useCallback((itemId: string, targetParentId: string) => {
    setEditedLineItems(prev => {
      const itemIndex = prev.findIndex(p => p.id === itemId);
      if (itemIndex < 0) return prev; // item not found or already a child
      const item = prev[itemIndex];
      if (item.subItems.length > 0) return prev; // can't nest groups

      const child: LineItem = {
        ...item,
        parent_line_item_id: targetParentId,
        subItems: [],
      };

      // Remove from top-level
      const without = prev.filter(p => p.id !== itemId);

      return without.map(parent => {
        if (parent.id !== targetParentId) return parent;

        // If target parent has no children yet and has pricing, migrate parent data first
        const newChildren: LineItem[] = [];
        if (parent.subItems.length === 0 && (parent.cost_price > 0 || parent.sell_price > 0)) {
          newChildren.push({
            id: generateTempId(),
            quote_id: parent.quote_id,
            parent_line_item_id: targetParentId,
            description: parent.description || 'Item',
            quantity: parent.quantity || 1,
            cost_price: parent.cost_price,
            sell_price: parent.sell_price,
            margin_percentage: parent.margin_percentage,
            unit_price: parent.unit_price,
            line_total: parent.line_total,
            estimated_hours: parent.estimated_hours,
            item_order: 0,
            is_optional: false,
            is_active: true,
            price_book_item_id: parent.price_book_item_id,
            is_from_price_book: parent.is_from_price_book,
            source_room_id: parent.source_room_id,
            metadata: {},
            subItems: [],
            _isNew: true,
            _isExpanded: false,
          });
        }

        const allChildren = [...parent.subItems, ...newChildren, {
          ...child,
          item_order: parent.subItems.length + newChildren.length,
        }];
        const newParent: LineItem = {
          ...parent,
          _isExpanded: true,
          subItems: allChildren,
        };
        return recalcParentFromChildren(newParent);
      }).map((item, i) => ({ ...item, item_order: i }));
    });
  }, []);

  // Create new group: wrap a standalone item in a new parent group
  const createGroupFromItem = useCallback((itemId: string, groupName = 'New Group') => {
    if (!quoteId) return;
    setEditedLineItems(prev => {
      const itemIndex = prev.findIndex(p => p.id === itemId);
      if (itemIndex < 0) return prev;
      const item = prev[itemIndex];
      if (item.subItems.length > 0) return prev; // already a group

      const newParentId = generateTempId();
      const child: LineItem = {
        ...item,
        parent_line_item_id: newParentId,
        item_order: 0,
        subItems: [],
      };

      const newParent: LineItem = {
        id: newParentId,
        quote_id: quoteId,
        parent_line_item_id: null,
        description: groupName,
        quantity: 1,
        cost_price: 0,
        sell_price: 0,
        margin_percentage: 0,
        unit_price: 0,
        line_total: 0,
        estimated_hours: 0,
        item_order: item.item_order,
        is_optional: item.is_optional,
        is_active: true,
        price_book_item_id: null,
        is_from_price_book: false,
        source_room_id: null,
        metadata: {},
        subItems: [child],
        _isNew: true,
        _isExpanded: true,
      };

      const before = prev.slice(0, itemIndex);
      const after = prev.slice(itemIndex + 1);
      return [...before, recalcParentFromChildren(newParent), ...after].map((p, i) => ({
        ...p,
        item_order: i,
      }));
    });
  }, [quoteId]);

  const duplicateLineItem = useCallback((itemId: string) => {
    setEditedLineItems(prev => {
      const newItems = [...prev];
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

  // Reorder parents (up/down)
  const reorderParent = useCallback((parentId: string, direction: 'up' | 'down') => {
    setEditedLineItems(prev => {
      const index = prev.findIndex(p => p.id === parentId);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const items = [...prev];
      const [moved] = items.splice(index, 1);
      items.splice(targetIndex, 0, moved);
      return items.map((item, i) => ({ ...item, item_order: i }));
    });
  }, []);

  // Reorder sub-items (up/down within parent)
  const reorderSubItem = useCallback((parentId: string, childId: string, direction: 'up' | 'down') => {
    setEditedLineItems(prev => prev.map(parent => {
      if (parent.id !== parentId) return parent;

      const childIndex = parent.subItems.findIndex(c => c.id === childId);
      if (childIndex < 0) return parent;
      const targetIndex = direction === 'up' ? childIndex - 1 : childIndex + 1;
      if (targetIndex < 0 || targetIndex >= parent.subItems.length) return parent;

      const subs = [...parent.subItems];
      const [moved] = subs.splice(childIndex, 1);
      subs.splice(targetIndex, 0, moved);
      return {
        ...parent,
        subItems: subs.map((item, i) => ({ ...item, item_order: i })),
      };
    }));
  }, []);

  // ─── Save to DB (batch diff) ───────────────────────────────────────

  const saveLineItems = useCallback(async () => {
    if (!quoteId || !profile?.organization_id) return;

    setIsSaving(true);
    try {
      const currentFlat = flattenHierarchy(editedLineItems);
      const dbFlat = dbItems || [];
      const dbIds = new Set(dbFlat.map(d => d.id));

      const toInsert = currentFlat.filter(item => item.id.startsWith('temp-'));
      const toUpdate = currentFlat.filter(item => !item.id.startsWith('temp-') && dbIds.has(item.id));
      const currentIds = new Set(currentFlat.map(c => c.id));
      const toDelete = dbFlat.filter(d => !currentIds.has(d.id)).map(d => d.id);

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
    reorderParent,
    reorderSubItem,
    ungroupParent,
    promoteSubItem,
    groupIntoParent,
    createGroupFromItem,
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

  // Build hierarchy to correctly compute totals from children
  const allItems = (items || []) as DbLineItem[];
  const parents = allItems.filter(i => !i.parent_line_item_id);
  const children = allItems.filter(i => i.parent_line_item_id);

  let subtotal = 0;
  let totalCost = 0;
  let estimatedHours = 0;

  for (const parent of parents) {
    if (parent.is_optional) continue;

    const parentChildren = children.filter(c => c.parent_line_item_id === parent.id);

    if (parentChildren.length > 0) {
      for (const child of parentChildren) {
        if (child.is_optional) continue;
        subtotal += (Number(child.quantity) || 0) * (Number(child.sell_price) || 0);
        totalCost += (Number(child.quantity) || 0) * (Number(child.cost_price) || 0);
        estimatedHours += Number(child.estimated_hours) || 0;
      }
    } else {
      subtotal += (Number(parent.quantity) || 0) * (Number(parent.sell_price) || 0);
      totalCost += (Number(parent.quantity) || 0) * (Number(parent.cost_price) || 0);
      estimatedHours += Number(parent.estimated_hours) || 0;
    }
  }

  const totalMargin = totalCost > 0 ? ((subtotal - totalCost) / totalCost) * 100 : 0;

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
