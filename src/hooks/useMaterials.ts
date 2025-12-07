import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// Enhanced material specifications with mm dimensions and dual pricing
export interface MaterialSpecs {
  // Tile/Plank dimensions (in mm for precision)
  widthMm?: number;          // e.g., 500mm for carpet tile
  lengthMm?: number;         // e.g., 500mm (square) or 250mm (plank)
  
  // Roll dimensions
  rollWidthMm?: number;      // e.g., 2000mm for vinyl, 3660mm for broadloom
  rollLengthM?: number;      // e.g., 25m, 30m
  
  // Pattern matching
  patternRepeatMm?: number;  // For pattern matching during installation
  
  // Pricing (flexible model)
  pricePerM2?: number;       // Standard per m² pricing
  pricePerRoll?: number;     // Full roll price
  pricePerLinearM?: number;  // Cut price per linear meter (for partial rolls)
  
  // Packaging - Tiles
  tilesPerBox?: number;      // e.g., 16 tiles per box
  boxCoverageM2?: number;    // Coverage per box in m² (calculated from tile dims + tilesPerBox)
  pricePerBox?: number;      // Price per box (optional, alternative to pricePerM2 * coverage)
  
  // Waste factor
  wastePercent?: number;     // Default 10%
  
  // Product identification
  range?: string;            // Product line/collection (e.g., "Urban Retreat")
  colour?: string;           // Color/colorway (e.g., "Ash Grey")
  backing?: string;          // Backing type (e.g., "Graphlex", "CushionBac")
  
  // Product metadata
  imageUrl?: string;         // Product image
  manufacturerUrl?: string;  // Source URL
  sku?: string;              // Product SKU/code
  manufacturer?: string;     // Brand name
  
  // Legacy fields for backwards compatibility
  price?: number;
  width?: number;
  height?: number;
  unit?: string;
  [key: string]: unknown;
}

// Rounding mode for box/roll quantities
export type QuantityRoundingMode = 'up' | 'down' | 'nearest';

// Backing type options by material subtype
export const BACKING_OPTIONS: Record<string, string[]> = {
  carpet_tile: ['Graphlex', 'CushionBac', 'TractionBac', 'Modular', 'Hardback', 'Felt', 'EcoBase'],
  sheet_vinyl: ['Fibreglass', 'Foam', 'Compact', 'Loose-lay', 'Felt'],
  lvt: ['Rigid Core', 'WPC', 'SPC', 'Loose-lay', 'Dry-back'],
  vinyl_plank: ['Rigid Core', 'WPC', 'SPC', 'Loose-lay', 'Dry-back'],
};

// Material subtypes for more granular categorization
export type MaterialSubtype = 
  | 'broadloom_carpet' 
  | 'sheet_vinyl' 
  | 'carpet_tile' 
  | 'ceramic_tile' 
  | 'vinyl_plank' 
  | 'lvt'
  | 'baseboard'
  | 'transition_strip';

export interface Material {
  id: string;
  name: string;
  type: 'roll' | 'tile' | 'linear';
  subtype?: MaterialSubtype;
  specs: MaterialSpecs;
  organization_id: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialInput {
  name: string;
  type: 'roll' | 'tile' | 'linear';
  subtype?: MaterialSubtype;
  specs: MaterialSpecs;
}

export interface UpdateMaterialInput {
  id: string;
  name?: string;
  type?: 'roll' | 'tile' | 'linear';
  subtype?: MaterialSubtype;
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
  const specs = data.specs as MaterialSpecs;
  return {
    id: data.id,
    name: data.name,
    type: data.type as 'roll' | 'tile' | 'linear',
    subtype: specs.subtype as MaterialSubtype | undefined,
    specs: specs,
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
          specs: { ...input.specs, subtype: input.subtype } as unknown as Json,
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
      if (updates.specs) updateData.specs = { ...updates.specs, subtype: updates.subtype } as unknown as Json;
      
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

// Helper to get primary price from specs
export function getMaterialPrice(specs: MaterialSpecs): number {
  return specs.pricePerM2 || specs.price || 0;
}

// Helper to get display dimensions
export function getMaterialDimensions(material: Material): string {
  const { specs, type } = material;
  
  if (type === 'tile') {
    if (specs.widthMm && specs.lengthMm) {
      return `${specs.widthMm} × ${specs.lengthMm}mm`;
    }
  }
  
  if (type === 'roll') {
    if (specs.rollWidthMm) {
      const widthM = (specs.rollWidthMm / 1000).toFixed(2);
      if (specs.rollLengthM) {
        return `${widthM}m × ${specs.rollLengthM}m roll`;
      }
      return `${widthM}m wide`;
    }
    if (specs.width) {
      return `${specs.width}m wide`;
    }
  }
  
  return '';
}

// Helper to calculate box coverage from tile dimensions
export function calculateBoxCoverage(specs: MaterialSpecs): number | undefined {
  if (!specs.tilesPerBox) return undefined;
  if (specs.widthMm && specs.lengthMm) {
    const tileAreaM2 = (specs.widthMm / 1000) * (specs.lengthMm / 1000);
    return tileAreaM2 * specs.tilesPerBox;
  }
  return undefined;
}

// Helper to get packaging display
export function getMaterialPackaging(material: Material): string | undefined {
  const { specs, type } = material;
  
  if (type === 'tile' && specs.tilesPerBox) {
    const coverage = specs.boxCoverageM2 || calculateBoxCoverage(specs);
    if (coverage) {
      return `${specs.tilesPerBox} tiles/box (${coverage.toFixed(2)} m²)`;
    }
    return `${specs.tilesPerBox} tiles/box`;
  }
  
  return undefined;
}
