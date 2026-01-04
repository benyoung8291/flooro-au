import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { calculateRoomNetArea, pixelAreaToRealArea, mmSquaredToMSquared, calculatePerimeter } from '@/lib/canvas/geometry';
import { Material, MaterialSpecs, QuantityRoundingMode } from '@/hooks/useMaterials';
import { 
  calculateStripPlan, 
  extractRollMaterialSpecs,
  StripPlanResult,
  MultiRoomStripPlan 
} from '@/lib/rollGoods';
import { 
  analyzeRoomComplexity, 
  suggestWastePercent, 
  WastageSuggestion, 
  WasteOverrides,
  ComplexityMetrics 
} from './wasteCalculator';

export interface RoomCalculation {
  roomId: string;
  roomName: string;
  materialId: string | null;
  materialName: string | null;
  materialType: string | null;
  netAreaM2: number;
  grossAreaM2: number;
  wastePercent: number;
  perimeterM: number;
  doorDeductionM: number;
  netPerimeterM: number;
  unitPrice: number;
  totalCost: number;
  quantity: number;
  unit: string;
  // Roll goods specific
  stripPlan?: StripPlanResult;
  // Box/packaging specific
  boxesNeeded?: number;
  tilesPerBox?: number;
  boxCoverageM2?: number;
}

export interface ReportSummary {
  totalNetArea: number;
  totalGrossArea: number;
  totalPerimeter: number;
  totalCost: number;
  roomCalculations: RoomCalculation[];
  materialSummary: MaterialSummaryItem[];
  // Roll goods aggregation
  rollGoodsPlans: Map<string, MultiRoomStripPlan>;
  // Wastage suggestions per material
  wasteSuggestions: Map<string, WastageSuggestion & { metrics: ComplexityMetrics }>;
}

export interface MaterialSummaryItem {
  materialId: string;
  materialName: string;
  materialType: string;
  totalArea: number;
  totalQuantity: number;
  unitPrice: number;
  totalCost: number;
  unit: string;
  // Roll goods specific
  utilizationPercent?: number;
  wastePercent?: number;
}

// Get waste percentage from material specs
function getWastePercent(specs: MaterialSpecs): number {
  return specs.wastePercent || (specs.waste_percent as number) || 10;
}

// Get primary unit price from material specs (for tiles/linear)
function getPrimaryPrice(specs: MaterialSpecs): number {
  return specs.pricePerM2 || specs.price || 0;
}

// Get tile area in m² from mm dimensions
function getTileAreaM2(specs: MaterialSpecs): number {
  // Use new mm dimensions if available
  if (specs.widthMm && specs.lengthMm) {
    return (specs.widthMm / 1000) * (specs.lengthMm / 1000);
  }
  // Legacy: width/height in mm
  const tileWidth = ((specs.width as number) || 300) / 1000;
  const tileHeight = ((specs.height as number) || 300) / 1000;
  return tileWidth * tileHeight;
}

// Calculate door width deductions in mm
function calculateDoorDeductions(room: Room): number {
  return room.doors.reduce((total, door) => total + door.width, 0);
}

// Helper to round based on rounding mode
function roundQuantity(value: number, mode: QuantityRoundingMode): number {
  switch (mode) {
    case 'up':
      return Math.ceil(value);
    case 'down':
      return Math.floor(value);
    case 'nearest':
      return Math.round(value);
  }
}

