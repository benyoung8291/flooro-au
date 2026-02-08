import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';
import { toast } from 'sonner';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface Quote {
  id: string;
  organization_id: string;
  project_id: string | null;
  quote_number: string;
  status: QuoteStatus;
  title: string | null;
  description: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  subtotal: number;
  total_cost: number;
  total_margin: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  valid_until: string | null;
  notes: string | null;
  internal_notes: string | null;
  terms_and_conditions: string | null;
  estimated_hours: number;
  version: number;
  parent_quote_id: string | null;
  created_by: string;
  sent_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteInput {
  title?: string;
  project_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  description?: string;
  terms_and_conditions?: string;
  tax_rate?: number;
}

export interface UpdateQuoteInput {
  title?: string | null;
  description?: string | null;
  status?: QuoteStatus;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  subtotal?: number;
  total_cost?: number;
  total_margin?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  valid_until?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  terms_and_conditions?: string | null;
  estimated_hours?: number;
  sent_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

function parseQuote(data: Record<string, unknown>): Quote {
  return {
    id: data.id as string,
    organization_id: data.organization_id as string,
    project_id: data.project_id as string | null,
    quote_number: data.quote_number as string,
    status: data.status as QuoteStatus,
    title: data.title as string | null,
    description: data.description as string | null,
    client_name: data.client_name as string | null,
    client_email: data.client_email as string | null,
    client_phone: data.client_phone as string | null,
    client_address: data.client_address as string | null,
    subtotal: Number(data.subtotal) || 0,
    total_cost: Number(data.total_cost) || 0,
    total_margin: Number(data.total_margin) || 0,
    tax_rate: Number(data.tax_rate) || 10,
    tax_amount: Number(data.tax_amount) || 0,
    total_amount: Number(data.total_amount) || 0,
    valid_until: data.valid_until as string | null,
    notes: data.notes as string | null,
    internal_notes: data.internal_notes as string | null,
    terms_and_conditions: data.terms_and_conditions as string | null,
    estimated_hours: Number(data.estimated_hours) || 0,
    version: Number(data.version) || 1,
    parent_quote_id: data.parent_quote_id as string | null,
    created_by: data.created_by as string,
    sent_at: data.sent_at as string | null,
    approved_at: data.approved_at as string | null,
    rejected_at: data.rejected_at as string | null,
    rejection_reason: data.rejection_reason as string | null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export function useQuotes(statusFilter?: QuoteStatus) {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ['quotes', profile?.organization_id, statusFilter],
    queryFn: async (): Promise<Quote[]> => {
      if (!profile?.organization_id) return [];

      let query = (supabase as any)
        .from('quotes')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parseQuote);
    },
    enabled: !!profile?.organization_id,
  });
}

export function useQuote(quoteId: string | undefined) {
  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async (): Promise<Quote | null> => {
      if (!quoteId) return null;

      const { data, error } = await (supabase as any)
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .maybeSingle();

      if (error) throw error;
      return data ? parseQuote(data) : null;
    },
    enabled: !!quoteId,
  });
}

export function useCreateQuote() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuoteInput): Promise<Quote> => {
      if (!user || !profile?.organization_id) {
        throw new Error('Not authenticated or no organization');
      }

      // Generate quote number via RPC
      const { data: quoteNumber, error: rpcError } = await (supabase as any)
        .rpc('generate_quote_number', { _org_id: profile.organization_id });

      if (rpcError) throw rpcError;

      // Load org terms if not provided
      let terms = input.terms_and_conditions;
      if (terms === undefined) {
        const { data: org } = await supabase
          .from('organizations')
          .select('terms_and_conditions')
          .eq('id', profile.organization_id)
          .single();
        terms = org?.terms_and_conditions || null;
      }

      const { data, error } = await (supabase as any)
        .from('quotes')
        .insert({
          organization_id: profile.organization_id,
          project_id: input.project_id || null,
          quote_number: quoteNumber,
          title: input.title || null,
          description: input.description || null,
          client_name: input.client_name || null,
          client_email: input.client_email || null,
          client_phone: input.client_phone || null,
          client_address: input.client_address || null,
          terms_and_conditions: terms || null,
          tax_rate: input.tax_rate ?? 10,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return parseQuote(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create quote: ${error.message}`);
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateQuoteInput }): Promise<Quote> => {
      const { data, error } = await (supabase as any)
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return parseQuote(data);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['quote', id] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<Quote>(['quote', id]);

      // Optimistically update the cache so inputs don't lose their value
      if (previous) {
        queryClient.setQueryData<Quote>(['quote', id], {
          ...previous,
          ...updates,
        } as Quote);
      }

      return { previous };
    },
    onError: (error: Error, { id }, context) => {
      // Roll back to previous value on error
      if (context?.previous) {
        queryClient.setQueryData(['quote', id], context.previous);
      }
      toast.error(`Failed to update quote: ${error.message}`);
    },
    onSuccess: (data) => {
      // Update cache with server response (source of truth) without triggering refetch
      queryClient.setQueryData(['quote', data.id], data);
      // Only invalidate the list view, not the individual quote
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string): Promise<void> => {
      const { error } = await (supabase as any)
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete quote: ${error.message}`);
    },
  });
}

