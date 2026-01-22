import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export type MemberStatus = 'pending' | 'active' | 'suspended';
export type MemberRole = 'admin' | 'user' | 'viewer';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: MemberRole;
  status: MemberStatus;
  invited_by: string | null;
  created_at: string;
  activated_at: string | null;
}

export interface CreateMemberInput {
  email: string;
  full_name?: string;
  role: MemberRole;
}

export interface UpdateMemberInput {
  role?: MemberRole;
  status?: MemberStatus;
  full_name?: string;
}

export function useTeamMembers() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ['team-members', profile?.organization_id],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as OrganizationMember[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateTeamMember() {
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMemberInput): Promise<OrganizationMember> => {
      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      // Check if member already exists
      const { data: existing } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('email', input.email.toLowerCase())
        .maybeSingle();

      if (existing) {
        throw new Error('A team member with this email already exists');
      }

      const { data, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: profile.organization_id,
          email: input.email.toLowerCase(),
          full_name: input.full_name || null,
          role: input.role,
          invited_by: profile.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as OrganizationMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      memberId, 
      updates 
    }: { 
      memberId: string; 
      updates: UpdateMemberInput 
    }): Promise<OrganizationMember> => {
      const { data, error } = await supabase
        .from('organization_members')
        .update(updates)
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data as OrganizationMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string): Promise<void> => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useTeamMemberCount() {
  const { data: members } = useTeamMembers();
  
  return {
    total: members?.length ?? 0,
    active: members?.filter(m => m.status === 'active').length ?? 0,
    pending: members?.filter(m => m.status === 'pending').length ?? 0,
  };
}
