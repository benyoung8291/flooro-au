import { Room, ScaleCalibration, CanvasPoint } from '@/lib/canvas/types';
import { calculatePolygonArea, calculateRoomNetArea, pixelAreaToRealArea, mmSquaredToMSquared } from '@/lib/canvas/geometry';
import {
  RollMaterialSpecs,
  BoundingBox,
  Strip,
  SeamLine,
  StripPlanResult,
  StripPlanOptions,
  MultiRoomStripPlan,
} from './types';

/**
 * Calculate bounding box of a polygon in mm
 */
export function calculateBoundingBox(
  points: CanvasPoint[],
  scale: ScaleCalibration | null
): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  // Convert pixels to mm
  const toMm = (pixels: number) => {
    if (!scale || scale.pixelsPerMm === 0) return pixels;
    return pixels / scale.pixelsPerMm;
  };

  const widthMm = toMm(maxX - minX);
  const heightMm = toMm(maxY - minY);

  return {
    minX: toMm(minX),
    minY: toMm(minY),
    maxX: toMm(maxX),
    maxY: toMm(maxY),
    width: widthMm,
    height: heightMm,
  };
}

/**
 * Round up to nearest pattern repeat
 */
function roundToPatternRepeat(length: number, patternRepeat: number): number {
  if (patternRepeat <= 0) return length;
  return Math.ceil(length / patternRepeat) * patternRepeat;
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Greedy Strip Algorithm
 * 
 * This algorithm divides a room into parallel strips of roll material,
 * optimizing for minimal waste while respecting pattern matching requirements.
 * 
 * The algorithm:
 * 1. Calculate room bounding box
 * 2. Determine optimal layout direction (minimize strips or go with room length)
 * 3. Fill room with strips from one side to the other
 * 4. Calculate pattern offsets for matching
 * 5. Generate seam lines where strips meet
 */
export function calculateStripPlan(
  room: Room,
  material: RollMaterialSpecs,
  scale: ScaleCalibration | null,
  options: StripPlanOptions = {}
): StripPlanResult {
  const bbox = calculateBoundingBox(room.points, scale);
  
  // Calculate room area in mm²
  const roomAreaPixels = calculateRoomNetArea(room);
  const roomAreaMm2 = pixelAreaToRealArea(roomAreaPixels, scale);
  const roomAreaM2 = mmSquaredToMSquared(roomAreaMm2);

  // Determine layout direction
  // Default: run strips along the longest dimension to minimize seams
  let layoutDirection: 'horizontal' | 'vertical';
  
  if (options.forcedDirection) {
    layoutDirection = options.forcedDirection;
  } else if (options.optimizeFor === 'seams') {
    // Minimize seams = run along longest dimension
    layoutDirection = bbox.width >= bbox.height ? 'horizontal' : 'vertical';
  } else {
    // Default: minimize waste by running perpendicular to shortest side
    // This often means fewer partial strips
    layoutDirection = bbox.width >= bbox.height ? 'horizontal' : 'vertical';
  }

  // Dimensions based on layout direction
  const roomLength = layoutDirection === 'horizontal' ? bbox.width : bbox.height;
  const roomWidth = layoutDirection === 'horizontal' ? bbox.height : bbox.width;
  
  const rollWidth = material.width;
  const patternRepeat = material.patternRepeat || 0;

  // Calculate number of strips needed
  const numFullStrips = Math.floor(roomWidth / rollWidth);
  const remainingWidth = roomWidth - (numFullStrips * rollWidth);
  const hasPartialStrip = remainingWidth > 0;
  const totalStrips = numFullStrips + (hasPartialStrip ? 1 : 0);

  // Calculate strip length with pattern matching
  // First strip is the reference - subsequent strips need pattern offset
  const baseStripLength = roomLength;
  
  const strips: Strip[] = [];
  const seamLines: SeamLine[] = [];
  
  let totalMaterialMm2 = 0;
  let totalRollLengthMm = 0;
  let cumulativePatternOffset = 0;

  for (let i = 0; i < totalStrips; i++) {
    const isLastStrip = i === totalStrips - 1 && hasPartialStrip;
    const stripWidth = isLastStrip ? remainingWidth : rollWidth;
    
    // Calculate strip length considering pattern repeat
    // Each strip needs to be long enough to match the pattern with the previous strip
    let stripLength = baseStripLength;
    
    if (patternRepeat > 0 && i > 0) {
      // Add pattern matching allowance
      // Round up to nearest pattern repeat for clean cuts
      stripLength = roundToPatternRepeat(baseStripLength, patternRepeat);
    }

    // Apply max strip length constraint if specified
    if (options.maxStripLength && stripLength > options.maxStripLength) {
      // Would need to split into multiple pieces - for now, just cap it
      stripLength = options.maxStripLength;
    }

    // Position calculation
    const xPos = layoutDirection === 'horizontal' ? bbox.minX : bbox.minX + (i * rollWidth);
    const yPos = layoutDirection === 'horizontal' ? bbox.minY + (i * rollWidth) : bbox.minY;

    // Calculate pattern offset for this strip
    let patternOffset = 0;
    if (patternRepeat > 0 && i > 0) {
      // Each subsequent strip needs a cumulative offset to maintain pattern
      patternOffset = cumulativePatternOffset;
      cumulativePatternOffset = (cumulativePatternOffset + stripLength) % patternRepeat;
    }

    const strip: Strip = {
      id: generateId('strip'),
      x: xPos,
      y: yPos,
      width: stripWidth,
      length: stripLength,
      patternOffset,
      rotation: layoutDirection === 'horizontal' ? 0 : 90,
    };

    strips.push(strip);

    // Calculate material area for this strip
    // Use roll width (not actual strip width for partial) since that's what we cut from
    const actualCutWidth = isLastStrip ? rollWidth : stripWidth; // Full roll width even for partial
    totalMaterialMm2 += actualCutWidth * stripLength;
    totalRollLengthMm += stripLength;

    // Generate seam line between this strip and the previous one
    if (i > 0) {
      const seamX1 = layoutDirection === 'horizontal' ? bbox.minX : xPos;
      const seamY1 = layoutDirection === 'horizontal' ? yPos : bbox.minY;
      const seamX2 = layoutDirection === 'horizontal' ? bbox.maxX : xPos;
      const seamY2 = layoutDirection === 'horizontal' ? yPos : bbox.maxY;

      seamLines.push({
        id: generateId('seam'),
        x1: seamX1,
        y1: seamY1,
        x2: seamX2,
        y2: seamY2,
        type: 'primary',
      });
    }
  }

  // Apply additional waste factor from material specs
  const wasteMultiplier = 1 + (material.wastePercent / 100);
  totalMaterialMm2 *= wasteMultiplier;
  totalRollLengthMm *= wasteMultiplier;

  // Calculate waste
  const wasteAreaMm2 = Math.max(0, totalMaterialMm2 - roomAreaMm2);
  const wasteAreaM2 = mmSquaredToMSquared(wasteAreaMm2);
  const wastePercent = roomAreaMm2 > 0 ? (wasteAreaMm2 / totalMaterialMm2) * 100 : 0;
  const utilizationPercent = 100 - wastePercent;

  // Calculate cost
  const totalMaterialAreaM2 = mmSquaredToMSquared(totalMaterialMm2);
  const materialCost = totalMaterialAreaM2 * material.price;

  return {
    roomId: room.id,
    roomName: room.name,
    
    strips,
    seamLines,
    layoutDirection,
    
    roomBoundingBox: bbox,
    roomAreaMm2,
    roomAreaM2,
    
    totalRollLengthMm,
    totalRollLengthM: totalRollLengthMm / 1000,
    totalMaterialAreaMm2: totalMaterialMm2,
    totalMaterialAreaM2,
    
    wasteAreaMm2,
    wasteAreaM2,
    wastePercent,
    
    utilizationPercent,
    materialCost,
  };
}

/**
 * Calculate strip plans for multiple rooms with the same material
 */
export function calculateMultiRoomStripPlan(
  rooms: Room[],
  material: RollMaterialSpecs,
  scale: ScaleCalibration | null,
  options: StripPlanOptions = {}
): MultiRoomStripPlan {
  const roomPlans = rooms.map(room => calculateStripPlan(room, material, scale, options));

  const totalRoomAreaM2 = roomPlans.reduce((sum, p) => sum + p.roomAreaM2, 0);
  const totalMaterialAreaM2 = roomPlans.reduce((sum, p) => sum + p.totalMaterialAreaM2, 0);
  const totalWasteAreaM2 = roomPlans.reduce((sum, p) => sum + p.wasteAreaM2, 0);
  const totalCost = roomPlans.reduce((sum, p) => sum + p.materialCost, 0);

  const totalWastePercent = totalMaterialAreaM2 > 0 
    ? (totalWasteAreaM2 / totalMaterialAreaM2) * 100 
    : 0;
  const overallUtilizationPercent = 100 - totalWastePercent;

  return {
    roomPlans,
    totalRoomAreaM2,
    totalMaterialAreaM2,
    totalWasteAreaM2,
    totalWastePercent,
    totalCost,
    overallUtilizationPercent,
  };
}

/**
 * Get roll material specs from generic material specs
 */
export function extractRollMaterialSpecs(specs: Record<string, unknown>): RollMaterialSpecs {
  return {
    width: (specs.width as number) || 3660, // Default 3.66m (12ft) roll
    patternRepeat: (specs.patternRepeat as number) || (specs.pattern_repeat as number) || 0,
    price: (specs.price as number) || 0,
    wastePercent: (specs.wastePercent as number) || (specs.waste_percent as number) || 10,
  };
}
