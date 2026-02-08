import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PriceBookCategory = 'installation_labor' | 'sundry' | 'accessory' | 'other';
export type PricingType = 'per_m2' | 'per_linear_m' | 'per_unit' | 'fixed' | 'per_hour';

export interface PriceBookItem {
  id: string;
  organization_id: string | null;
  is_global: boolean;
  name: string;
  category: PriceBookCategory;
  pricing_type: PricingType;
  cost_rate: number;
  sell_rate: number;
  description: string | null;
  specs: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceBookItemInput {
  name: string;
  category: PriceBookCategory;
  pricing_type: PricingType;
  cost_rate: number;
  sell_rate: number;
  description?: string;
  specs?: Record<string, unknown>;
}

export interface UpdatePriceBookItemInput {
  id: string;
  name?: string;
  category?: PriceBookCategory;
  pricing_type?: PricingType;
  cost_rate?: number;
  sell_rate?: number;
  description?: string | null;
  specs?: Record<string, unknown>;
}

export const CATEGORY_LABELS: Record<PriceBookCategory, string> = {
  installation_labor: 'Installation Labor',
  sundry: 'Sundry',
  accessory: 'Accessory',
  other: 'Other',
};

export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  per_m2: '$/m²',
  per_linear_m: '$/lin.m',
  per_unit: '$/unit',
  fixed: 'Fixed $',
  per_hour: '$/hr',
};

function parsePriceBookItem(data: Record<string, unknown>): PriceBookItem {
  return {
    id: data.id as string,
    organization_id: data.organization_id as string | null,
    is_global: data.is_global as boolean,
    name: data.name as string,
    category: data.category as PriceBookCategory,
    pricing_type: data.pricing_type as PricingType,
    cost_rate: Number(data.cost_rate) || 0,
    sell_rate: Number(data.sell_rate) || 0,
    description: data.description as string | null,
    specs: (data.specs as Record<string, unknown>) || {},
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export function usePriceBook() {
  return useQuery({
    queryKey: ['price_book_items'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('price_book_items')
        .select('*')
        .order('is_global', { ascending: false })
        .order('category')
        .order('name');
      
      if (error) throw error;
      return (data || []).map(parsePriceBookItem);
    },
  });
}

export function usePriceBookByCategory(category?: PriceBookCategory) {
  return useQuery({
    queryKey: ['price_book_items', 'category', category],
    queryFn: async () => {
      let query = (supabase as any)
        .from('price_book_items')
        .select('*')
        .order('is_global', { ascending: false })
        .order('name');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parsePriceBookItem);
    },
  });
}

export function useCreatePriceBookItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreatePriceBookItemInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.organization_id) throw new Error('No organization found');
      
      const { data, error } = await (supabase as any)
        .from('price_book_items')
        .insert({
          name: input.name,
          category: input.category,
          pricing_type: input.pricing_type,
          cost_rate: input.cost_rate,
          sell_rate: input.sell_rate,
          description: input.description || null,
          specs: input.specs || {},
          organization_id: profile.organization_id,
          is_global: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return parsePriceBookItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price_book_items'] });
      toast.success('Price book item created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create item: ${error.message}`);
    },
  });
}

export function useUpdatePriceBookItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdatePriceBookItemInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await (supabase as any)
        .from('price_book_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return parsePriceBookItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price_book_items'] });
      toast.success('Price book item updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}

export function useDeletePriceBookItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('price_book_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price_book_items'] });
      toast.success('Price book item deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });
}
