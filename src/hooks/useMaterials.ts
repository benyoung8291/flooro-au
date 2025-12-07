import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface MaterialSpecs {
  width?: number;
  height?: number;
  price: number;
  unit?: string;
  [key: string]: unknown;
}

export interface Material {
  id: string;
  name: string;
  type: 'roll' | 'tile' | 'linear';
  specs: MaterialSpecs;
  organization_id: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialInput {
  name: string;
  type: 'roll' | 'tile' | 'linear';
  specs: MaterialSpecs;
}

export interface UpdateMaterialInput {
  id: string;
  name?: string;
  type?: 'roll' | 'tile' | 'linear';
  specs?: MaterialSpecs;
}

function parseMaterial(data: {
  id: string;
  name: string;
  type: string;
  specs: Json;
  organization_id: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}): Material {
  return {
    id: data.id,
    name: data.name,
    type: data.type as 'roll' | 'tile' | 'linear',
    specs: data.specs as MaterialSpecs,
    organization_id: data.organization_id,
    is_global: data.is_global,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('is_global', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return (data || []).map(parseMaterial);
    },
  });
}

export function useMaterialsByType(type?: 'roll' | 'tile' | 'linear') {
  return useQuery({
    queryKey: ['materials', 'type', type],
    queryFn: async () => {
      let query = supabase
        .from('materials')
        .select('*')
        .order('is_global', { ascending: false })
        .order('name');
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parseMaterial);
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateMaterialInput) => {
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.organization_id) throw new Error('No organization found');
      
      const { data, error } = await supabase
        .from('materials')
        .insert({
          name: input.name,
          type: input.type,
          specs: input.specs as unknown as Json,
          organization_id: profile.organization_id,
          is_global: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return parseMaterial(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create material: ${error.message}`);
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateMaterialInput) => {
      const { id, ...updates } = input;
      
      const updateData: Record<string, unknown> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.type = updates.type;
      if (updates.specs) updateData.specs = updates.specs as unknown as Json;
      
      const { data, error } = await supabase
        .from('materials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return parseMaterial(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update material: ${error.message}`);
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete material: ${error.message}`);
    },
  });
}
