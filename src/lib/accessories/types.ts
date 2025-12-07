// Accessory material subtypes
export type AccessorySubtype = 
  | 'coving_strip'
  | 'cove_fillet'
  | 'weld_rod'
  | 'smooth_edge'
  | 'gripper_strip'
  | 'transition_reducer'
  | 'transition_threshold'
  | 'transition_t_molding'
  | 'transition_end_cap'
  | 'transition_stair_nose'
  | 'underlayment_foam'
  | 'underlayment_cork'
  | 'underlayment_rubber'
  | 'underlayment_plywood'
  | 'adhesive_bucket'
  | 'adhesive_cartridge'
  | 'adhesive_spray';

// Accessory material specifications
export interface AccessorySpecs {
  // For linear accessories (coving, weld rod, transitions)
  pricePerLinearM?: number;
  lengthPerUnitM?: number;      // e.g., 50m roll of weld rod
  
  // For area accessories (underlayment, adhesive)
  coverageM2PerUnit?: number;   // e.g., 30 m² per bucket
  pricePerUnit?: number;
  unitsPerBox?: number;
  
  // For coving/fillet
  covingHeightMm?: number;
  filletRadiusMm?: number;
  pricePerCorner?: number;      // For cove fillet corners
  
  // Color matching
  colorOptions?: string[];
  
  // Linkable parent materials
  compatibleWithTypes?: ('roll' | 'tile')[];
  compatibleWithSubtypes?: string[];
  
  // Standard material metadata
  imageUrl?: string;
  manufacturerUrl?: string;
  sku?: string;
  manufacturer?: string;
}

// Calculation result for a single accessory
export interface AccessoryCalculation {
  accessoryType: 'coving' | 'cove_fillet' | 'weld_rod' | 'smooth_edge' | 'transition' | 'underlayment' | 'adhesive';
  materialId?: string;
  materialName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  details?: string;
}

// Complete accessories breakdown for a room
export interface RoomAccessoriesCalculation {
  roomId: string;
  roomName: string;
  
  // Individual calculations
  coving?: AccessoryCalculation & {
    wallPerimeterM: number;
    excludedLengthM: number;
  };
  coveFilletCorners?: AccessoryCalculation & {
    internalCorners: number;
    externalCorners: number;
  };
  weldRod?: AccessoryCalculation & {
    totalSeamLengthM: number;
  };
  smoothEdge?: AccessoryCalculation & {
    wallPerimeterM: number;
    excludedLengthM: number;
    isDoubleRow: boolean;
  };
  transitions?: AccessoryCalculation[];
  underlayment?: AccessoryCalculation & {
    areaM2: number;
  };
  adhesive?: AccessoryCalculation & {
    areaM2: number;
    unitsNeeded: number;
  };
  
  // Total cost for all accessories
  totalAccessoryCost: number;
}

// Accessory type display info
export const ACCESSORY_TYPES = {
  coving: {
    label: 'Wall Coving',
    description: 'Vinyl coving strip for wall/floor junction (sheet vinyl only)',
    unit: 'm',
    defaultHeightMm: 100,
  },
  cove_fillet: {
    label: 'Cove Fillet',
    description: 'Pre-formed corners for coving (internal/external)',
    unit: 'pcs',
  },
  weld_rod: {
    label: 'Weld Rod',
    description: 'Heat-welded seam sealer for sheet vinyl',
    unit: 'm',
  },
  smooth_edge: {
    label: 'Smooth Edge / Gripper',
    description: 'Tack strip for stretched broadloom carpet installation',
    unit: 'm',
    defaultPricePerM: 3.50,
  },
  transition: {
    label: 'Transitions',
    description: 'Door thresholds and floor transitions',
    unit: 'pcs',
  },
  underlayment: {
    label: 'Underlayment',
    description: 'Subfloor preparation material',
    unit: 'm²',
  },
  adhesive: {
    label: 'Adhesive',
    description: 'Floor covering adhesive',
    unit: 'units',
  },
} as const;

// Transition type display info
export const TRANSITION_TYPES = {
  reducer: { label: 'Reducer', description: 'Transitions to lower floor' },
  threshold: { label: 'Threshold', description: 'Standard door threshold' },
  't-molding': { label: 'T-Molding', description: 'Same-height transition' },
  'end-cap': { label: 'End Cap', description: 'Exposed edge finish' },
  'stair-nose': { label: 'Stair Nose', description: 'Step edge protection' },
} as const;

// Underlayment type options
export const UNDERLAYMENT_TYPES = {
  foam: { label: 'Foam', description: 'Standard foam underlay' },
  cork: { label: 'Cork', description: 'Natural cork underlay' },
  rubber: { label: 'Rubber', description: 'Acoustic rubber underlay' },
  plywood: { label: 'Plywood', description: 'Plywood subfloor' },
  'self-leveler': { label: 'Self-Leveler', description: 'Leveling compound' },
  none: { label: 'None', description: 'No underlayment required' },
} as const;

// Adhesive type options
export const ADHESIVE_TYPES = {
  'pressure-sensitive': { label: 'Pressure Sensitive', description: 'Releasable adhesive', defaultCoverage: 30 },
  'full-spread': { label: 'Full Spread', description: 'Permanent adhesive', defaultCoverage: 25 },
  perimeter: { label: 'Perimeter', description: 'Edge-only adhesive', defaultCoverage: 50 },
  spray: { label: 'Spray', description: 'Spray adhesive', defaultCoverage: 15 },
  none: { label: 'None', description: 'No adhesive (loose-lay)', defaultCoverage: 0 },
} as const;
