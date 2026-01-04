import { useCallback, useMemo } from 'react';
import { ProjectMaterial } from '@/lib/canvas/types';
import { Material, MaterialSpecs, MaterialSubtype } from '@/hooks/useMaterials';

// Auto-generate material codes based on type/subtype
const CODE_PREFIXES: Record<string, string> = {
  carpet_tile: 'CT',
  broadloom_carpet: 'BC',
  sheet_vinyl: 'SV',
  vinyl_plank: 'VP',
  lvt: 'LV',
  ceramic_tile: 'CR',
  baseboard: 'BB',
  transition_strip: 'TR',
  roll: 'RL',
  tile: 'TL',
  linear: 'LN',
};

export function generateMaterialCode(
  typeOrSubtype: string,
  existingCodes: string[]
): string {
  const prefix = CODE_PREFIXES[typeOrSubtype] || CODE_PREFIXES[typeOrSubtype.split('_')[0]] || 'M';
  let counter = 1;
  
  while (existingCodes.includes(`${prefix}${String(counter).padStart(2, '0')}`)) {
    counter++;
  }
  
  return `${prefix}${String(counter).padStart(2, '0')}`;
}

export function createProjectMaterialFromLibrary(
  material: Material,
  existingCodes: string[]
): ProjectMaterial {
  const subtype = (material.specs as MaterialSpecs).subtype as string || material.subtype;
  const code = generateMaterialCode(subtype || material.type, existingCodes);
  
  return {
    id: crypto.randomUUID(),
    sourceMaterialId: material.id,
    name: material.name,
    type: material.type,
    subtype: subtype,
    specs: { ...material.specs },
    materialCode: code,
    isCustom: false,
  };
}

export function createNewProjectMaterial(
  data: {
    name: string;
    type: 'roll' | 'tile' | 'linear';
    subtype?: MaterialSubtype;
    specs: MaterialSpecs;
  },
  existingCodes: string[]
): ProjectMaterial {
  const code = generateMaterialCode(data.subtype || data.type, existingCodes);
  
  return {
    id: crypto.randomUUID(),
    name: data.name,
    type: data.type,
    subtype: data.subtype,
    specs: { ...data.specs, subtype: data.subtype },
    materialCode: code,
    isCustom: true,
  };
}

interface UseProjectMaterialsResult {
  projectMaterials: ProjectMaterial[];
  existingCodes: string[];
  
  addFromLibrary: (material: Material) => ProjectMaterial;
  createNew: (data: {
    name: string;
    type: 'roll' | 'tile' | 'linear';
    subtype?: MaterialSubtype;
    specs: MaterialSpecs;
  }) => ProjectMaterial;
  update: (id: string, updates: Partial<Omit<ProjectMaterial, 'id'>>) => void;
  remove: (id: string) => void;
  getMaterialById: (id: string) => ProjectMaterial | undefined;
  getMaterialByCode: (code: string) => ProjectMaterial | undefined;
}

export function useProjectMaterials(
  projectMaterials: ProjectMaterial[] = [],
  onProjectMaterialsChange?: (materials: ProjectMaterial[]) => void
): UseProjectMaterialsResult {
  const existingCodes = useMemo(
    () => projectMaterials.map(m => m.materialCode),
    [projectMaterials]
  );

  const addFromLibrary = useCallback((material: Material): ProjectMaterial => {
    const newMaterial = createProjectMaterialFromLibrary(material, existingCodes);
    onProjectMaterialsChange?.([...projectMaterials, newMaterial]);
    return newMaterial;
  }, [projectMaterials, existingCodes, onProjectMaterialsChange]);

  const createNew = useCallback((data: {
    name: string;
    type: 'roll' | 'tile' | 'linear';
    subtype?: MaterialSubtype;
    specs: MaterialSpecs;
  }): ProjectMaterial => {
    const newMaterial = createNewProjectMaterial(data, existingCodes);
    onProjectMaterialsChange?.([...projectMaterials, newMaterial]);
    return newMaterial;
  }, [projectMaterials, existingCodes, onProjectMaterialsChange]);

  const update = useCallback((id: string, updates: Partial<Omit<ProjectMaterial, 'id'>>) => {
    const updatedMaterials = projectMaterials.map(m => 
      m.id === id ? { ...m, ...updates } : m
    );
    onProjectMaterialsChange?.(updatedMaterials);
  }, [projectMaterials, onProjectMaterialsChange]);

  const remove = useCallback((id: string) => {
    const filteredMaterials = projectMaterials.filter(m => m.id !== id);
    onProjectMaterialsChange?.(filteredMaterials);
  }, [projectMaterials, onProjectMaterialsChange]);

  const getMaterialById = useCallback((id: string) => {
    return projectMaterials.find(m => m.id === id);
  }, [projectMaterials]);

  const getMaterialByCode = useCallback((code: string) => {
    return projectMaterials.find(m => m.materialCode === code);
  }, [projectMaterials]);

  return {
    projectMaterials,
    existingCodes,
    addFromLibrary,
    createNew,
    update,
    remove,
    getMaterialById,
    getMaterialByCode,
  };
}

// Convert ProjectMaterial to Material-compatible interface for calculations
export function projectMaterialToMaterial(pm: ProjectMaterial): Material {
  return {
    id: pm.id,
    name: pm.name,
    type: pm.type,
    subtype: pm.subtype as MaterialSubtype,
    specs: pm.specs as MaterialSpecs,
    organization_id: null,
    is_global: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
