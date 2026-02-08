import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface OrganizationBranding {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  terms_and_conditions: string | null;
  abn: string | null;
}

export function useOrganizationBranding() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ['organization-branding', profile?.organization_id],
    queryFn: async (): Promise<OrganizationBranding | null> => {
      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, address, phone, email, website, logo_url, terms_and_conditions, abn')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });
}