// Calculate cost for a single room based on material type
export function calculateRoomCost(
  room: Room,
  material: Material | null,
  scale: ScaleCalibration | null,
  roundingMode: QuantityRoundingMode = 'up',
  wasteOverride?: number // Optional override for waste percentage
): RoomCalculation {
  const netAreaPixels = calculateRoomNetArea(room);
  const netAreaMm2 = pixelAreaToRealArea(netAreaPixels, scale);
  const netAreaM2 = mmSquaredToMSquared(netAreaMm2);
  
  const perimeterPixels = calculatePerimeter(room.points);
  const perimeterMm = scale ? perimeterPixels * (1 / scale.pixelsPerMm) : perimeterPixels;
  const perimeterM = perimeterMm / 1000;
  
  const doorDeductionMm = calculateDoorDeductions(room);
  const doorDeductionM = doorDeductionMm / 1000;
  const netPerimeterM = Math.max(0, perimeterM - doorDeductionM);
  
  if (!material) {
    return {
      roomId: room.id,
      roomName: room.name,
      materialId: null,
      materialName: null,
      materialType: null,
      netAreaM2,
      grossAreaM2: netAreaM2,
      wastePercent: 0,
      perimeterM,
      doorDeductionM,
      netPerimeterM,
      unitPrice: 0,
      totalCost: 0,
      quantity: 0,
      unit: 'm²',
    };
  }
  
  // Use override if provided, otherwise use material default
  const wastePercent = wasteOverride !== undefined ? wasteOverride : getWastePercent(material.specs);
  const wasteFactor = 1 + wastePercent / 100;
  const unitPrice = getPrimaryPrice(material.specs);
  
  let grossAreaM2 = netAreaM2;
  let totalCost = 0;
  let quantity = 0;
  let unit = 'm²';
  let stripPlan: StripPlanResult | undefined;
  
  switch (material.type) {
    case 'roll': {
      // Use Greedy Strip algorithm for roll goods
      const rollSpecs = extractRollMaterialSpecs(material.specs as Record<string, unknown>);
      stripPlan = calculateStripPlan(room, rollSpecs, scale);
      
      grossAreaM2 = stripPlan.totalMaterialAreaM2;
      quantity = grossAreaM2;
      totalCost = stripPlan.materialCost;
      unit = 'm²';
      
      return {
        roomId: room.id,
        roomName: room.name,
        materialId: material.id,
        materialName: material.name,
        materialType: material.type,
        netAreaM2,
        grossAreaM2,
        wastePercent: stripPlan.wastePercent,
        perimeterM,
        doorDeductionM,
        netPerimeterM,
        unitPrice,
        totalCost,
        quantity,
        unit,
        stripPlan,
      };
    }
      
    case 'tile': {
      // Tiles: count = area / tile area, then add waste
      // Use mm dimensions for precision
      const tileAreaM2 = getTileAreaM2(material.specs);
      const rawTileCount = (netAreaM2 / tileAreaM2) * wasteFactor;
      
      // Check if sold in boxes
      const tilesPerBox = material.specs.tilesPerBox;
      if (tilesPerBox && tilesPerBox > 0) {
        // Calculate box coverage
        const boxCoverageM2 = material.specs.boxCoverageM2 || (tileAreaM2 * tilesPerBox);
        const rawBoxCount = rawTileCount / tilesPerBox;
        const boxCount = roundQuantity(rawBoxCount, roundingMode);
        
        const tileCount = boxCount * tilesPerBox;
        grossAreaM2 = tileCount * tileAreaM2;
        quantity = boxCount;
        
        // Use box price if available, otherwise calculate from m² price
        const boxPrice = material.specs.pricePerBox || (unitPrice * boxCoverageM2);
        totalCost = boxCount * boxPrice;
        unit = 'boxes';
        
        return {
          roomId: room.id,
          roomName: room.name,
          materialId: material.id,
          materialName: material.name,
          materialType: material.type,
          netAreaM2,
          grossAreaM2,
          wastePercent,
          perimeterM,
          doorDeductionM,
          netPerimeterM,
          unitPrice: boxPrice,
          totalCost,
          quantity,
          unit,
          boxesNeeded: boxCount,
          tilesPerBox,
          boxCoverageM2,
        };
      }
      
      // Not sold in boxes - use individual tiles
      const tileCount = Math.ceil(rawTileCount);
      grossAreaM2 = tileCount * tileAreaM2;
      quantity = tileCount;
      totalCost = tileCount * unitPrice;
      unit = 'tiles';
      break;
    }
      
    case 'linear': {
      // Linear (baseboards): perimeter minus doors
      grossAreaM2 = netPerimeterM * wasteFactor;
      quantity = grossAreaM2;
      totalCost = grossAreaM2 * unitPrice;
      unit = 'm';
      break;
    }
  }
  
  return {
    roomId: room.id,
    roomName: room.name,
    materialId: material.id,
    materialName: material.name,
    materialType: material.type,
    netAreaM2,
    grossAreaM2,
    wastePercent,
    perimeterM,
    doorDeductionM,
    netPerimeterM,
    unitPrice,
    totalCost,
    quantity,
    unit,
    stripPlan,
  };
}

