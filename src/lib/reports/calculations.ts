import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { calculateRoomNetArea, pixelAreaToRealArea, mmSquaredToMSquared, calculatePerimeter } from '@/lib/canvas/geometry';
import { Material, MaterialSpecs } from '@/hooks/useMaterials';
import { 
  calculateStripPlan, 
  extractRollMaterialSpecs,
  StripPlanResult,
  MultiRoomStripPlan 
} from '@/lib/rollGoods';

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
  return (specs.waste_percent as number) || (specs.wastePercent as number) || 10;
}

// Calculate door width deductions in mm
function calculateDoorDeductions(room: Room): number {
  return room.doors.reduce((total, door) => total + door.width, 0);
}

// Calculate cost for a single room based on material type
export function calculateRoomCost(
  room: Room,
  material: Material | null,
  scale: ScaleCalibration | null
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
  
  const wastePercent = getWastePercent(material.specs);
  const wasteFactor = 1 + wastePercent / 100;
  const unitPrice = material.specs.price || 0;
  
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
      const tileWidth = (material.specs.width || 300) / 1000; // mm to m
      const tileHeight = (material.specs.height || 300) / 1000;
      const tileAreaM2 = tileWidth * tileHeight;
      const tileCount = Math.ceil((netAreaM2 / tileAreaM2) * wasteFactor);
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

// Generate full report for all rooms
export function generateReport(
  rooms: Room[],
  materials: Material[],
  scale: ScaleCalibration | null
): ReportSummary {
  const materialMap = new Map(materials.map(m => [m.id, m]));
  
  const roomCalculations = rooms.map(room => {
    const material = room.materialId ? materialMap.get(room.materialId) || null : null;
    return calculateRoomCost(room, material, scale);
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
  };
}

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
