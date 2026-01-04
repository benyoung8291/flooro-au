import { CanvasPoint, Room, Hole, ScaleCalibration, EdgeCurve, SnapSettings, SnapResult } from './types';

/**
 * Get point on quadratic Bezier curve at parameter t (0-1)
 */
export function getQuadraticBezierPoint(
  p1: CanvasPoint,
  control: CanvasPoint,
  p2: CanvasPoint,
  t: number
): CanvasPoint {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * p1.x + 2 * oneMinusT * t * control.x + t * t * p2.x,
    y: oneMinusT * oneMinusT * p1.y + 2 * oneMinusT * t * control.y + t * t * p2.y,
  };
}

/**
 * Calculate length of a quadratic Bezier curve (approximation via subdivision)
 */
export function calculateQuadraticBezierLength(
  p1: CanvasPoint,
  control: CanvasPoint,
  p2: CanvasPoint,
  segments: number = 20
): number {
  let length = 0;
  let prevPoint = p1;
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const currentPoint = getQuadraticBezierPoint(p1, control, p2, t);
    length += distance(prevPoint, currentPoint);
    prevPoint = currentPoint;
  }
  
  return length;
}

/**
 * Subdivide a curve into points for area calculation
 */
export function subdivideCurveToPoints(
  p1: CanvasPoint,
  p2: CanvasPoint,
  curve?: EdgeCurve,
  segments: number = 10
): CanvasPoint[] {
  if (!curve || curve.type === 'straight' || !curve.controlPoint) {
    return [p1, p2];
  }
  
  const points: CanvasPoint[] = [p1];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    points.push(getQuadraticBezierPoint(p1, curve.controlPoint, p2, t));
  }
  points.push(p2);
  return points;
}

/**
 * Calculate polygon area with curve support using Shoelace formula
 * Subdivides curved edges into segments for accurate calculation
 */
export function calculatePolygonAreaWithCurves(
  points: CanvasPoint[],
  edgeCurves?: EdgeCurve[]
): number {
  if (points.length < 3) return 0;
  
  // Build array of all points including subdivided curve points
  const allPoints: CanvasPoint[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const curve = edgeCurves?.[i];
    const subdivided = subdivideCurveToPoints(points[i], points[j], curve);
    // Add all points except the last one (which is the start of next edge)
    allPoints.push(...subdivided.slice(0, -1));
  }
  
  // Apply Shoelace formula
  let area = 0;
  const n = allPoints.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += allPoints[i].x * allPoints[j].y;
    area -= allPoints[j].x * allPoints[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Calculate polygon area using Shoelace formula (straight edges only)
 * Returns area in square pixels (positive for clockwise, negative for counter-clockwise)
 */
export function calculatePolygonArea(points: CanvasPoint[]): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Calculate room net area (gross area minus holes) with curve support
 */
export function calculateRoomNetArea(room: Room): number {
  const grossArea = calculatePolygonAreaWithCurves(room.points, room.edgeCurves);
  const holesArea = room.holes.reduce(
    (sum, hole) => sum + calculatePolygonAreaWithCurves(hole.points, hole.edgeCurves),
    0
  );
  return grossArea - holesArea;
}

/**
 * Convert pixel area to real-world area using scale calibration
 */
export function pixelAreaToRealArea(pixelArea: number, scale: ScaleCalibration | null): number {
  if (!scale || scale.pixelsPerMm === 0) return pixelArea;
  const pixelsPerMmSquared = scale.pixelsPerMm * scale.pixelsPerMm;
  return pixelArea / pixelsPerMmSquared; // returns mm²
}

/**
 * Convert mm² to m²
 */
export function mmSquaredToMSquared(mmSquared: number): number {
  return mmSquared / 1_000_000;
}

/**
 * Calculate perimeter of a polygon in pixels (straight edges only)
 */
export function calculatePerimeter(points: CanvasPoint[]): number {
  if (points.length < 2) return 0;
  
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    perimeter += distance(points[i], points[j]);
  }
  return perimeter;
}

/**
 * Calculate perimeter with curve support
 */
export function calculatePerimeterWithCurves(
  points: CanvasPoint[],
  edgeCurves?: EdgeCurve[]
): number {
  if (points.length < 2) return 0;
  
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const curve = edgeCurves?.[i];
    
    if (curve?.type === 'quadratic' && curve.controlPoint) {
      perimeter += calculateQuadraticBezierLength(points[i], curve.controlPoint, points[j]);
    } else {
      perimeter += distance(points[i], points[j]);
    }
  }
  return perimeter;
}

/**
 * Distance between two points
 */
