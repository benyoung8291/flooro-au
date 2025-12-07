export interface CanvasPoint {
  x: number;
  y: number;
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
  materialCode?: string; // Project-specific reference code (e.g., "CP01", "FC07") for finishes schedules
  color: string;
  accessories?: RoomAccessories;
  fillDirection?: number; // Lay direction in degrees (0 = horizontal, 90 = vertical)
  tilePattern?: 'grid' | 'brick' | 'thirds' | 'herringbone' | 'basketweave' | 'diagonal'; // For tile materials
  
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

export interface CanvasState {
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
