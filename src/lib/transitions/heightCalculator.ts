import { Room } from '@/lib/canvas/types';
import { Material, MaterialSpecs } from '@/hooks/useMaterials';
import { UNDERLAYMENT_TYPES } from '@/lib/accessories/types';

export interface RoomStackHeight {
  roomId: string;
  roomName: string;
  materialThicknessMm: number;
  underlaymentThicknessMm: number;
  totalHeightMm: number;
  materialName?: string;
  underlaymentType?: string;
}

/**
 * Calculate the total installed floor height for a room
 * (material thickness + underlayment thickness)
 */
export function calculateRoomStackHeight(
  room: Room,
  material: Material | undefined,
  allMaterials: Material[]
): RoomStackHeight {
  let materialThicknessMm = 0;
  let underlaymentThicknessMm = 0;
  let materialName: string | undefined;
  let underlaymentType: string | undefined;

  // Get material thickness
  if (material) {
    const specs = material.specs as MaterialSpecs;
    materialThicknessMm = specs.installedHeightMm || specs.thicknessMm || getDefaultThickness(material);
    materialName = material.name;
  }

  // Get underlayment thickness
  if (room.accessories?.underlayment?.enabled && room.accessories.underlayment.type !== 'none') {
    const underlayConfig = room.accessories.underlayment;
    underlaymentType = underlayConfig.type;
    
    // Check if there's a specific underlayment material linked
    if (underlayConfig.materialId) {
      const underlayMaterial = allMaterials.find(m => m.id === underlayConfig.materialId);
      if (underlayMaterial) {
        const underlaySpecs = underlayMaterial.specs as MaterialSpecs;
        underlaymentThicknessMm = underlaySpecs.thicknessMm || 0;
      }
    } else {
      // Use default thickness from type
      const typeInfo = UNDERLAYMENT_TYPES[underlayConfig.type as keyof typeof UNDERLAYMENT_TYPES];
      underlaymentThicknessMm = typeInfo?.thicknessMm || 0;
    }
  }

  return {
    roomId: room.id,
    roomName: room.name,
    materialThicknessMm,
    underlaymentThicknessMm,
    totalHeightMm: materialThicknessMm + underlaymentThicknessMm,
    materialName,
    underlaymentType,
  };
}

/**
 * Get default thickness for a material based on type/subtype
 */
function getDefaultThickness(material: Material): number {
  const specs = material.specs as MaterialSpecs;
  const subtype = specs.subtype || material.subtype;

  switch (subtype) {
    case 'sheet_vinyl':
      return 2.5;
    case 'lvt':
    case 'vinyl_plank':
      return 4;
    case 'carpet_tile':
      return 6;
    case 'broadloom_carpet':
      return 8;
    case 'ceramic_tile':
      return 10;
    default:
      // Estimate based on type
      if (material.type === 'tile') return 8;
      if (material.type === 'roll') return 4;
      return 0;
  }
}

/**
 * Calculate height difference between two rooms
 */
export function calculateHeightDifference(
  room1Height: RoomStackHeight,
  room2Height: RoomStackHeight
): number {
  return Math.abs(room1Height.totalHeightMm - room2Height.totalHeightMm);
}

/**
 * Recommend transition type based on height difference
 */
export function recommendTransitionType(
  heightDifferenceMm: number
): 'threshold' | 't-molding' | 'reducer' | 'ramp' {
  if (heightDifferenceMm <= 2) {
    return 't-molding';
  } else if (heightDifferenceMm <= 6) {
    return 'reducer';
  } else if (heightDifferenceMm <= 12) {
    return 'threshold';
  } else {
    return 'ramp';
  }
}

/**
 * Get a human-readable label for transition type
 */
export function getTransitionLabel(type: string): string {
  const labels: Record<string, string> = {
    't-molding': 'T-Molding (same height)',
    'reducer': 'Reducer Strip',
    'threshold': 'Threshold',
    'ramp': 'Ramp System',
    'end-cap': 'End Cap',
    'auto': 'Auto-select',
  };
  return labels[type] || type;
}

/**
 * Format height for display
 */
export function formatHeight(mm: number): string {
  if (mm < 10) {
    return `${mm.toFixed(1)}mm`;
  }
  return `${Math.round(mm)}mm`;
}
