import { CanvasPoint } from '@/lib/canvas/types';

/**
 * Supported tile layout patterns
 */
export type TilePattern = 
  | 'grid'           // Standard grid aligned
  | 'brick'          // 1/2 offset (running bond)
  | 'thirds'         // 1/3 offset
  | 'herringbone'    // 45° or 90° herringbone
  | 'basketweave'    // Alternating pairs
  | 'diagonal';      // 45° rotated grid

/**
 * Tile dimensions and specifications
 */
export interface TileSpecs {
  widthMm: number;        // Tile width in mm
  lengthMm: number;       // Tile length in mm
  groutWidthMm: number;   // Grout line width in mm
  pricePerTile?: number;  // Price per individual tile
  pricePerM2?: number;    // Price per m²
  tilesPerBox?: number;   // Tiles per box for purchasing
  pricePerBox?: number;   // Price per box
}

/**
 * Individual tile position in the layout
 */
export interface TilePosition {
  id: string;
  x: number;              // X position in mm from room origin
  y: number;              // Y position in mm from room origin
  width: number;          // Actual width after any cuts
  height: number;         // Actual height after any cuts
  rotation: number;       // Rotation in degrees
  isCut: boolean;         // Whether this tile was cut
  cutType?: 'edge' | 'corner' | 'complex'; // Type of cut needed
  originalArea: number;   // Original tile area in mm²
  usedArea: number;       // Area actually used in mm²
  wasteArea: number;      // Wasted area from this tile
}

/**
 * Cut line for visualization
 */
export interface TileCutLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tileId: string;
}

/**
 * Grout line for visualization
 */
export interface GroutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  orientation: 'horizontal' | 'vertical' | 'diagonal';
}

/**
 * Result of tile layout calculation
 */
export interface TileLayoutResult {
  pattern: TilePattern;
  rotation: number;        // Overall pattern rotation
  
  // Tile counts
  fullTiles: number;       // Number of full (uncut) tiles
  cutTiles: number;        // Number of tiles that need cutting
  totalTiles: number;      // Total tiles needed (full + cut)
  
  // Area calculations (in m²)
  roomAreaM2: number;      // Room area
  tileAreaM2: number;      // Total tile area before cuts
  wasteFromCutsM2: number; // Waste from edge cuts
  
  // Purchasing
  tilesNeeded: number;     // Total tiles to purchase (accounts for cuts)
  boxesNeeded?: number;    // Boxes to purchase if applicable
  
  // Grout calculations
  groutLinearM: number;    // Total grout line length
  groutAreaM2: number;     // Grout coverage area
  
  // Visual layout data
  tilePositions: TilePosition[];
  cutLines: TileCutLine[];
  groutLines: GroutLine[];
  
  // Cost
  materialCost: number;
  groutCost?: number;
  
  // Efficiency
  utilizationPercent: number;
}

/**
 * Options for tile layout calculation
 */
export interface TileLayoutOptions {
  pattern: TilePattern;
  rotation?: number;       // Pattern rotation (0, 45, 90, etc.)
  startCorner?: 'tl' | 'tr' | 'bl' | 'br'; // Starting corner
  centerTiles?: boolean;   // Center the pattern in the room
  groutWidthMm?: number;   // Override grout width
}

/**
 * Bounding box for room
 */
export interface TileBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}
