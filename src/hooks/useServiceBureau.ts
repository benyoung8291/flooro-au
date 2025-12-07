import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsPlatformAdmin } from './useUserProfile';

export interface ServiceProject {
  id: string;
  name: string;
  address: string | null;
  status: 'draft' | 'pending_service' | 'in_progress' | 'completed';
  service_requested: boolean;
  notes: string | null;
  internal_notes: string | null;
  floor_plan_url: string | null;
  json_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  organization_id: string;
  assigned_to: string | null;
  created_by: string | null;
  organization?: {
    id: string;
    name: string;
    subscription_tier: 'free' | 'pro' | 'enterprise';
  };
}

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

export function useServiceQueue() {
  const isPlatformAdmin = useIsPlatformAdmin();

  return useQuery({
    queryKey: ['service-queue'],
    queryFn: async (): Promise<ServiceProject[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          organization:organizations(id, name, subscription_tier)
        `)
        .eq('service_requested', true)
        .in('status', ['pending_service', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ServiceProject[];
    },
    enabled: isPlatformAdmin,
  });
}

export function useAllProjects(statusFilter?: string) {
  const isPlatformAdmin = useIsPlatformAdmin();

  return useQuery({
    queryKey: ['all-projects', statusFilter],
    queryFn: async (): Promise<ServiceProject[]> => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          organization:organizations(id, name, subscription_tier)
        `)
        .order('updated_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'draft' | 'pending_service' | 'in_progress' | 'completed');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ServiceProject[];
    },
    enabled: isPlatformAdmin,
  });
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

export function useAdminProject(projectId: string | undefined) {
  const isPlatformAdmin = useIsPlatformAdmin();

  return useQuery({
    queryKey: ['admin-project', projectId],
    queryFn: async (): Promise<ServiceProject | null> => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          organization:organizations(id, name, subscription_tier)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as ServiceProject;
    },
    enabled: isPlatformAdmin && !!projectId,
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      status 
    }: { 
      projectId: string; 
      status: 'draft' | 'pending_service' | 'in_progress' | 'completed';
    }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-queue'] });
      queryClient.invalidateQueries({ queryKey: ['all-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-project'] });
    },
  });
}

export function useUpdateInternalNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      internal_notes 
    }: { 
      projectId: string; 
      internal_notes: string;
    }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ internal_notes })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-project'] });
    },
  });
}

export function useAssignProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      assignedTo 
    }: { 
      projectId: string; 
      assignedTo: string | null;
    }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ assigned_to: assignedTo })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-queue'] });
      queryClient.invalidateQueries({ queryKey: ['all-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-project'] });
    },
  });
}

export function useServiceStats() {
  const isPlatformAdmin = useIsPlatformAdmin();

  return useQuery({
    queryKey: ['service-stats'],
    queryFn: async () => {
      const [pendingRes, inProgressRes, completedRes, orgsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_service'),
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_progress'),
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true }),
      ]);

      return {
        pending: pendingRes.count || 0,
        inProgress: inProgressRes.count || 0,
        completed: completedRes.count || 0,
        organizations: orgsRes.count || 0,
      };
    },
    enabled: isPlatformAdmin,
  });
}
