import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { calculateRoomNetArea, pixelAreaToRealArea, mmSquaredToMSquared } from '@/lib/canvas/geometry';
import {
  TilePattern,
  TileSpecs,
  TilePosition,
  TileCutLine,
  GroutLine,
  TileLayoutResult,
  TileLayoutOptions,
  TileBoundingBox,
} from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Calculate bounding box of room in mm
 */
function calculateBoundingBox(
  room: Room,
  scale: ScaleCalibration | null
): TileBoundingBox {
  if (room.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of room.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const toMm = (pixels: number) => {
    if (!scale || scale.pixelsPerMm === 0) return pixels;
    return pixels / scale.pixelsPerMm;
  };

  return {
    minX: 0,
    minY: 0,
    maxX: toMm(maxX - minX),
    maxY: toMm(maxY - minY),
    width: toMm(maxX - minX),
    height: toMm(maxY - minY),
  };
}

/**
 * Check if a point is inside the room polygon (simplified rectangular check)
 */
function isPointInRoom(x: number, y: number, bbox: TileBoundingBox): boolean {
  return x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY;
}

/**
 * Calculate grid pattern layout
 */
function calculateGridPattern(
  bbox: TileBoundingBox,
  tileWidth: number,
  tileHeight: number,
  groutWidth: number,
  options: TileLayoutOptions
): { tiles: TilePosition[]; groutLines: GroutLine[] } {
  const tiles: TilePosition[] = [];
  const groutLines: GroutLine[] = [];
  
  const effectiveTileWidth = tileWidth + groutWidth;
  const effectiveTileHeight = tileHeight + groutWidth;
  
  // Calculate offset for centering
  let offsetX = 0;
  let offsetY = 0;
  
  if (options.centerTiles) {
    const tilesAcross = Math.ceil(bbox.width / effectiveTileWidth);
    const tilesDown = Math.ceil(bbox.height / effectiveTileHeight);
    offsetX = (bbox.width - (tilesAcross * effectiveTileWidth - groutWidth)) / 2;
    offsetY = (bbox.height - (tilesDown * effectiveTileHeight - groutWidth)) / 2;
  }
  
  // Generate tiles
  for (let y = -effectiveTileHeight; y < bbox.height + effectiveTileHeight; y += effectiveTileHeight) {
    for (let x = -effectiveTileWidth; x < bbox.width + effectiveTileWidth; x += effectiveTileWidth) {
      const tileX = x + offsetX;
      const tileY = y + offsetY;
      
      // Check if tile overlaps with room
      const tileRight = tileX + tileWidth;
      const tileBottom = tileY + tileHeight;
      
      if (tileRight <= bbox.minX || tileX >= bbox.maxX ||
          tileBottom <= bbox.minY || tileY >= bbox.maxY) {
        continue;
      }
      
      // Calculate actual dimensions after edge cuts
      const actualX = Math.max(tileX, bbox.minX);
      const actualY = Math.max(tileY, bbox.minY);
      const actualRight = Math.min(tileRight, bbox.maxX);
      const actualBottom = Math.min(tileBottom, bbox.maxY);
      
      const actualWidth = actualRight - actualX;
      const actualHeight = actualBottom - actualY;
      
      const isCut = actualWidth < tileWidth || actualHeight < tileHeight;
      const originalArea = tileWidth * tileHeight;
      const usedArea = actualWidth * actualHeight;
      
      let cutType: 'edge' | 'corner' | 'complex' | undefined;
      if (isCut) {
        if (actualWidth < tileWidth && actualHeight < tileHeight) {
          cutType = 'corner';
        } else {
          cutType = 'edge';
        }
      }
      
      tiles.push({
        id: generateId('tile'),
        x: actualX,
        y: actualY,
        width: actualWidth,
        height: actualHeight,
        rotation: 0,
        isCut,
        cutType,
        originalArea,
        usedArea,
        wasteArea: originalArea - usedArea,
      });
    }
  }
  
  // Generate grout lines
  const tilesAcross = Math.ceil(bbox.width / effectiveTileWidth) + 1;
  const tilesDown = Math.ceil(bbox.height / effectiveTileHeight) + 1;
  
  // Vertical grout lines
  for (let i = 0; i <= tilesAcross; i++) {
    const x = offsetX + i * effectiveTileWidth - groutWidth / 2;
    if (x >= bbox.minX && x <= bbox.maxX) {
      groutLines.push({
        x1: x,
        y1: bbox.minY,
        x2: x,
        y2: bbox.maxY,
        orientation: 'vertical',
      });
    }
  }
  
  // Horizontal grout lines
  for (let i = 0; i <= tilesDown; i++) {
    const y = offsetY + i * effectiveTileHeight - groutWidth / 2;
    if (y >= bbox.minY && y <= bbox.maxY) {
      groutLines.push({
        x1: bbox.minX,
        y1: y,
        x2: bbox.maxX,
        y2: y,
        orientation: 'horizontal',
      });
    }
  }
  
  return { tiles, groutLines };
}

/**
 * Calculate brick (running bond) pattern layout
 */
function calculateBrickPattern(
  bbox: TileBoundingBox,
  tileWidth: number,
  tileHeight: number,
  groutWidth: number,
  offsetRatio: number, // 0.5 for brick, 0.33 for thirds
  options: TileLayoutOptions
): { tiles: TilePosition[]; groutLines: GroutLine[] } {
  const tiles: TilePosition[] = [];
  const groutLines: GroutLine[] = [];
  
  const effectiveTileWidth = tileWidth + groutWidth;
  const effectiveTileHeight = tileHeight + groutWidth;
  
  let row = 0;
  for (let y = -effectiveTileHeight; y < bbox.height + effectiveTileHeight; y += effectiveTileHeight) {
    const rowOffset = (row % 2) * effectiveTileWidth * offsetRatio;
    
    for (let x = -effectiveTileWidth * 2; x < bbox.width + effectiveTileWidth; x += effectiveTileWidth) {
      const tileX = x + rowOffset;
      const tileY = y;
      
      const tileRight = tileX + tileWidth;
      const tileBottom = tileY + tileHeight;
      
      if (tileRight <= bbox.minX || tileX >= bbox.maxX ||
          tileBottom <= bbox.minY || tileY >= bbox.maxY) {
        continue;
      }
      
      const actualX = Math.max(tileX, bbox.minX);
      const actualY = Math.max(tileY, bbox.minY);
      const actualRight = Math.min(tileRight, bbox.maxX);
      const actualBottom = Math.min(tileBottom, bbox.maxY);
      
      const actualWidth = actualRight - actualX;
      const actualHeight = actualBottom - actualY;
      
      const isCut = actualWidth < tileWidth || actualHeight < tileHeight;
      const originalArea = tileWidth * tileHeight;
      const usedArea = actualWidth * actualHeight;
      
      let cutType: 'edge' | 'corner' | 'complex' | undefined;
      if (isCut) {
        cutType = actualWidth < tileWidth && actualHeight < tileHeight ? 'corner' : 'edge';
      }
      
      tiles.push({
        id: generateId('tile'),
        x: actualX,
        y: actualY,
        width: actualWidth,
        height: actualHeight,
        rotation: 0,
        isCut,
        cutType,
        originalArea,
        usedArea,
        wasteArea: originalArea - usedArea,
      });
    }
    row++;
  }
  
  return { tiles, groutLines };
}

/**
 * Calculate herringbone pattern layout
 */
function calculateHerringbonePattern(
  bbox: TileBoundingBox,
  tileWidth: number,
  tileHeight: number,
  groutWidth: number,
  options: TileLayoutOptions
): { tiles: TilePosition[]; groutLines: GroutLine[] } {
  const tiles: TilePosition[] = [];
  const groutLines: GroutLine[] = [];
  
  // For herringbone, we use the longer dimension as length
  const tileLength = Math.max(tileWidth, tileHeight);
  const tileShort = Math.min(tileWidth, tileHeight);
  
  // Pattern unit size
  const unitWidth = tileLength + groutWidth;
  const unitHeight = tileShort * 2 + groutWidth * 2;
  
  for (let unitY = -unitHeight; unitY < bbox.height + unitHeight; unitY += unitHeight) {
    for (let unitX = -unitWidth * 2; unitX < bbox.width + unitWidth; unitX += unitWidth) {
      // Each unit has 4 tiles in herringbone
      const positions = [
        { x: unitX, y: unitY, rotation: 0 },
        { x: unitX, y: unitY + tileShort + groutWidth, rotation: 0 },
        { x: unitX + tileShort + groutWidth, y: unitY - tileShort / 2, rotation: 90 },
        { x: unitX + tileShort + groutWidth, y: unitY + tileShort / 2 + groutWidth, rotation: 90 },
      ];
      
      for (const pos of positions) {
        const isRotated = pos.rotation === 90;
        const actualTileWidth = isRotated ? tileShort : tileLength;
        const actualTileHeight = isRotated ? tileLength : tileShort;
        
        const tileRight = pos.x + actualTileWidth;
        const tileBottom = pos.y + actualTileHeight;
        
        if (tileRight <= bbox.minX || pos.x >= bbox.maxX ||
            tileBottom <= bbox.minY || pos.y >= bbox.maxY) {
          continue;
        }
        
        const actualX = Math.max(pos.x, bbox.minX);
        const actualY = Math.max(pos.y, bbox.minY);
        const clipRight = Math.min(tileRight, bbox.maxX);
        const clipBottom = Math.min(tileBottom, bbox.maxY);
        
        const clippedWidth = clipRight - actualX;
        const clippedHeight = clipBottom - actualY;
        
        const isCut = clippedWidth < actualTileWidth || clippedHeight < actualTileHeight;
        const originalArea = tileWidth * tileHeight;
        const usedArea = clippedWidth * clippedHeight;
        
        tiles.push({
          id: generateId('tile'),
          x: actualX,
          y: actualY,
          width: clippedWidth,
          height: clippedHeight,
          rotation: pos.rotation,
          isCut,
          cutType: isCut ? 'complex' : undefined,
          originalArea,
          usedArea,
          wasteArea: originalArea - usedArea,
        });
      }
    }
  }
  
  return { tiles, groutLines };
}

/**
 * Calculate diagonal (45°) pattern layout
 */
function calculateDiagonalPattern(
  bbox: TileBoundingBox,
  tileWidth: number,
  tileHeight: number,
  groutWidth: number,
  options: TileLayoutOptions
): { tiles: TilePosition[]; groutLines: GroutLine[] } {
  const tiles: TilePosition[] = [];
  const groutLines: GroutLine[] = [];
  
  // For 45° rotation, the effective step is tile diagonal / sqrt(2)
  const diagonal = Math.sqrt(tileWidth * tileWidth + tileHeight * tileHeight);
  const stepX = (tileWidth + groutWidth) * Math.SQRT1_2;
  const stepY = (tileHeight + groutWidth) * Math.SQRT1_2;
  
  const tileEffectiveWidth = tileWidth * Math.SQRT1_2 + tileHeight * Math.SQRT1_2;
  const tileEffectiveHeight = tileEffectiveWidth;
  
  for (let row = -2; row < Math.ceil(bbox.height / stepY) + 2; row++) {
    for (let col = -2; col < Math.ceil(bbox.width / stepX) + 2; col++) {
      const centerX = col * stepX + (row % 2) * stepX / 2;
      const centerY = row * stepY;
      
      // Diamond bounds (rotated square)
      const halfW = tileWidth * Math.SQRT1_2 / 2;
      const halfH = tileHeight * Math.SQRT1_2 / 2;
      
      const left = centerX - halfW - halfH;
      const right = centerX + halfW + halfH;
      const top = centerY - halfW - halfH;
      const bottom = centerY + halfW + halfH;
      
      if (right <= bbox.minX || left >= bbox.maxX ||
          bottom <= bbox.minY || top >= bbox.maxY) {
        continue;
      }
      
      const actualX = Math.max(left, bbox.minX);
      const actualY = Math.max(top, bbox.minY);
      const clipRight = Math.min(right, bbox.maxX);
      const clipBottom = Math.min(bottom, bbox.maxY);
      
      const clippedWidth = clipRight - actualX;
      const clippedHeight = clipBottom - actualY;
      
      const isCut = left < bbox.minX || right > bbox.maxX || 
                    top < bbox.minY || bottom > bbox.maxY;
      const originalArea = tileWidth * tileHeight;
      const usedArea = clippedWidth * clippedHeight * 0.5; // Approximate for diamond
      
      tiles.push({
        id: generateId('tile'),
        x: actualX,
        y: actualY,
        width: clippedWidth,
        height: clippedHeight,
        rotation: 45,
        isCut,
        cutType: isCut ? 'complex' : undefined,
        originalArea,
        usedArea: Math.min(usedArea, originalArea),
        wasteArea: Math.max(0, originalArea - usedArea),
      });
    }
  }
  
  return { tiles, groutLines };
}

/**
 * Main tile layout calculation function
 */
export function calculateTileLayout(
  room: Room,
  specs: TileSpecs,
  scale: ScaleCalibration | null,
  options: TileLayoutOptions = { pattern: 'grid' }
): TileLayoutResult {
  const bbox = calculateBoundingBox(room, scale);
  
  // Room area
  const roomAreaPixels = calculateRoomNetArea(room);
  const roomAreaMm2 = pixelAreaToRealArea(roomAreaPixels, scale);
  const roomAreaM2 = mmSquaredToMSquared(roomAreaMm2);
  
  const groutWidth = options.groutWidthMm ?? specs.groutWidthMm ?? 3;
  
  // Calculate pattern-specific layout
  let layout: { tiles: TilePosition[]; groutLines: GroutLine[] };
  
  switch (options.pattern) {
    case 'brick':
      layout = calculateBrickPattern(bbox, specs.widthMm, specs.lengthMm, groutWidth, 0.5, options);
      break;
    case 'thirds':
      layout = calculateBrickPattern(bbox, specs.widthMm, specs.lengthMm, groutWidth, 0.333, options);
      break;
    case 'herringbone':
      layout = calculateHerringbonePattern(bbox, specs.widthMm, specs.lengthMm, groutWidth, options);
      break;
    case 'diagonal':
      layout = calculateDiagonalPattern(bbox, specs.widthMm, specs.lengthMm, groutWidth, options);
      break;
    case 'grid':
    default:
      layout = calculateGridPattern(bbox, specs.widthMm, specs.lengthMm, groutWidth, options);
  }
  
  // Calculate statistics
  const fullTiles = layout.tiles.filter(t => !t.isCut).length;
  const cutTiles = layout.tiles.filter(t => t.isCut).length;
  const totalTiles = layout.tiles.length;
  
  const totalTileAreaMm2 = layout.tiles.reduce((sum, t) => sum + t.originalArea, 0);
  const totalUsedAreaMm2 = layout.tiles.reduce((sum, t) => sum + t.usedArea, 0);
  const wasteFromCutsMm2 = layout.tiles.reduce((sum, t) => sum + t.wasteArea, 0);
  
  const tileAreaM2 = mmSquaredToMSquared(totalTileAreaMm2);
  const wasteFromCutsM2 = mmSquaredToMSquared(wasteFromCutsMm2);
  
  // Tiles needed (cut tiles count as full tiles for purchasing)
  const tilesNeeded = totalTiles;
  const boxesNeeded = specs.tilesPerBox 
    ? Math.ceil(tilesNeeded / specs.tilesPerBox)
    : undefined;
  
  // Grout calculations
  const totalGroutLengthMm = layout.groutLines.reduce((sum, g) => {
    const dx = g.x2 - g.x1;
    const dy = g.y2 - g.y1;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);
  const groutLinearM = totalGroutLengthMm / 1000;
  const groutAreaM2 = (groutLinearM * groutWidth) / 1000;
  
  // Generate cut lines for visualization
  const cutLines: TileCutLine[] = layout.tiles
    .filter(t => t.isCut)
    .map(t => ({
      id: generateId('cut'),
      x1: t.x,
      y1: t.y,
      x2: t.x + t.width,
      y2: t.y + t.height,
      tileId: t.id,
    }));
  
  // Calculate cost
  let materialCost = 0;
  if (specs.pricePerBox && boxesNeeded) {
    materialCost = boxesNeeded * specs.pricePerBox;
  } else if (specs.pricePerTile) {
    materialCost = tilesNeeded * specs.pricePerTile;
  } else if (specs.pricePerM2) {
    materialCost = tileAreaM2 * specs.pricePerM2;
  }
  
  const utilizationPercent = totalTileAreaMm2 > 0 
    ? (totalUsedAreaMm2 / totalTileAreaMm2) * 100 
    : 0;
  
  return {
    pattern: options.pattern,
    rotation: options.rotation || 0,
    
    fullTiles,
    cutTiles,
    totalTiles,
    
    roomAreaM2,
    tileAreaM2,
    wasteFromCutsM2,
    
    tilesNeeded,
    boxesNeeded,
    
    groutLinearM,
    groutAreaM2,
    
    tilePositions: layout.tiles,
    cutLines,
    groutLines: layout.groutLines,
    
    materialCost,
    
    utilizationPercent,
  };
}

/**
 * Get pattern display name
 */
export function getPatternDisplayName(pattern: TilePattern): string {
  const names: Record<TilePattern, string> = {
    grid: 'Grid',
    brick: 'Brick (1/2 Offset)',
    thirds: 'Thirds (1/3 Offset)',
    herringbone: 'Herringbone',
    basketweave: 'Basketweave',
    diagonal: 'Diagonal (45°)',
  };
  return names[pattern] || pattern;
}

/**
 * Get all available patterns
 */
export function getAvailablePatterns(): { value: TilePattern; label: string }[] {
  return [
    { value: 'grid', label: 'Grid' },
    { value: 'brick', label: 'Brick (1/2 Offset)' },
    { value: 'thirds', label: 'Thirds (1/3 Offset)' },
    { value: 'herringbone', label: 'Herringbone' },
    { value: 'diagonal', label: 'Diagonal (45°)' },
  ];
}