// Helper function to get room area in m² for wastage calculations
function getRoomAreaM2(room: Room, scale: ScaleCalibration | null): number {
  const netAreaPixels = calculateRoomNetArea(room);
  const netAreaMm2 = pixelAreaToRealArea(netAreaPixels, scale);
  return mmSquaredToMSquared(netAreaMm2);
}

// Generate full report for all rooms
export function generateReport(
  rooms: Room[],
  materials: Material[],
  scale: ScaleCalibration | null,
  roundingMode: QuantityRoundingMode = 'up',
  wasteOverrides?: WasteOverrides
): ReportSummary {
  const materialMap = new Map(materials.map(m => [m.id, m]));
  
  // Calculate wastage suggestions for each material
  const wasteSuggestions = new Map<string, WastageSuggestion & { metrics: ComplexityMetrics }>();
  const uniqueMaterialIds = [...new Set(rooms.map(r => r.materialId).filter(Boolean))] as string[];
  
  for (const materialId of uniqueMaterialIds) {
    const metrics = analyzeRoomComplexity(rooms, materialId, (room) => getRoomAreaM2(room, scale));
    const suggestion = suggestWastePercent({
      totalAreaM2: metrics.totalAreaM2,
      roomCount: metrics.roomCount,
      averageRoomAreaM2: metrics.averageRoomAreaM2,
      totalVertices: metrics.totalVertices,
      totalHoles: metrics.totalHoles,
      totalDoors: metrics.totalDoors,
    });
    wasteSuggestions.set(materialId, { ...suggestion, metrics });
  }
  
  const roomCalculations = rooms.map(room => {
    const material = room.materialId ? materialMap.get(room.materialId) || null : null;
    // Get waste override for this material if set
    const wasteOverride = room.materialId && wasteOverrides ? wasteOverrides[room.materialId] : undefined;
    return calculateRoomCost(room, material, scale, roundingMode, wasteOverride);
  });
  
  // Aggregate by material
  const materialAggregates = new Map<string, MaterialSummaryItem>();
  const rollGoodsPlans = new Map<string, MultiRoomStripPlan>();
  
  for (const calc of roomCalculations) {
    if (!calc.materialId) continue;
    
    const existing = materialAggregates.get(calc.materialId);
    if (existing) {
      existing.totalArea += calc.grossAreaM2;
      existing.totalQuantity += calc.quantity;
      existing.totalCost += calc.totalCost;
      
      // Update utilization for roll goods
      if (calc.stripPlan && existing.wastePercent !== undefined) {
        const totalWaste = (existing.wastePercent * existing.totalArea + calc.stripPlan.wastePercent * calc.grossAreaM2) / 
          (existing.totalArea + calc.grossAreaM2);
        existing.wastePercent = totalWaste;
        existing.utilizationPercent = 100 - totalWaste;
      }
    } else {
      const summaryItem: MaterialSummaryItem = {
        materialId: calc.materialId,
        materialName: calc.materialName || '',
        materialType: calc.materialType || '',
        totalArea: calc.grossAreaM2,
        totalQuantity: calc.quantity,
        unitPrice: calc.unitPrice,
        totalCost: calc.totalCost,
        unit: calc.unit,
      };
      
      // Add utilization info for roll goods
      if (calc.stripPlan) {
        summaryItem.wastePercent = calc.stripPlan.wastePercent;
        summaryItem.utilizationPercent = calc.stripPlan.utilizationPercent;
      }
      
      materialAggregates.set(calc.materialId, summaryItem);
    }
  }
  
  return {
    totalNetArea: roomCalculations.reduce((sum, r) => sum + r.netAreaM2, 0),
    totalGrossArea: roomCalculations.reduce((sum, r) => sum + r.grossAreaM2, 0),
    totalPerimeter: roomCalculations.reduce((sum, r) => sum + r.netPerimeterM, 0),
    totalCost: roomCalculations.reduce((sum, r) => sum + r.totalCost, 0),
    roomCalculations,
    materialSummary: Array.from(materialAggregates.values()),
    rollGoodsPlans,
    wasteSuggestions,
  };
}

// Re-export for convenience
export { analyzeRoomComplexity, suggestWastePercent };
export type { WastageSuggestion, WasteOverrides, ComplexityMetrics };

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

// Format area
export function formatArea(value: number): string {
  return `${value.toFixed(2)} m²`;
}

// Format length
export function formatLength(value: number): string {
  return `${value.toFixed(2)} m`;
}
