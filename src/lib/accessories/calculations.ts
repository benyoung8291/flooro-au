import { Room, ScaleCalibration, RoomAccessories } from '@/lib/canvas/types';
import { calculatePerimeter } from '@/lib/canvas/geometry';
import { Material, MaterialSpecs } from '@/hooks/useMaterials';
import { 
  AccessoryCalculation, 
  RoomAccessoriesCalculation,
  ADHESIVE_TYPES 
} from './types';
import { StripPlanResult } from '@/lib/rollGoods/types';

/**
 * Calculate total seam length from strip plan
 */
export function calculateSeamLengthFromPlan(stripPlan?: StripPlanResult): number {
  if (!stripPlan) return 0;
  return stripPlan.seamLines.reduce((total, seam) => {
    const dx = seam.x2 - seam.x1;
    const dy = seam.y2 - seam.y1;
    return total + Math.sqrt(dx * dx + dy * dy) / 1000; // Convert to meters
  }, 0);
}

/**
 * Count polygon corners (internal vs external)
 * Internal corners: angle > 180° (concave)
 * External corners: angle < 180° (convex)
 */
export function countPolygonCorners(points: { x: number; y: number }[]): { internal: number; external: number } {
  if (points.length < 3) return { internal: 0, external: 0 };
  
  let internal = 0;
  let external = 0;
  
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    
    // Calculate cross product to determine if corner is internal or external
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    
    // Assuming clockwise winding, negative cross = external, positive = internal
    if (cross < 0) {
      external++;
    } else {
      internal++;
    }
  }
  
  return { internal, external };
}

/**
 * Calculate coving requirements for a room
 */
