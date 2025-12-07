/**
 * Labor rate categories by material/work type
 */
export type LaborCategory = 
  | 'roll_install'        // Carpet/vinyl roll installation
  | 'tile_install'        // Tile installation
  | 'plank_install'       // LVP/wood plank installation
  | 'coving_install'      // Coving/cove base installation
  | 'transition_install'  // Transitions and thresholds
  | 'floor_prep'          // Floor preparation
  | 'subfloor_repair'     // Subfloor repairs
  | 'removal'             // Removal of existing flooring
  | 'furniture_move'      // Furniture moving
  | 'pattern_match'       // Pattern matching premium
  | 'stairs'              // Stair installation
  | 'custom';             // Custom labor item

/**
 * Unit type for labor rates
 */
export type LaborUnit = 'm2' | 'linear_m' | 'unit' | 'hour' | 'fixed';

/**
 * Individual labor rate definition
 */
export interface LaborRate {
  id: string;
  category: LaborCategory;
  name: string;
  description?: string;
  rate: number;           // Cost per unit
  unit: LaborUnit;
  
  // Complexity multipliers
  complexityMultipliers?: {
    simple?: number;      // e.g., 0.9 for simple rooms
    standard?: number;    // e.g., 1.0 default
    complex?: number;     // e.g., 1.3 for complex shapes
    difficult?: number;   // e.g., 1.5 for very difficult
  };
  
  // Material type applicability
  applicableMaterialTypes?: string[]; // 'roll', 'tile', 'linear', etc.
}

/**
 * Project-level labor configuration
 */
export interface ProjectLaborConfig {
  // Installation rates per m²
  rollInstallRate: number;
  tileInstallRate: number;
  plankInstallRate: number;
  
  // Linear rates per meter
  covingInstallRate: number;
  transitionInstallRate: number; // per unit
  
  // Preparation rates per m²
  floorPrepRate: number;
  subfloorRepairRate: number;
  removalRate: number;
  
  // Hourly rates
  generalLaborRate: number;
  
  // Multipliers
  stairsMultiplier: number;     // e.g., 2.0 for stairs
  patternMultiplier: number;    // e.g., 1.15 for pattern matching
  
  // Business settings
  marginPercent: number;        // Profit margin %
  overheadPercent: number;      // Overhead %
  
  // Flags
  includeRemoval: boolean;
  includeFloorPrep: boolean;
  includeFurnitureMove: boolean;
}

/**
 * Room-level labor calculation
 */
export interface RoomLaborCalculation {
  roomId: string;
  roomName: string;
  areaM2: number;
  perimeterM: number;
  
  // Installation
  installationCost: number;
  installationRate: number;
  installationUnit: LaborUnit;
  
  // Preparation (if applicable)
  prepCost: number;
  removalCost: number;
  
  // Accessories labor
  covingLaborCost: number;
  transitionLaborCost: number;
  
  // Complexity adjustment
  complexityFactor: number;
  adjustedInstallationCost: number;
  
  // Total for this room
  totalLaborCost: number;
}

/**
 * Complete project cost breakdown
 */
export interface ProjectCostBreakdown {
  // Material costs
  materials: {
    flooring: number;
    accessories: number;
    sundries: number;
    subtotal: number;
  };
  
  // Labor costs
  labor: {
    installation: number;
    preparation: number;
    removal: number;
    accessories: number;
    subtotal: number;
  };
  
  // Additional costs
  additional: {
    delivery: number;
    waste: number;
    contingency: number;
    subtotal: number;
  };
  
  // Business calculations
  subtotal: number;
  overheadAmount: number;
  overheadPercent: number;
  marginAmount: number;
  marginPercent: number;
  
  // Final totals
  totalBeforeTax: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  
  // Per-room breakdown
  roomBreakdowns: RoomLaborCalculation[];
  
  // Summary metrics
  costPerM2: number;
  totalAreaM2: number;
}

/**
 * Default labor rates (can be customized per organization)
 */
export const DEFAULT_LABOR_RATES: ProjectLaborConfig = {
  // Installation rates ($ per m²)
  rollInstallRate: 12.00,
  tileInstallRate: 25.00,
  plankInstallRate: 18.00,
  
  // Linear rates
  covingInstallRate: 8.00,    // per linear meter
  transitionInstallRate: 15.00, // per unit
  
  // Preparation rates ($ per m²)
  floorPrepRate: 5.00,
  subfloorRepairRate: 15.00,
  removalRate: 8.00,
  
  // Hourly rate
  generalLaborRate: 45.00,
  
  // Multipliers
  stairsMultiplier: 2.0,
  patternMultiplier: 1.15,
  
  // Business settings
  marginPercent: 25,
  overheadPercent: 15,
  
  // Flags
  includeRemoval: false,
  includeFloorPrep: true,
  includeFurnitureMove: false,
};

/**
 * Complexity levels for rooms
 */
export type RoomComplexity = 'simple' | 'standard' | 'complex' | 'difficult';

/**
 * Get complexity multiplier
 */
export function getComplexityMultiplier(complexity: RoomComplexity): number {
  const multipliers: Record<RoomComplexity, number> = {
    simple: 0.9,
    standard: 1.0,
    complex: 1.3,
    difficult: 1.5,
  };
  return multipliers[complexity];
}
