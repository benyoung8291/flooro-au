export type DimensionUnit = 'm' | 'cm' | 'mm' | 'imperial';

export interface CanvasPoint {
  x: number;
  y: number;
}

// Edge curve types for curved/rounded edges
export type EdgeCurveType = 'straight' | 'quadratic';

export interface EdgeCurve {
  type: EdgeCurveType;
  controlPoint?: CanvasPoint; // For quadratic Bezier - single control point
}

// Room-level accessory configurations
export interface CovingConfig {
  enabled: boolean;
  heightMm: number;           // Typically 100mm (4")
  materialId?: string;        // Linked coving material
  excludeWalls?: number[];    // Wall indices to exclude (e.g., external walls)
}

export interface WeldRodConfig {
  enabled: boolean;
  colorMatch: boolean;
  materialId?: string;        // Linked weld rod material
}

export interface SmoothEdgeConfig {
  enabled: boolean;
  materialId?: string;        // Linked smooth edge/gripper material
  excludeWalls?: number[];    // Wall indices to exclude
  doubleRow?: boolean;        // Double row for heavy carpet or high traffic
}

export interface TransitionConfig {
  id: string;
  type: 'reducer' | 'threshold' | 't-molding' | 'end-cap' | 'stair-nose';
  doorId: string;             // Reference to which door this is for
  materialId?: string;        // Linked transition material
}

export interface UnderlaymentConfig {
  enabled: boolean;
  type: 'foam' | 'cork' | 'rubber' | 'plywood' | 'self-leveler' | 'none';
  materialId?: string;        // Linked underlayment material
}

export interface AdhesiveConfig {
  enabled: boolean;
  type: 'pressure-sensitive' | 'full-spread' | 'perimeter' | 'spray' | 'none';
  coverageRateM2PerUnit: number;  // m² per unit (e.g., 30 m²/bucket)
  materialId?: string;        // Linked adhesive material
}

// Edge transition configuration for material-to-material boundaries
export interface EdgeTransition {
  edgeIndex: number;              // Which edge (0-based, matches points array)
  adjacentRoomId?: string;        // Optional: linked room on other side
  adjacentRoomName?: string;      // Display name (for cases where room isn't drawn)
  transitionType: 'reducer' | 'threshold' | 't-molding' | 'end-cap' | 'ramp' | 'auto';
  materialId?: string;            // Transition strip material
  heightDifferenceMm?: number;    // Override calculated height diff
  notes?: string;                 // Installer notes
}

export interface RoomAccessories {
  coving?: CovingConfig;
  weldRod?: WeldRodConfig;
  smoothEdge?: SmoothEdgeConfig;
  transitions?: TransitionConfig[];
  underlayment?: UnderlaymentConfig;
  adhesive?: AdhesiveConfig;
}

export interface Room {
  id: string;
  name: string;
  points: CanvasPoint[];
  holes: Hole[];
  doors: Door[];
  materialId: string | null;
  color: string;
  accessories?: RoomAccessories;
  fillDirection?: number; // Lay direction in degrees (0 = horizontal, 90 = vertical)
  tilePattern?: 'grid' | 'brick' | 'thirds' | 'herringbone' | 'basketweave' | 'diagonal'; // For tile materials
  edgeTransitions?: EdgeTransition[]; // Edges that are transitions, not walls
  edgeCurves?: EdgeCurve[]; // Curve data per edge, indexed same as points
  
  // Seam management options
  seamOptions?: {
    firstSeamOffset?: number;      // Offset from starting edge (mm)
    manualSeams?: Array<{
      id: string;
      position: number;
      type: 'add' | 'lock';
    }>;
    avoidZones?: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      priority: 'hard' | 'soft';
    }>;
  };
}

export interface Hole {
  id: string;
  points: CanvasPoint[];
  edgeCurves?: EdgeCurve[]; // Curve data per edge, indexed same as points
}

export interface Door {
  id: string;
  position: CanvasPoint;
  width: number; // in mm
  wallIndex: number; // which wall segment the door is on
  rotation: number; // angle in degrees
}

