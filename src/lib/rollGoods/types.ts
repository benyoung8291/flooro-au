import { CanvasPoint } from '@/lib/canvas/types';

/**
 * Material specifications for roll goods
 */
export interface RollMaterialSpecs {
  width: number; // Roll width in mm
  patternRepeat: number; // Pattern repeat length in mm (0 for no pattern)
  price: number; // Price per m²
  wastePercent: number; // Additional waste factor percentage
}

/**
 * Bounding box of a room
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * A strip represents one piece of roll material laid in the room
 */
export interface Strip {
  id: string;
  x: number; // Position in room (in mm from left edge)
  y: number; // Position in room (in mm from top edge)
  width: number; // Strip width (roll width) in mm
  length: number; // Strip length (cut length) in mm
  patternOffset: number; // Offset for pattern matching in mm
  rotation: 0 | 90; // 0 = parallel to length, 90 = perpendicular
}

/**
 * A seam line where two strips meet
 */
export interface SeamLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'primary' | 'cross'; // Primary = along strip length, cross = perpendicular join
}

/**
 * Result of the Greedy Strip algorithm
 */
export interface StripPlanResult {
  roomId: string;
  roomName: string;
  
  // Layout
  strips: Strip[];
  seamLines: SeamLine[];
  layoutDirection: 'horizontal' | 'vertical';
  
  // Measurements (all in mm unless specified)
  roomBoundingBox: BoundingBox;
  roomAreaMm2: number;
  roomAreaM2: number;
  
  // Material requirements
  totalRollLengthMm: number; // Total length of roll material needed
  totalRollLengthM: number;
  totalMaterialAreaMm2: number;
  totalMaterialAreaM2: number;
  
  // Waste calculation
  wasteAreaMm2: number;
  wasteAreaM2: number;
  wastePercent: number;
  
  // Efficiency
  utilizationPercent: number;
  
  // Cost
  materialCost: number;
}

/**
 * Options for the strip planning algorithm
 */
export interface StripPlanOptions {
  // Force a specific layout direction
  forcedDirection?: 'horizontal' | 'vertical';
  
  // Minimum overlap for pattern matching (mm)
  patternMatchOverlap?: number;
  
  // Maximum strip length (for practical installation, default: no limit)
  maxStripLength?: number;
  
  // Whether to optimize for minimal seams vs minimal waste
  optimizeFor?: 'seams' | 'waste';
}

/**
 * Combined results for multiple rooms
 */
export interface MultiRoomStripPlan {
  roomPlans: StripPlanResult[];
  
  // Totals
  totalRoomAreaM2: number;
  totalMaterialAreaM2: number;
  totalWasteAreaM2: number;
  totalWastePercent: number;
  totalCost: number;
  
  // Efficiency
  overallUtilizationPercent: number;
}
