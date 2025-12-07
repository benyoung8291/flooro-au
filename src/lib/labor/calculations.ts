import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { calculateRoomNetArea, calculatePerimeter, pixelAreaToRealArea, mmSquaredToMSquared } from '@/lib/canvas/geometry';
import {
  ProjectLaborConfig,
  RoomLaborCalculation,
  ProjectCostBreakdown,
  RoomComplexity,
  getComplexityMultiplier,
  DEFAULT_LABOR_RATES,
} from './types';

/**
 * Determine room complexity based on geometry
 */
export function analyzeRoomComplexity(room: Room): RoomComplexity {
  const vertexCount = room.points.length;
  const holeCount = room.holes.length;
  const doorCount = room.doors.length;
  
  // Simple: 4 vertices, no holes, few doors
  if (vertexCount <= 4 && holeCount === 0 && doorCount <= 2) {
    return 'simple';
  }
  
  // Complex: many vertices or holes
  if (vertexCount > 8 || holeCount > 2) {
    return 'complex';
  }
  
  // Difficult: very irregular shape
  if (vertexCount > 12 || holeCount > 4) {
    return 'difficult';
  }
  
  return 'standard';
}

/**
 * Get installation rate based on material type
 */
function getInstallationRate(
  materialType: string,
  config: ProjectLaborConfig
): { rate: number; unit: 'm2' | 'linear_m' | 'unit' } {
  switch (materialType) {
    case 'roll':
      return { rate: config.rollInstallRate, unit: 'm2' };
    case 'tile':
      return { rate: config.tileInstallRate, unit: 'm2' };
    case 'plank':
      return { rate: config.plankInstallRate, unit: 'm2' };
    case 'linear':
      return { rate: config.covingInstallRate, unit: 'linear_m' };
    default:
      return { rate: config.rollInstallRate, unit: 'm2' };
  }
}

/**
 * Calculate labor costs for a single room
 */
export function calculateRoomLabor(
  room: Room,
  material: Material | undefined,
  scale: ScaleCalibration | null,
  config: ProjectLaborConfig = DEFAULT_LABOR_RATES
): RoomLaborCalculation {
  // Calculate room area
  const areaPixels = calculateRoomNetArea(room);
  const areaMm2 = pixelAreaToRealArea(areaPixels, scale);
  const areaM2 = mmSquaredToMSquared(areaMm2);
  
  // Calculate perimeter
  const perimeterPixels = calculatePerimeter(room.points);
  const toMm = (pixels: number) => scale?.pixelsPerMm ? pixels / scale.pixelsPerMm : pixels;
  const perimeterMm = toMm(perimeterPixels);
  const perimeterM = perimeterMm / 1000;
  
  // Get complexity
  const complexity = analyzeRoomComplexity(room);
  const complexityFactor = getComplexityMultiplier(complexity);
  
  // Calculate installation cost
  const materialType = material?.type || 'roll';
  const { rate, unit } = getInstallationRate(materialType, config);
  
  let installationCost = 0;
  if (unit === 'm2') {
    installationCost = areaM2 * rate;
  } else if (unit === 'linear_m') {
    installationCost = perimeterM * rate;
  }
  
  // Apply pattern matching multiplier if applicable
  const hasPattern = material?.specs?.patternRepeat || material?.specs?.patternRepeatMm;
  if (hasPattern && materialType === 'roll') {
    installationCost *= config.patternMultiplier;
  }
  
  // Apply complexity factor
  const adjustedInstallationCost = installationCost * complexityFactor;
  
  // Preparation costs
  const prepCost = config.includeFloorPrep ? areaM2 * config.floorPrepRate : 0;
  const removalCost = config.includeRemoval ? areaM2 * config.removalRate : 0;
  
  // Accessory labor costs
  let covingLaborCost = 0;
  let transitionLaborCost = 0;
  
  if (room.accessories?.coving?.enabled) {
    // Calculate wall perimeter minus door widths
    const doorWidthTotal = room.doors.reduce((sum, d) => sum + d.width, 0);
    const doorWidthM = toMm(doorWidthTotal) / 1000;
    const covingLength = Math.max(0, perimeterM - doorWidthM);
    covingLaborCost = covingLength * config.covingInstallRate;
  }
  
  if (room.accessories?.transitions && room.accessories.transitions.length > 0) {
    transitionLaborCost = room.accessories.transitions.length * config.transitionInstallRate;
  }
  
  const totalLaborCost = adjustedInstallationCost + prepCost + removalCost + 
                         covingLaborCost + transitionLaborCost;
  
  return {
    roomId: room.id,
    roomName: room.name,
    areaM2,
    perimeterM,
    installationCost,
    installationRate: rate,
    installationUnit: unit,
    prepCost,
    removalCost,
    covingLaborCost,
    transitionLaborCost,
    complexityFactor,
    adjustedInstallationCost,
    totalLaborCost,
  };
}

