import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';

interface DescriptionTemplate {
  id: string;
  organization_id: string;
  name: string;
  content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDescriptionTemplates() {
  const { data: profile } = useUserProfile();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['description-templates', orgId],
    queryFn: async (): Promise<DescriptionTemplate[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('description_templates' as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('name');

      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!orgId,
  });
}

export function useSaveDescriptionTemplate() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string | null }) => {
      if (!profile?.organization_id || !user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('description_templates' as any)
        .insert({
          organization_id: profile.organization_id,
          name,
          content,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['description-templates'] });
    },
  });
}

export function useDeleteDescriptionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('description_templates' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['description-templates'] });
    },
  });
}
