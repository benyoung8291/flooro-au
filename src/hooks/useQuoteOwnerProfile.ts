import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QuoteOwnerProfile {
  full_name: string | null;
  email: string;
  phone: string | null;
}

export function useQuoteOwnerProfile(createdBy: string | undefined) {
  return useQuery({
    queryKey: ['profile', createdBy],
    queryFn: async (): Promise<QuoteOwnerProfile | null> => {
      if (!createdBy) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', createdBy)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!createdBy,
  });
}