export function distance(p1: CanvasPoint, p2: CanvasPoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate midpoint of an edge (accounting for curves)
 */
export function getEdgeMidpoint(
  p1: CanvasPoint,
  p2: CanvasPoint,
  curve?: EdgeCurve
): CanvasPoint {
  if (curve?.type === 'quadratic' && curve.controlPoint) {
    return getQuadraticBezierPoint(p1, curve.controlPoint, p2, 0.5);
  }
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

/**
 * Calculate default control point for a straight edge (at midpoint, perpendicular offset)
 */
export function calculateDefaultControlPoint(p1: CanvasPoint, p2: CanvasPoint): CanvasPoint {
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  
  // Get perpendicular direction and offset by a reasonable amount
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return { x: midX, y: midY };
  
  // Perpendicular unit vector
  const perpX = -dy / length;
  const perpY = dx / length;
  
  // Offset by 20% of edge length (reasonable default curve)
  const offset = length * 0.2;
  
  return {
    x: midX + perpX * offset,
    y: midY + perpY * offset,
  };
}

/**
 * Find the closest point on any existing polygon vertex
 */
export function findSnapPoint(
  point: CanvasPoint,
  rooms: Room[],
  snapRadius: number = 10
): CanvasPoint | null {
  let closestPoint: CanvasPoint | null = null;
  let closestDistance = snapRadius;
  
  for (const room of rooms) {
    for (const vertex of room.points) {
      const dist = distance(point, vertex);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestPoint = vertex;
      }
    }
    // Also check hole vertices
    for (const hole of room.holes) {
      for (const vertex of hole.points) {
        const dist = distance(point, vertex);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestPoint = vertex;
        }
      }
    }
  }
  
  return closestPoint;
}

/**
 * Apply ortho-lock to constrain point to horizontal or vertical from last point
 */
export function applyOrthoLock(point: CanvasPoint, lastPoint: CanvasPoint): CanvasPoint {
  const dx = Math.abs(point.x - lastPoint.x);
  const dy = Math.abs(point.y - lastPoint.y);
  
  if (dx > dy) {
    // Snap to horizontal
    return { x: point.x, y: lastPoint.y };
  } else {
    // Snap to vertical
    return { x: lastPoint.x, y: point.y };
  }
}

/**
 * Find axis-aligned snap lines from existing vertices
 */
export function findAxisSnapLines(
  point: CanvasPoint,
  rooms: Room[],
  snapRadius: number = 10
): { horizontal: number | null; vertical: number | null } {
  let horizontal: number | null = null;
  let vertical: number | null = null;
  
  for (const room of rooms) {
    for (const vertex of room.points) {
      if (Math.abs(point.x - vertex.x) < snapRadius) {
        vertical = vertex.x;
      }
      if (Math.abs(point.y - vertex.y) < snapRadius) {
        horizontal = vertex.y;
      }
    }
  }
  
  return { horizontal, vertical };
}

/**
 * Check if a point is inside a polygon
 */
export function isPointInPolygon(point: CanvasPoint, polygon: CanvasPoint[]): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Find which wall segment a point is closest to
 */
export function findClosestWallSegment(
  point: CanvasPoint,
  polygon: CanvasPoint[]
): { index: number; distance: number; projectedPoint: CanvasPoint } | null {
  if (polygon.length < 2) return null;
  
  let closestIndex = 0;
  let closestDistance = Infinity;
  let closestProjection: CanvasPoint = { x: 0, y: 0 };
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const projection = projectPointOntoSegment(point, polygon[i], polygon[j]);
    const dist = distance(point, projection);
    
    if (dist < closestDistance) {
      closestDistance = dist;
      closestIndex = i;
      closestProjection = projection;
    }
  }
  
  return { index: closestIndex, distance: closestDistance, projectedPoint: closestProjection };
}

/**
 * Project a point onto a line segment
 */
function projectPointOntoSegment(point: CanvasPoint, segStart: CanvasPoint, segEnd: CanvasPoint): CanvasPoint {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) return segStart;
  
  let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  
  return {
    x: segStart.x + t * dx,
    y: segStart.y + t * dy,
  };
}

/**
 * Calculate angle between two points
 */
export function angleBetweenPoints(p1: CanvasPoint, p2: CanvasPoint): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

/**
 * Generate a unique room ID
 */
export function generateRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique hole ID
 */
