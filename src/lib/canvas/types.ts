export interface CanvasPoint {
  x: number;
  y: number;
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
