import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsPlatformAdmin } from './useUserProfile';

export type ProjectStatus = 'draft' | 'active' | 'archived';

export interface AdminOrganization {
  id: string;
  name: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  logo_url: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  project_count?: number;
  member_count?: number;
}

export function useAllOrganizations() {
  const isPlatformAdmin = useIsPlatformAdmin();

  return useQuery({
    queryKey: ['all-organizations'],
    queryFn: async (): Promise<AdminOrganization[]> => {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Get project counts for each organization
      const orgsWithCounts = await Promise.all(
        (orgs || []).map(async (org) => {
          const { count: projectCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          const { count: memberCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          return {
            ...org,
            project_count: projectCount || 0,
            member_count: memberCount || 0,
          };
        })
      );

      return orgsWithCounts;
    },
    enabled: isPlatformAdmin,
  });
}

export function useAdminStats() {
  const isPlatformAdmin = useIsPlatformAdmin();

  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [projectsRes, orgsRes, usersRes, tierRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('organizations')
          .select('subscription_tier'),
      ]);

      // Count by subscription tier
      const tierCounts = {
        free: 0,
        pro: 0,
        enterprise: 0,
      };
      
      tierRes.data?.forEach((org) => {
        const tier = org.subscription_tier as keyof typeof tierCounts;
        if (tier in tierCounts) {
          tierCounts[tier]++;
        }
      });

      return {
        totalProjects: projectsRes.count || 0,
        totalOrganizations: orgsRes.count || 0,
        totalUsers: usersRes.count || 0,
        tierBreakdown: tierCounts,
      };
    },
    enabled: isPlatformAdmin,
  });
}