export function generateHoleId(): string {
  return `hole_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique door ID
 */
export function generateDoorId(): string {
  return `door_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculate bounding box for all rooms
 */
export function calculateBoundingBox(rooms: Room[]): BoundingBox | null {
  if (rooms.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const room of rooms) {
    for (const point of room.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    // Include holes
    for (const hole of room.holes) {
      for (const point of hole.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
    
    // Include door positions
    for (const door of room.doors) {
      minX = Math.min(minX, door.position.x);
      minY = Math.min(minY, door.position.y);
      maxX = Math.max(maxX, door.position.x);
      maxY = Math.max(maxY, door.position.y);
    }
  }
  
  if (!isFinite(minX)) return null;
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Calculate view transform to fit rooms in canvas with padding
 */
export function calculateZoomToFit(
  boundingBox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 60
): { zoom: number; offsetX: number; offsetY: number } {
  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;
  
  // Handle edge case of very small or zero-size bounding boxes
  if (boundingBox.width <= 0 || boundingBox.height <= 0) {
    return {
      zoom: 1,
      offsetX: canvasWidth / 2 - boundingBox.centerX,
      offsetY: canvasHeight / 2 - boundingBox.centerY,
    };
  }
  
  const scaleX = availableWidth / boundingBox.width;
  const scaleY = availableHeight / boundingBox.height;
  
  // Use the smaller scale to fit everything, capped between 0.1 and 2.0
const zoom = Math.max(0.1, Math.min(2.0, Math.min(scaleX, scaleY)));
  
  // Calculate offsets to center the content
  const offsetX = (canvasWidth / 2) - (boundingBox.centerX * zoom);
  const offsetY = (canvasHeight / 2) - (boundingBox.centerY * zoom);
  
  return { zoom, offsetX, offsetY };
}

/**
 * Snap a point to a grid
 */
export function snapToGrid(
  point: CanvasPoint,
  gridSize: number,
  scale: ScaleCalibration | null
): CanvasPoint {
  // Convert grid size from mm to pixels if scale exists
  const gridPx = scale ? gridSize * scale.pixelsPerMm : gridSize;
  
  if (gridPx <= 0) return point;
  
  return {
    x: Math.round(point.x / gridPx) * gridPx,
    y: Math.round(point.y / gridPx) * gridPx,
  };
}

/**
 * Smart snap point finder with priority: vertices > grid > axis
 * Returns snap result with type info for visual feedback
 */
export function findSmartSnapPoint(
  point: CanvasPoint,
  rooms: Room[],
  currentDrawingPoints: CanvasPoint[],
  snapSettings: SnapSettings,
  scale: ScaleCalibration | null,
  snapRadius: number = 15
): SnapResult | null {
  if (!snapSettings.enabled) return null;
  
  let bestSnap: SnapResult | null = null;
  let bestDistance = snapRadius;
  
  // Priority 1: Snap to current drawing points (for closing polygon)
  for (const vertex of currentDrawingPoints) {
    const dist = distance(point, vertex);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestSnap = { point: vertex, type: 'drawing' };
    }
  }
  
  // Priority 2: Snap to existing room vertices
  if (snapSettings.vertexSnapEnabled) {
    for (const room of rooms) {
      for (const vertex of room.points) {
        const dist = distance(point, vertex);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestSnap = { 
            point: vertex, 
            type: 'vertex',
            sourceRoomId: room.id 
          };
        }
      }
      // Also check hole vertices
      for (const hole of room.holes) {
        for (const vertex of hole.points) {
          const dist = distance(point, vertex);
          if (dist < bestDistance) {
            bestDistance = dist;
            bestSnap = { 
              point: vertex, 
              type: 'vertex',
              sourceRoomId: room.id 
            };
          }
        }
      }
    }
  }
  
  // Priority 3: Snap to grid (if no vertex snap found or grid is closer)
  if (snapSettings.gridEnabled && !bestSnap) {
    const gridSnap = snapToGrid(point, snapSettings.gridSize, scale);
    const dist = distance(point, gridSnap);
    if (dist < snapRadius && dist > 1) { // Don't snap if already on grid
      bestSnap = { point: gridSnap, type: 'grid' };
    }
  }
  
  return bestSnap;
}

/**
 * Calculate grid size in pixels for rendering
 */
export function getGridSizeInPixels(gridSize: number, scale: ScaleCalibration | null): number {
  return scale ? gridSize * scale.pixelsPerMm : gridSize;
}

/**
 * Parse dimension input with unit support
 * Returns length in mm
 */
export function parseDimensionInput(input: string, defaultUnit: 'm' | 'cm' | 'mm' | 'imperial' = 'm'): number | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  
  // Check for imperial format (e.g., 11'5" or 11'5.5")
  const imperialMatch = trimmed.match(/^(\d+(?:\.\d+)?)'(?:(\d+(?:\.\d+)?)(?:"|'')?)?$/);
  if (imperialMatch) {
    const feet = parseFloat(imperialMatch[1]) || 0;
    const inches = parseFloat(imperialMatch[2]) || 0;
    const totalInches = feet * 12 + inches;
    return totalInches * 25.4; // Convert to mm
  }
  
  // Check for inches only (e.g., 45")
  const inchesMatch = trimmed.match(/^(\d+(?:\.\d+)?)(?:"|''|in|inch|inches)$/);
  if (inchesMatch) {
    return parseFloat(inchesMatch[1]) * 25.4;
  }
  
  // Check for mm suffix
  const mmMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*mm$/);
  if (mmMatch) {
    return parseFloat(mmMatch[1]);
  }
  
  // Check for cm suffix
  const cmMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (cmMatch) {
    return parseFloat(cmMatch[1]) * 10;
  }
  
  // Check for m suffix
  const mMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*m$/);
  if (mMatch) {
    return parseFloat(mMatch[1]) * 1000;
  }
  
  // No unit - use default
  const numericMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (numericMatch) {
    const value = parseFloat(numericMatch[1]);
    switch (defaultUnit) {
      case 'mm': return value;
      case 'cm': return value * 10;
      case 'm': return value * 1000;
      case 'imperial': return value * 25.4; // Assume inches
      default: return value * 1000; // Default to meters
    }
  }
  
  return null;
}
