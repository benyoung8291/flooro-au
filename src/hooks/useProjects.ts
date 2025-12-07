import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';
import type { Json } from '@/integrations/supabase/types';

export type ProjectStatus = 'draft' | 'pending_service' | 'in_progress' | 'completed';

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  status: ProjectStatus;
  service_requested: boolean;
  json_data: Record<string, unknown>;
  floor_plan_url: string | null;
  created_by: string | null;
  assigned_to: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  name: string;
  address?: string;
}

export interface UpdateProjectInput {
  name?: string;
  address?: string;
  status?: ProjectStatus;
  service_requested?: boolean;
  json_data?: Json;
  floor_plan_url?: string;
  notes?: string;
}

export function useProjects() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ['projects', profile?.organization_id],
    queryFn: async (): Promise<Project[]> => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Project[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async (): Promise<Project | null> => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput): Promise<Project> => {
      if (!user || !profile?.organization_id) {
        throw new Error('Not authenticated or no organization');
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: input.name,
          address: input.address || null,
          organization_id: profile.organization_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateProjectInput }): Promise<Project> => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useRequestService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<Project> => {
      const { data, error } = await supabase
        .from('projects')
        .update({ 
          service_requested: true, 
          status: 'pending_service' as ProjectStatus 
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
}

export function useProjectStats() {
  const { data: projects } = useProjects();

  return {
    total: projects?.length ?? 0,
    draft: projects?.filter(p => p.status === 'draft').length ?? 0,
    pending: projects?.filter(p => p.status === 'pending_service').length ?? 0,
    inProgress: projects?.filter(p => p.status === 'in_progress').length ?? 0,
    completed: projects?.filter(p => p.status === 'completed').length ?? 0,
  };
}
