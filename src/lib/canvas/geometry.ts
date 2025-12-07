import { CanvasPoint, Room, Hole, ScaleCalibration } from './types';

/**
 * Calculate polygon area using Shoelace formula
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
 * Calculate room net area (gross area minus holes)
 */
export function calculateRoomNetArea(room: Room): number {
  const grossArea = calculatePolygonArea(room.points);
  const holesArea = room.holes.reduce((sum, hole) => sum + calculatePolygonArea(hole.points), 0);
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
 * Calculate perimeter of a polygon in pixels
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
 * Distance between two points
 */
export function distance(p1: CanvasPoint, p2: CanvasPoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
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