export function calculateCoving(
  room: Room,
  scale: ScaleCalibration | null,
  covingMaterial?: Material
): AccessoryCalculation & { wallPerimeterM: number; excludedLengthM: number } | undefined {
  const accessories = room.accessories;
  if (!accessories?.coving?.enabled) return undefined;
  
  // Calculate total perimeter in pixels
  const perimeterPixels = calculatePerimeter(room.points);
  
  // Convert to meters using scale
  const pixelsPerMm = scale?.pixelsPerMm || 1;
  const perimeterM = perimeterPixels / pixelsPerMm / 1000;
  
  // Calculate door widths to subtract
  const doorWidthsM = room.doors.reduce((total, door) => total + door.width / 1000, 0);
  
  // Calculate excluded walls length (if any walls are excluded)
  let excludedLengthM = 0;
  if (accessories.coving.excludeWalls && accessories.coving.excludeWalls.length > 0) {
    const points = room.points;
    for (const wallIndex of accessories.coving.excludeWalls) {
      if (wallIndex >= 0 && wallIndex < points.length) {
        const start = points[wallIndex];
        const end = points[(wallIndex + 1) % points.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const wallLengthPixels = Math.sqrt(dx * dx + dy * dy);
        excludedLengthM += wallLengthPixels / pixelsPerMm / 1000;
      }
    }
  }
  
  const netCovingM = Math.max(0, perimeterM - doorWidthsM - excludedLengthM);
  
  // Get price from material or default
  const unitPrice = covingMaterial?.specs?.pricePerLinearM || 
                    covingMaterial?.specs?.pricePerM2 || 
                    covingMaterial?.specs?.price || 
                    15; // Default $15/m
  
  return {
    accessoryType: 'coving',
    materialId: accessories.coving.materialId,
    materialName: covingMaterial?.name || 'Wall Coving',
    quantity: netCovingM,
    unit: 'm',
    unitPrice,
    totalCost: netCovingM * unitPrice,
    wallPerimeterM: perimeterM,
    excludedLengthM: excludedLengthM + doorWidthsM,
    details: `${netCovingM.toFixed(2)}m @ ${accessories.coving.heightMm}mm height`,
  };
}

/**
 * Calculate cove fillet corners
 */
export function calculateCoveFilletCorners(
  room: Room,
  filletMaterial?: Material
): AccessoryCalculation & { internalCorners: number; externalCorners: number } | undefined {
  const accessories = room.accessories;
  if (!accessories?.coving?.enabled) return undefined;
  
  const corners = countPolygonCorners(room.points);
  
  // Also count corners from holes
  for (const hole of room.holes) {
    const holeCorners = countPolygonCorners(hole.points);
    // For holes, internal becomes external and vice versa
    corners.internal += holeCorners.external;
    corners.external += holeCorners.internal;
  }
  
  const totalCorners = corners.internal + corners.external;
  
  // Get price from material or default
  const pricePerCorner = (filletMaterial?.specs as Record<string, unknown>)?.pricePerCorner;
  const unitPrice: number = (typeof pricePerCorner === 'number' ? pricePerCorner : undefined) || 
                    filletMaterial?.specs?.price || 
                    5; // Default $5/corner
  
  return {
    accessoryType: 'cove_fillet',
    materialId: filletMaterial?.id,
    materialName: filletMaterial?.name || 'Cove Fillet',
    quantity: totalCorners,
    unit: 'pcs',
    unitPrice,
    totalCost: totalCorners * unitPrice,
    internalCorners: corners.internal,
    externalCorners: corners.external,
    details: `${corners.internal} internal, ${corners.external} external corners`,
  };
}

/**
 * Calculate weld rod requirements
 */
export function calculateWeldRod(
  room: Room,
  stripPlan?: StripPlanResult,
  weldRodMaterial?: Material
): AccessoryCalculation & { totalSeamLengthM: number } | undefined {
  const accessories = room.accessories;
  if (!accessories?.weldRod?.enabled) return undefined;
  
  const seamLengthM = calculateSeamLengthFromPlan(stripPlan);
  
  if (seamLengthM <= 0) return undefined;
  
  // Get price from material or default
  const pricePerLinearM = (weldRodMaterial?.specs as Record<string, unknown>)?.pricePerLinearM;
  const unitPrice = (typeof pricePerLinearM === 'number' ? pricePerLinearM : undefined) || 
                    weldRodMaterial?.specs?.price || 
                    2; // Default $2/m
  
  return {
    accessoryType: 'weld_rod',
    materialId: accessories.weldRod.materialId,
    materialName: weldRodMaterial?.name || 'Weld Rod',
    quantity: seamLengthM,
    unit: 'm',
    unitPrice,
    totalCost: seamLengthM * unitPrice,
    totalSeamLengthM: seamLengthM,
    details: `${seamLengthM.toFixed(2)}m seams`,
  };
}

/**
 * Calculate smooth edge / gripper requirements for broadloom carpet
 */
export function calculateSmoothEdge(
  room: Room,
  scale: ScaleCalibration | null,
  smoothEdgeMaterial?: Material
): AccessoryCalculation & { wallPerimeterM: number; excludedLengthM: number; isDoubleRow: boolean } | undefined {
  const accessories = room.accessories;
  if (!accessories?.smoothEdge?.enabled) return undefined;
  
  // Calculate total perimeter in pixels
  const perimeterPixels = calculatePerimeter(room.points);
  
  // Convert to meters using scale
  const pixelsPerMm = scale?.pixelsPerMm || 1;
  const perimeterM = perimeterPixels / pixelsPerMm / 1000;
  
  // Calculate door widths to subtract
  const doorWidthsM = room.doors.reduce((total, door) => total + door.width / 1000, 0);
  
  // Calculate excluded walls length (if any walls are excluded)
  let excludedLengthM = 0;
  if (accessories.smoothEdge.excludeWalls && accessories.smoothEdge.excludeWalls.length > 0) {
    const points = room.points;
    for (const wallIndex of accessories.smoothEdge.excludeWalls) {
      if (wallIndex >= 0 && wallIndex < points.length) {
        const start = points[wallIndex];
        const end = points[(wallIndex + 1) % points.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const wallLengthPixels = Math.sqrt(dx * dx + dy * dy);
        excludedLengthM += wallLengthPixels / pixelsPerMm / 1000;
      }
    }
  }
  
  let netSmoothEdgeM = Math.max(0, perimeterM - doorWidthsM - excludedLengthM);
  
  // Double row for heavy duty installations
  const isDoubleRow = accessories.smoothEdge.doubleRow || false;
  if (isDoubleRow) {
    netSmoothEdgeM *= 2;
  }
  
  // Get price from material or default
  const unitPrice = smoothEdgeMaterial?.specs?.pricePerLinearM || 
                    smoothEdgeMaterial?.specs?.pricePerM2 || 
                    smoothEdgeMaterial?.specs?.price || 
                    3.50; // Default $3.50/m
  
  return {
    accessoryType: 'smooth_edge',
    materialId: accessories.smoothEdge.materialId,
    materialName: smoothEdgeMaterial?.name || 'Smooth Edge / Gripper',
    quantity: netSmoothEdgeM,
    unit: 'm',
    unitPrice,
    totalCost: netSmoothEdgeM * unitPrice,
    wallPerimeterM: perimeterM,
    excludedLengthM: excludedLengthM + doorWidthsM,
    isDoubleRow,
    details: `${netSmoothEdgeM.toFixed(2)}m${isDoubleRow ? ' (double row)' : ''}`,
  };
}

/**
 * Calculate transition requirements for doors
 */
export function calculateTransitions(
  room: Room,
  materials: Material[]
): AccessoryCalculation[] | undefined {
  const accessories = room.accessories;
  if (!accessories?.transitions || accessories.transitions.length === 0) return undefined;
  
  const results: AccessoryCalculation[] = [];
  
  for (const transition of accessories.transitions) {
    const door = room.doors.find(d => d.id === transition.doorId);
    if (!door) continue;
    
    const transitionMaterial = transition.materialId 
      ? materials.find(m => m.id === transition.materialId)
      : undefined;
    
    // Get price from material or default based on door width
    const doorWidthM = door.width / 1000;
    const unitPrice = transitionMaterial?.specs?.pricePerLinearM || 
                      transitionMaterial?.specs?.price || 
                      25; // Default $25/transition
    
    results.push({
      accessoryType: 'transition',
      materialId: transition.materialId,
      materialName: transitionMaterial?.name || `${transition.type} Transition`,
      quantity: 1,
      unit: 'pcs',
      unitPrice,
      totalCost: unitPrice,
      details: `${transition.type} @ ${(doorWidthM * 1000).toFixed(0)}mm`,
    });
  }
  
  return results.length > 0 ? results : undefined;
}

/**
 * Calculate underlayment requirements
 */
export function calculateUnderlayment(
  room: Room,
  areaM2: number,
  underlaymentMaterial?: Material
): AccessoryCalculation & { areaM2: number } | undefined {
  const accessories = room.accessories;
  if (!accessories?.underlayment?.enabled || accessories.underlayment.type === 'none') return undefined;
  
  // Add 5% waste for underlayment
  const grossAreaM2 = areaM2 * 1.05;
  
  // Get price from material or default
  const unitPrice = underlaymentMaterial?.specs?.pricePerM2 || 
                    underlaymentMaterial?.specs?.price || 
                    8; // Default $8/m²
  
  return {
    accessoryType: 'underlayment',
    materialId: accessories.underlayment.materialId,
    materialName: underlaymentMaterial?.name || `${accessories.underlayment.type} Underlayment`,
    quantity: grossAreaM2,
    unit: 'm²',
    unitPrice,
    totalCost: grossAreaM2 * unitPrice,
    areaM2: grossAreaM2,
    details: `${grossAreaM2.toFixed(2)}m² (${accessories.underlayment.type})`,
  };
}

/**
 * Calculate adhesive requirements
 */
export function calculateAdhesive(
  room: Room,
  areaM2: number,
  adhesiveMaterial?: Material
): AccessoryCalculation & { areaM2: number; unitsNeeded: number } | undefined {
  const accessories = room.accessories;
  if (!accessories?.adhesive?.enabled || accessories.adhesive.type === 'none') return undefined;
  
  const adhesiveType = accessories.adhesive.type;
  const defaultCoverage = ADHESIVE_TYPES[adhesiveType]?.defaultCoverage || 25;
  const coverageM2PerUnit = accessories.adhesive.coverageRateM2PerUnit || defaultCoverage;
  
  if (coverageM2PerUnit <= 0) return undefined;
  
  const unitsNeeded = Math.ceil(areaM2 / coverageM2PerUnit);
  
  // Get price from material or default
  const pricePerUnit = (adhesiveMaterial?.specs as Record<string, unknown>)?.pricePerUnit;
  const unitPrice = (typeof pricePerUnit === 'number' ? pricePerUnit : undefined) || 
                    adhesiveMaterial?.specs?.price || 
                    75; // Default $75/unit
  
  return {
    accessoryType: 'adhesive',
    materialId: accessories.adhesive.materialId,
    materialName: adhesiveMaterial?.name || `${adhesiveType} Adhesive`,
    quantity: unitsNeeded,
    unit: 'units',
    unitPrice,
    totalCost: unitsNeeded * unitPrice,
    areaM2,
    unitsNeeded,
    details: `${unitsNeeded} units @ ${coverageM2PerUnit}m²/unit`,
  };
}

/**
 * Calculate all accessories for a room
 */
export function calculateRoomAccessories(
  room: Room,
  scale: ScaleCalibration | null,
  areaM2: number,
  materials: Material[],
  stripPlan?: StripPlanResult
): RoomAccessoriesCalculation {
  const accessories = room.accessories;
  
  // Find materials for each accessory type
  const findMaterial = (id?: string) => id ? materials.find(m => m.id === id) : undefined;
  
  const coving = calculateCoving(room, scale, findMaterial(accessories?.coving?.materialId));
  const coveFilletCorners = accessories?.coving?.enabled 
    ? calculateCoveFilletCorners(room, findMaterial(accessories?.coving?.materialId))
    : undefined;
  const weldRod = calculateWeldRod(room, stripPlan, findMaterial(accessories?.weldRod?.materialId));
  const smoothEdge = calculateSmoothEdge(room, scale, findMaterial(accessories?.smoothEdge?.materialId));
  const transitions = calculateTransitions(room, materials);
  const underlayment = calculateUnderlayment(room, areaM2, findMaterial(accessories?.underlayment?.materialId));
  const adhesive = calculateAdhesive(room, areaM2, findMaterial(accessories?.adhesive?.materialId));
  
  // Calculate total accessory cost
  let totalAccessoryCost = 0;
  if (coving) totalAccessoryCost += coving.totalCost;
  if (coveFilletCorners) totalAccessoryCost += coveFilletCorners.totalCost;
  if (weldRod) totalAccessoryCost += weldRod.totalCost;
  if (smoothEdge) totalAccessoryCost += smoothEdge.totalCost;
  if (transitions) totalAccessoryCost += transitions.reduce((sum, t) => sum + t.totalCost, 0);
  if (underlayment) totalAccessoryCost += underlayment.totalCost;
  if (adhesive) totalAccessoryCost += adhesive.totalCost;
  
  return {
    roomId: room.id,
    roomName: room.name,
    coving,
    coveFilletCorners,
    weldRod,
    smoothEdge,
    transitions,
    underlayment,
    adhesive,
    totalAccessoryCost,
  };
}

/**
 * Aggregate accessory costs across all rooms
 */
export function aggregateAccessoriesCosts(
  roomAccessories: RoomAccessoriesCalculation[]
): {
  totalCovingCost: number;
  totalCovingM: number;
  totalCoveFilletCost: number;
  totalCoveFilletCount: number;
  totalWeldRodCost: number;
  totalWeldRodM: number;
  totalSmoothEdgeCost: number;
  totalSmoothEdgeM: number;
  totalTransitionsCost: number;
  totalTransitionsCount: number;
  totalUnderlaymentCost: number;
  totalUnderlaymentM2: number;
  totalAdhesiveCost: number;
  totalAdhesiveUnits: number;
  grandTotal: number;
} {
  let totalCovingCost = 0;
  let totalCovingM = 0;
  let totalCoveFilletCost = 0;
  let totalCoveFilletCount = 0;
  let totalWeldRodCost = 0;
  let totalWeldRodM = 0;
  let totalSmoothEdgeCost = 0;
  let totalSmoothEdgeM = 0;
  let totalTransitionsCost = 0;
  let totalTransitionsCount = 0;
  let totalUnderlaymentCost = 0;
  let totalUnderlaymentM2 = 0;
  let totalAdhesiveCost = 0;
  let totalAdhesiveUnits = 0;
  
  for (const room of roomAccessories) {
    if (room.coving) {
      totalCovingCost += room.coving.totalCost;
      totalCovingM += room.coving.quantity;
    }
    if (room.coveFilletCorners) {
      totalCoveFilletCost += room.coveFilletCorners.totalCost;
      totalCoveFilletCount += room.coveFilletCorners.quantity;
    }
    if (room.weldRod) {
      totalWeldRodCost += room.weldRod.totalCost;
      totalWeldRodM += room.weldRod.totalSeamLengthM;
    }
    if (room.smoothEdge) {
      totalSmoothEdgeCost += room.smoothEdge.totalCost;
      totalSmoothEdgeM += room.smoothEdge.quantity;
    }
    if (room.transitions) {
      totalTransitionsCost += room.transitions.reduce((sum, t) => sum + t.totalCost, 0);
      totalTransitionsCount += room.transitions.length;
    }
    if (room.underlayment) {
      totalUnderlaymentCost += room.underlayment.totalCost;
      totalUnderlaymentM2 += room.underlayment.areaM2;
    }
    if (room.adhesive) {
      totalAdhesiveCost += room.adhesive.totalCost;
      totalAdhesiveUnits += room.adhesive.unitsNeeded;
    }
  }
  
  const grandTotal = totalCovingCost + totalCoveFilletCost + totalWeldRodCost + 
                     totalSmoothEdgeCost + totalTransitionsCost + totalUnderlaymentCost + totalAdhesiveCost;
  
  return {
    totalCovingCost,
    totalCovingM,
    totalCoveFilletCost,
    totalCoveFilletCount,
    totalWeldRodCost,
    totalWeldRodM,
    totalSmoothEdgeCost,
    totalSmoothEdgeM,
    totalTransitionsCost,
    totalTransitionsCount,
    totalUnderlaymentCost,
    totalUnderlaymentM2,
    totalAdhesiveCost,
    totalAdhesiveUnits,
    grandTotal,
  };
}
