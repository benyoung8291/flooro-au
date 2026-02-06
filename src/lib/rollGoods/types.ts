import { CanvasPoint } from '@/lib/canvas/types';

/**
 * Material specifications for roll goods
 * Enhanced to support dual pricing (roll vs cut) and mm dimensions
 */
export interface RollMaterialSpecs {
  width: number; // Roll width in mm
  rollLengthM?: number; // Roll length in meters (for full roll pricing)
  patternRepeat: number; // Pattern repeat length in mm (0 for no pattern)
  
  // Pricing options (use whichever is applicable)
  pricePerM2?: number; // Price per m² (standard)
  pricePerRoll?: number; // Full roll price
  pricePerLinearM?: number; // Cut price per linear meter
  
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
  rotation: number; // Rotation angle in degrees (0-359)
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

  // Enhanced properties for interactive editing
  position?: number;      // Position along perpendicular axis (for dragging)
  isLocked?: boolean;     // Whether this seam is locked in place
  isManual?: boolean;     // Whether this was manually placed
  inAvoidZone?: boolean;  // Warning: seam is in an avoid zone
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
  layoutDirection: 'horizontal' | 'vertical' | 'diagonal';
  fillAngle?: number; // The actual angle used (0-359 degrees)
  
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
  
  // Cost breakdown
  materialCost: number;
  pricingMethod: 'per_m2' | 'per_roll' | 'per_linear_m' | 'mixed';
  fullRolls?: number;
  cutLengthM?: number;
  rollCost?: number;
  cutCost?: number;
}

/**
 * Options for the strip planning algorithm
 */
export interface StripPlanOptions {
  // Force a specific layout direction
  forcedDirection?: 'horizontal' | 'vertical';
  
  // Fill direction in degrees (0 = horizontal, 90 = vertical)
  fillDirection?: number;
  
  // Minimum overlap for pattern matching (mm)
  patternMatchOverlap?: number;
  
  // Maximum strip length (for practical installation, default: no limit)
  maxStripLength?: number;
  
  // Whether to optimize for minimal seams vs minimal waste
  optimizeFor?: 'seams' | 'waste';
  
  // Advanced seam control options
  seamOffset?: number;           // Minimum distance from walls (mm)
  avoidSeamZones?: AvoidZone[];  // Areas to avoid seams
  manualSeams?: SeamOverride[];  // User-defined seam positions
  
  // First seam position offset from starting edge (mm)
  firstSeamOffset?: number;

  // Override waste percentage (from report-level settings)
  wasteOverride?: number;
}

/**
 * Zone to avoid placing seams
 */
export interface AvoidZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: 'hard' | 'soft';  // Hard = never place seam, Soft = avoid if possible
}

/**
 * Manual seam override
 */
export interface SeamOverride {
  id: string;
  position: number;      // Position in mm from left/top edge
  type: 'add' | 'lock';  // Add = force seam here, Lock = prevent moving this seam
}

/**
 * Seam placement analysis result
 */
export interface SeamAnalysis {
  seamId: string;
  position: number;
  inDoorway: boolean;
  nearDoorway: boolean;
  doorwayDistance?: number;
  inAvoidZone: boolean;
  avoidZoneId?: string;
  recommendation: 'optimal' | 'acceptable' | 'warning' | 'critical';
  message?: string;
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
