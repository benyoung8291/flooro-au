import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { useSubscription } from './useSubscription';

interface UsageStats {
  projectCount: number;
  memberCount: number;
  storageUsedMB: number;
}

export function useOrganizationUsage() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ['org-usage', profile?.organization_id],
    queryFn: async (): Promise<UsageStats> => {
      if (!profile?.organization_id) {
        return { projectCount: 0, memberCount: 0, storageUsedMB: 0 };
      }

      // Get project count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);

      // Get member count
      const { count: memberCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);

      // TODO: Calculate actual storage usage from floor_plan_images bucket
      const storageUsedMB = 0;

      return {
        projectCount: projectCount || 0,
        memberCount: memberCount || 0,
        storageUsedMB,
      };
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCanCreateProject(): { canCreate: boolean; remaining: number } {
  const { limits } = useSubscription();
  const { data: usage } = useOrganizationUsage();

  const projectCount = usage?.projectCount || 0;
  const limit = limits.projects;
  
  if (limit === -1) {
    return { canCreate: true, remaining: Infinity };
  }

  return {
    canCreate: projectCount < limit,
    remaining: Math.max(0, limit - projectCount),
  };
}

export function useCanAddTeamMember(): { canAdd: boolean; remaining: number } {
  const { limits } = useSubscription();
  const { data: usage } = useOrganizationUsage();

  const memberCount = usage?.memberCount || 0;
  const limit = limits.teamMembers;
  
  if (limit === -1) {
    return { canAdd: true, remaining: Infinity };
  }

  return {
    canAdd: memberCount < limit,
    remaining: Math.max(0, limit - memberCount),
  };
}