export function useDuplicateQuote() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceQuoteId: string): Promise<Quote> => {
      if (!user || !profile?.organization_id) {
        throw new Error('Not authenticated or no organization');
      }

      // Get source quote
      const { data: source, error: fetchErr } = await (supabase as any)
        .from('quotes')
        .select('*')
        .eq('id', sourceQuoteId)
        .single();

      if (fetchErr) throw fetchErr;

      // Generate new number
      const { data: quoteNumber, error: rpcError } = await (supabase as any)
        .rpc('generate_quote_number', { _org_id: profile.organization_id });

      if (rpcError) throw rpcError;

      // Create duplicated quote
      const { data: newQuote, error: insertErr } = await (supabase as any)
        .from('quotes')
        .insert({
          organization_id: profile.organization_id,
          project_id: source.project_id,
          quote_number: quoteNumber,
          status: 'draft',
          title: source.title ? `${source.title} (Copy)` : null,
          description: source.description,
          client_name: source.client_name,
          client_email: source.client_email,
          client_phone: source.client_phone,
          client_address: source.client_address,
          subtotal: source.subtotal,
          total_cost: source.total_cost,
          total_margin: source.total_margin,
          tax_rate: source.tax_rate,
          tax_amount: source.tax_amount,
          total_amount: source.total_amount,
          valid_until: source.valid_until,
          notes: source.notes,
          internal_notes: source.internal_notes,
          terms_and_conditions: source.terms_and_conditions,
          estimated_hours: source.estimated_hours,
          version: (source.version || 1) + 1,
          parent_quote_id: sourceQuoteId,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Duplicate line items
      const { data: sourceItems, error: itemsErr } = await (supabase as any)
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', sourceQuoteId)
        .order('item_order');

      if (itemsErr) throw itemsErr;

      if (sourceItems && sourceItems.length > 0) {
        // First pass: insert parent items and build ID map
        const idMap = new Map<string, string>();
        const parentItems = sourceItems.filter((item: any) => !item.parent_line_item_id);
        const childItems = sourceItems.filter((item: any) => !!item.parent_line_item_id);

        for (const parent of parentItems) {
          const { data: newParent, error: pErr } = await (supabase as any)
            .from('quote_line_items')
            .insert({
              organization_id: profile.organization_id,
              quote_id: newQuote.id,
              parent_line_item_id: null,
              description: parent.description,
              quantity: parent.quantity,
              cost_price: parent.cost_price,
              sell_price: parent.sell_price,
              margin_percentage: parent.margin_percentage,
              unit_price: parent.unit_price,
              line_total: parent.line_total,
              estimated_hours: parent.estimated_hours,
              item_order: parent.item_order,
              is_optional: parent.is_optional,
              is_active: parent.is_active,
              price_book_item_id: parent.price_book_item_id,
              is_from_price_book: parent.is_from_price_book,
              source_room_id: parent.source_room_id,
              metadata: parent.metadata,
            })
            .select()
            .single();

          if (pErr) throw pErr;
          idMap.set(parent.id, newParent.id);
        }

        // Second pass: insert child items with mapped parent IDs
        if (childItems.length > 0) {
          const childInserts = childItems.map((child: any) => ({
            organization_id: profile.organization_id,
            quote_id: newQuote.id,
            parent_line_item_id: idMap.get(child.parent_line_item_id) || null,
            description: child.description,
            quantity: child.quantity,
            cost_price: child.cost_price,
            sell_price: child.sell_price,
            margin_percentage: child.margin_percentage,
            unit_price: child.unit_price,
            line_total: child.line_total,
            estimated_hours: child.estimated_hours,
            item_order: child.item_order,
            is_optional: child.is_optional,
            is_active: child.is_active,
            price_book_item_id: child.price_book_item_id,
            is_from_price_book: child.is_from_price_book,
            source_room_id: child.source_room_id,
            metadata: child.metadata,
          }));

          const { error: childErr } = await (supabase as any)
            .from('quote_line_items')
            .insert(childInserts);

          if (childErr) throw childErr;
        }
      }

      return parseQuote(newQuote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote duplicated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate quote: ${error.message}`);
    },
  });
}

export function useQuoteStats() {
  const { data: quotes } = useQuotes();

  const stats = {
    total: quotes?.length ?? 0,
    draft: quotes?.filter(q => q.status === 'draft').length ?? 0,
    sent: quotes?.filter(q => q.status === 'sent').length ?? 0,
    accepted: quotes?.filter(q => q.status === 'accepted').length ?? 0,
    declined: quotes?.filter(q => q.status === 'declined').length ?? 0,
    expired: quotes?.filter(q => q.status === 'expired').length ?? 0,
    totalValue: quotes?.reduce((sum, q) => sum + q.total_amount, 0) ?? 0,
    acceptedValue: quotes
      ?.filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + q.total_amount, 0) ?? 0,
  };

  return stats;
}