/**
 * Calculate complete project cost breakdown
 */
export function calculateProjectCosts(
  rooms: Room[],
  materials: Material[],
  materialCosts: Map<string, number>, // roomId -> material cost
  accessoryCosts: Map<string, number>, // roomId -> accessory cost
  scale: ScaleCalibration | null,
  config: ProjectLaborConfig = DEFAULT_LABOR_RATES,
  taxRate: number = 0
): ProjectCostBreakdown {
  // Calculate labor for each room
  const roomBreakdowns: RoomLaborCalculation[] = rooms.map(room => {
    const material = materials.find(m => m.id === room.materialId);
    return calculateRoomLabor(room, material, scale, config);
  });
  
  // Sum up material costs
  const flooringCost = Array.from(materialCosts.values()).reduce((sum, cost) => sum + cost, 0);
  const accessoriesCost = Array.from(accessoryCosts.values()).reduce((sum, cost) => sum + cost, 0);
  const sundriesCost = 0; // Could add adhesive, grout, etc. here
  
  const materialSubtotal = flooringCost + accessoriesCost + sundriesCost;
  
  // Sum up labor costs
  const installationCost = roomBreakdowns.reduce((sum, r) => sum + r.adjustedInstallationCost, 0);
  const preparationCost = roomBreakdowns.reduce((sum, r) => sum + r.prepCost, 0);
  const removalCost = roomBreakdowns.reduce((sum, r) => sum + r.removalCost, 0);
  const accessoriesLaborCost = roomBreakdowns.reduce((sum, r) => 
    sum + r.covingLaborCost + r.transitionLaborCost, 0);
  
  const laborSubtotal = installationCost + preparationCost + removalCost + accessoriesLaborCost;
  
  // Additional costs (could be configured)
  const deliveryCost = 0;
  const wasteCost = 0; // Already accounted for in material calculations
  const contingencyCost = 0;
  const additionalSubtotal = deliveryCost + wasteCost + contingencyCost;
  
  // Calculate subtotal
  const subtotal = materialSubtotal + laborSubtotal + additionalSubtotal;
  
  // Calculate overhead
  const overheadAmount = subtotal * (config.overheadPercent / 100);
  
  // Calculate margin on (subtotal + overhead)
  const marginAmount = (subtotal + overheadAmount) * (config.marginPercent / 100);
  
  // Total before tax
  const totalBeforeTax = subtotal + overheadAmount + marginAmount;
  
  // Tax
  const taxAmount = totalBeforeTax * (taxRate / 100);
  
  // Grand total
  const grandTotal = totalBeforeTax + taxAmount;
  
  // Calculate total area
  const totalAreaM2 = roomBreakdowns.reduce((sum, r) => sum + r.areaM2, 0);
  const costPerM2 = totalAreaM2 > 0 ? grandTotal / totalAreaM2 : 0;
  
  return {
    materials: {
      flooring: flooringCost,
      accessories: accessoriesCost,
      sundries: sundriesCost,
      subtotal: materialSubtotal,
    },
    labor: {
      installation: installationCost,
      preparation: preparationCost,
      removal: removalCost,
      accessories: accessoriesLaborCost,
      subtotal: laborSubtotal,
    },
    additional: {
      delivery: deliveryCost,
      waste: wasteCost,
      contingency: contingencyCost,
      subtotal: additionalSubtotal,
    },
    subtotal,
    overheadAmount,
    overheadPercent: config.overheadPercent,
    marginAmount,
    marginPercent: config.marginPercent,
    totalBeforeTax,
    taxRate,
    taxAmount,
    grandTotal,
    roomBreakdowns,
    costPerM2,
    totalAreaM2,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Get labor category display name
 */
export function getLaborCategoryName(category: string): string {
  const names: Record<string, string> = {
    roll_install: 'Carpet/Vinyl Installation',
    tile_install: 'Tile Installation',
    plank_install: 'Plank Installation',
    coving_install: 'Coving Installation',
    transition_install: 'Transition Installation',
    floor_prep: 'Floor Preparation',
    subfloor_repair: 'Subfloor Repair',
    removal: 'Flooring Removal',
    furniture_move: 'Furniture Moving',
    pattern_match: 'Pattern Matching',
    stairs: 'Stair Installation',
    custom: 'Custom Labor',
  };
  return names[category] || category;
}
