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
 * Rotate a point around a center point
 */
function rotatePoint(
  point: { x: number; y: number },
  center: { x: number; y: number },
  angleDegrees: number
): { x: number; y: number } {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(points: CanvasPoint[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  return { x: sumX / points.length, y: sumY / points.length };
}

/**
 * Rotate all points of a polygon around a center
 */
function rotatePolygon(
  points: CanvasPoint[],
  center: { x: number; y: number },
  angleDegrees: number
): CanvasPoint[] {
  return points.map(p => {
    const rotated = rotatePoint(p, center, angleDegrees);
    return { ...p, x: rotated.x, y: rotated.y };
  });
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
  // Get fill direction angle (0 = horizontal strips running left-right)
  const fillAngle = options.fillDirection ?? 0;
  const isDiagonal = fillAngle !== 0 && fillAngle !== 90 && fillAngle !== 180 && fillAngle !== 270;
  
  // Calculate room centroid for rotation
  const centroid = calculateCentroid(room.points);
  
  // For diagonal layouts, rotate room points so fill direction becomes horizontal
  // Then calculate as if horizontal, then rotate results back
  const workingPoints = isDiagonal 
    ? rotatePolygon(room.points, centroid, -fillAngle) 
    : room.points;
  
  const bbox = calculateBoundingBox(workingPoints, scale);
  
  // Calculate room area in mm² (use original points for actual area)
  const roomAreaPixels = calculateRoomNetArea(room);
  const roomAreaMm2 = pixelAreaToRealArea(roomAreaPixels, scale);
  const roomAreaM2 = mmSquaredToMSquared(roomAreaMm2);

  // Determine layout direction for the calculation
  // For diagonal, we always calculate as 'horizontal' in rotated space
  let calcDirection: 'horizontal' | 'vertical';
  
  if (isDiagonal) {
    calcDirection = 'horizontal'; // Always horizontal in rotated coordinate space
  } else if (options.forcedDirection) {
    calcDirection = options.forcedDirection;
  } else if (fillAngle === 90 || fillAngle === 270) {
    calcDirection = 'vertical';
  } else if (options.optimizeFor === 'seams') {
    // Minimize seams = run along longest dimension
    calcDirection = bbox.width >= bbox.height ? 'horizontal' : 'vertical';
  } else {
    // Default: minimize waste by running perpendicular to shortest side
    calcDirection = bbox.width >= bbox.height ? 'horizontal' : 'vertical';
  }
  
  // Determine the final layout direction label
  const layoutDirection: 'horizontal' | 'vertical' | 'diagonal' = isDiagonal 
    ? 'diagonal' 
    : calcDirection;

  // Dimensions based on calculation direction (not layout direction which may be 'diagonal')
  const roomLength = calcDirection === 'horizontal' ? bbox.width : bbox.height;
  const roomWidth = calcDirection === 'horizontal' ? bbox.height : bbox.width;
  const rollWidth = material.width;
  const patternRepeat = material.patternRepeat || 0;

  // Get first seam offset - shifts where strips start within the room
  const firstSeamOffset = options.firstSeamOffset || 0;
  // Normalize offset to be within one material width (can be negative or positive)
  const normalizedOffset = ((firstSeamOffset % rollWidth) + rollWidth) % rollWidth;

  // Calculate number of strips needed (accounting for offset)
  // With offset, we may need an extra strip at the beginning
  const effectiveRoomWidth = roomWidth + normalizedOffset;
  const numFullStrips = Math.floor(effectiveRoomWidth / rollWidth);
  const remainingWidth = effectiveRoomWidth - (numFullStrips * rollWidth);
  const hasPartialStrip = remainingWidth > 10; // Small tolerance
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
    
    // Calculate strip position with offset
    // First strip starts at (bbox edge - offset), subsequent strips follow
    const stripStartPos = (i * rollWidth) - normalizedOffset;
    
    // Calculate strip width (may be partial at start or end)
    let stripWidth = rollWidth;
    if (i === 0 && normalizedOffset > 0) {
      // First strip might be partial due to offset
      stripWidth = rollWidth - normalizedOffset;
    } else if (isLastStrip) {
      stripWidth = remainingWidth;
    }
    
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

    // Position calculation with offset (in working/rotated coordinate space)
    const xPos = calcDirection === 'horizontal' ? bbox.minX : bbox.minX + stripStartPos;
    const yPos = calcDirection === 'horizontal' ? bbox.minY + stripStartPos : bbox.minY;

    // Calculate pattern offset for this strip
    let patternOffset = 0;
    if (patternRepeat > 0 && i > 0) {
      // Each subsequent strip needs a cumulative offset to maintain pattern
      patternOffset = cumulativePatternOffset;
      cumulativePatternOffset = (cumulativePatternOffset + stripLength) % patternRepeat;
    }

    // For diagonal layouts, rotate strip position back to original coordinate space
    let finalX = xPos;
    let finalY = yPos;
    
    if (isDiagonal) {
      // Convert back from mm to pixels for rotation, then back to mm
      const toPixels = (mm: number) => scale && scale.pixelsPerMm > 0 ? mm * scale.pixelsPerMm : mm;
      const toMm = (pixels: number) => scale && scale.pixelsPerMm > 0 ? pixels / scale.pixelsPerMm : pixels;
      
      const rotatedPos = rotatePoint(
        { x: toPixels(xPos), y: toPixels(yPos) },
        centroid,
        fillAngle
      );
      finalX = toMm(rotatedPos.x);
      finalY = toMm(rotatedPos.y);
    }

    const strip: Strip = {
      id: generateId('strip'),
      x: finalX,
      y: finalY,
      width: stripWidth,
      length: stripLength,
      patternOffset,
      rotation: isDiagonal ? fillAngle : (calcDirection === 'horizontal' ? 0 : 90),
    };

    strips.push(strip);

    // Calculate material area for this strip
    // Use roll width (not actual strip width for partial) since that's what we cut from
    const actualCutWidth = rollWidth; // Full roll width even for partial
    totalMaterialMm2 += actualCutWidth * stripLength;
    totalRollLengthMm += stripLength;

    // Generate seam line between this strip and the previous one
    if (i > 0) {
      // Seam position accounts for offset (in working/rotated coordinate space)
      const seamPos = (i * rollWidth) - normalizedOffset;
      let seamX1 = calcDirection === 'horizontal' ? bbox.minX : bbox.minX + seamPos;
      let seamY1 = calcDirection === 'horizontal' ? bbox.minY + seamPos : bbox.minY;
      let seamX2 = calcDirection === 'horizontal' ? bbox.maxX : bbox.minX + seamPos;
      let seamY2 = calcDirection === 'horizontal' ? bbox.minY + seamPos : bbox.maxY;

      // For diagonal layouts, rotate seam line back to original coordinate space
      if (isDiagonal) {
        const toPixels = (mm: number) => scale && scale.pixelsPerMm > 0 ? mm * scale.pixelsPerMm : mm;
        const toMm = (pixels: number) => scale && scale.pixelsPerMm > 0 ? pixels / scale.pixelsPerMm : pixels;
        
        const rotatedP1 = rotatePoint({ x: toPixels(seamX1), y: toPixels(seamY1) }, centroid, fillAngle);
        const rotatedP2 = rotatePoint({ x: toPixels(seamX2), y: toPixels(seamY2) }, centroid, fillAngle);
        
        seamX1 = toMm(rotatedP1.x);
        seamY1 = toMm(rotatedP1.y);
        seamX2 = toMm(rotatedP2.x);
        seamY2 = toMm(rotatedP2.y);
      }

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

  // Calculate cost with roll vs cut pricing logic
  const totalMaterialAreaM2 = mmSquaredToMSquared(totalMaterialMm2);
  const totalLengthM = totalRollLengthMm / 1000;
  
  let materialCost = 0;
  let pricingMethod: 'per_m2' | 'per_roll' | 'per_linear_m' | 'mixed' = 'per_m2';
  let fullRolls: number | undefined;
  let cutLengthM: number | undefined;
  let rollCost: number | undefined;
  let cutCost: number | undefined;
  
  // Determine pricing method based on available specs
  if (material.pricePerRoll && material.rollLengthM) {
    // Roll + cut pricing logic
    const rollLengthM = material.rollLengthM;
    fullRolls = Math.floor(totalLengthM / rollLengthM);
    cutLengthM = totalLengthM - (fullRolls * rollLengthM);
    
    rollCost = fullRolls * material.pricePerRoll;
    
    if (cutLengthM > 0 && material.pricePerLinearM) {
      // Use cut pricing for remainder
      cutCost = cutLengthM * material.pricePerLinearM;
      pricingMethod = 'mixed';
    } else if (cutLengthM > 0) {
      // Need another full roll for the remainder
      fullRolls += 1;
      rollCost = fullRolls * material.pricePerRoll;
      cutLengthM = 0;
      pricingMethod = 'per_roll';
    } else {
      pricingMethod = 'per_roll';
    }
    
    materialCost = rollCost + (cutCost || 0);
  } else if (material.pricePerLinearM) {
    // Linear meter pricing only
    pricingMethod = 'per_linear_m';
    materialCost = totalLengthM * material.pricePerLinearM;
  } else {
    // Default to per m² pricing
    pricingMethod = 'per_m2';
    const pricePerM2 = material.pricePerM2 || 0;
    materialCost = totalMaterialAreaM2 * pricePerM2;
  }

  return {
    roomId: room.id,
    roomName: room.name,
    
    strips,
    seamLines,
    layoutDirection,
    fillAngle,
    roomBoundingBox: bbox,
    roomAreaMm2,
    roomAreaM2,
    
    totalRollLengthMm,
    totalRollLengthM: totalLengthM,
    totalMaterialAreaMm2: totalMaterialMm2,
    totalMaterialAreaM2,
    
    wasteAreaMm2,
    wasteAreaM2,
    wastePercent,
    
    utilizationPercent,
    materialCost,
    pricingMethod,
    fullRolls,
    cutLengthM,
    rollCost,
    cutCost,
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
 * Handles both legacy and new mm-based dimensions
 */
export function extractRollMaterialSpecs(specs: Record<string, unknown>): RollMaterialSpecs {
  // Handle new mm-based dimensions or legacy
  const rollWidthMm = (specs.rollWidthMm as number) || 
                      ((specs.width as number) || 3660); // Default 3.66m (12ft)
  
  return {
    width: rollWidthMm,
    rollLengthM: (specs.rollLengthM as number) || undefined,
    patternRepeat: (specs.patternRepeatMm as number) || 
                   (specs.patternRepeat as number) || 
                   (specs.pattern_repeat as number) || 0,
    pricePerM2: (specs.pricePerM2 as number) || (specs.price as number) || undefined,
    pricePerRoll: (specs.pricePerRoll as number) || undefined,
    pricePerLinearM: (specs.pricePerLinearM as number) || undefined,
    wastePercent: (specs.wastePercent as number) || (specs.waste_percent as number) || 10,
  };
}
