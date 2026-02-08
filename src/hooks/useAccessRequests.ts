import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';

interface DomainOrg {
  org_id: string;
  org_name: string;
}

interface AccessRequest {
  id: string;
  user_id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDomainOrganizations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['domain-organizations', user?.id],
    queryFn: async (): Promise<DomainOrg[]> => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('check_domain_organizations');
      if (error) throw error;
      return (data || []) as DomainOrg[];
    },
    enabled: !!user,
  });
}

export function useMyAccessRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-access-requests', user?.id],
    queryFn: async (): Promise<AccessRequest[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AccessRequest[];
    },
    enabled: !!user,
  });
}

export function useCreateAccessRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, email, fullName }: {
      organizationId: string;
      email: string;
      fullName?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('access_requests')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          email,
          full_name: fullName || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-access-requests'] });
    },
  });
}

export function useOrgAccessRequests() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ['org-access-requests', profile?.organization_id],
    queryFn: async (): Promise<AccessRequest[]> => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AccessRequest[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useApproveAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('approve_access_request', {
        _request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useDenyAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('deny_access_request', {
        _request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-access-requests'] });
    },
  });
}