export interface ScaleCalibration {
  pixelLength: number;
  realWorldLength: number; // in mm
  pixelsPerMm: number;
}

export interface BackgroundImage {
  url: string;
  opacity: number;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  locked: boolean;
}

// Floor plan page - each page contains its own rooms, background, and scale
export interface FloorPlanPage {
  id: string;
  name: string;
  sortOrder: number;
  backgroundImage: BackgroundImage | null;
  rooms: Room[];
  scale: ScaleCalibration | null;
}

// Project-specific material with optional overrides from source
export interface ProjectMaterial {
  id: string;                           // Unique ID for this project material
  sourceMaterialId?: string;            // Reference to original material (if imported from library)
  name: string;
  type: 'roll' | 'tile' | 'linear';
  subtype?: string;
  specs: Record<string, unknown>;       // Full specs (MaterialSpecs compatible)
  materialCode: string;                 // Project-specific code (e.g., "CP01", "FC02")
  isCustom: boolean;                    // True if created in project (not from database)
  overrides?: {                         // Track which fields were overridden from source
    price?: boolean;
    colour?: boolean;
    name?: boolean;
  };
}

export interface CanvasState {
  // Multi-page support
  pages?: FloorPlanPage[];
  activePageId?: string | null;
  
  // Project materials (per-project customized materials)
  projectMaterials?: ProjectMaterial[];
  
  // Legacy/active page data (maintained for compatibility)
  rooms: Room[];
  scale: ScaleCalibration | null;
  selectedRoomId: string | null;
  viewTransform: ViewTransform;
  backgroundImage: BackgroundImage | null;
}

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export type CanvasAction =
  | { type: 'ADD_ROOM'; room: Room }
  | { type: 'UPDATE_ROOM'; roomId: string; updates: Partial<Room> }
  | { type: 'DELETE_ROOM'; roomId: string }
  | { type: 'SELECT_ROOM'; roomId: string | null }
  | { type: 'ADD_HOLE'; roomId: string; hole: Hole }
  | { type: 'ADD_DOOR'; roomId: string; door: Door }
  | { type: 'SET_SCALE'; scale: ScaleCalibration }
  | { type: 'SET_VIEW_TRANSFORM'; transform: Partial<ViewTransform> }
  | { type: 'ASSIGN_MATERIAL'; roomId: string; materialId: string }
  | { type: 'SET_BACKGROUND_IMAGE'; image: BackgroundImage }
  | { type: 'UPDATE_BACKGROUND_IMAGE'; updates: Partial<BackgroundImage> }
  | { type: 'REMOVE_BACKGROUND_IMAGE' }
  | { type: 'LOAD_STATE'; state: CanvasState }
  | { type: 'RESET' };

export const DOOR_WIDTHS = [
  { label: "30\" (762mm)", value: 762 },
  { label: "32\" (813mm)", value: 813 },
  { label: "36\" (914mm)", value: 914 },
] as const;

export const DEFAULT_ROOM_COLOR = 'hsla(217, 91%, 50%, 0.15)';
export const MATERIAL_TYPE_COLORS: Record<string, string> = {
  roll: 'hsla(142, 71%, 45%, 0.2)',
  tile: 'hsla(280, 65%, 60%, 0.2)',
  linear: 'hsla(25, 95%, 53%, 0.2)',
};

// Snap settings for drawing tools
export interface SnapSettings {
  enabled: boolean;           // Master toggle for all snapping
  gridEnabled: boolean;       // Snap to grid
  gridSize: number;           // Grid size in mm (when scale is set) or pixels
  vertexSnapEnabled: boolean; // Snap to existing room corners
  axisSnapEnabled: boolean;   // Snap to axis-aligned lines
}

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  gridEnabled: true,
  gridSize: 100, // 100mm = 10cm grid
  vertexSnapEnabled: true,
  axisSnapEnabled: true,
};

// Snap result with type info
export interface SnapResult {
  point: CanvasPoint;
  type: 'vertex' | 'grid' | 'axis' | 'drawing';
  sourceRoomId?: string;
}
