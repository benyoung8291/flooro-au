import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationUpdate {
  name?: string;
  address?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  terms_and_conditions?: string | null;
  abn?: string | null;
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: OrganizationUpdate }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization', data.id] });
    },
  });
}