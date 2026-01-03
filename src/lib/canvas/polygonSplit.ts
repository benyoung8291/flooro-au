import { CanvasPoint, Room, Hole } from './types';
import { isPointInPolygon, distance } from './geometry';

export interface SplitResult {
  success: boolean;
  polygon1: CanvasPoint[];
  polygon2: CanvasPoint[];
  error?: string;
}

interface EdgeIntersection {
  edgeIndex: number;
  point: CanvasPoint;
  t: number; // Parameter along the edge (0-1)
}

/**
 * Find intersection point of a line segment with another line segment
 */
export function lineSegmentIntersection(
  p1: CanvasPoint,
  p2: CanvasPoint,
  p3: CanvasPoint,
  p4: CanvasPoint
): { point: CanvasPoint; t: number; u: number } | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  
  if (Math.abs(denom) < 1e-10) {
    return null; // Lines are parallel
  }
  
  const t = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const u = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  
  // Check if intersection is within both segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      point: {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
      },
      t,
      u,
    };
  }
  
  return null;
}

/**
 * Find which edges of a polygon the split line intersects
 */
export function findSplitEdgeIntersections(
  points: CanvasPoint[],
  lineStart: CanvasPoint,
  lineEnd: CanvasPoint
): EdgeIntersection[] {
  const intersections: EdgeIntersection[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const result = lineSegmentIntersection(lineStart, lineEnd, points[i], points[j]);
    
    if (result) {
      intersections.push({
        edgeIndex: i,
        point: result.point,
        t: result.u, // Use u since we want parameter along the polygon edge
      });
    }
  }
  
  // Sort by parameter along the split line
  intersections.sort((a, b) => {
    const tA = calculateParameterAlongLine(lineStart, lineEnd, a.point);
    const tB = calculateParameterAlongLine(lineStart, lineEnd, b.point);
    return tA - tB;
  });
  
  return intersections;
}

/**
 * Calculate parameter (0-1) of a point along a line segment
 */
function calculateParameterAlongLine(
  lineStart: CanvasPoint,
  lineEnd: CanvasPoint,
  point: CanvasPoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < 1e-10) return 0;
  
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length);
  return Math.max(0, Math.min(1, t));
}

/**
 * Split a polygon with a line, creating two new polygons
 */
export function splitPolygonWithLine(
  points: CanvasPoint[],
  lineStart: CanvasPoint,
  lineEnd: CanvasPoint
): SplitResult {
  if (points.length < 3) {
    return { success: false, polygon1: [], polygon2: [], error: 'Polygon must have at least 3 points' };
  }
  
  // Find all intersection points
  const intersections = findSplitEdgeIntersections(points, lineStart, lineEnd);
  
  if (intersections.length < 2) {
    return { success: false, polygon1: [], polygon2: [], error: 'Split line must cross exactly two edges' };
  }
  
  // Take first and last intersection (the entry and exit points)
  const int1 = intersections[0];
  const int2 = intersections[intersections.length - 1];
  
  // Make sure we're intersecting different edges
  if (int1.edgeIndex === int2.edgeIndex) {
    return { success: false, polygon1: [], polygon2: [], error: 'Split line must cross two different edges' };
  }
  
  // Build the two new polygons
  const polygon1: CanvasPoint[] = [];
  const polygon2: CanvasPoint[] = [];
  
  // Walk the polygon and build two sub-polygons
  // Polygon 1: From int1 to int2 (going forward through vertices)
  // Polygon 2: From int2 to int1 (continuing forward, wrapping around)
  
  const n = points.length;
  const edge1 = int1.edgeIndex;
  const edge2 = int2.edgeIndex;
  
  // Ensure edge1 < edge2 for consistent walking direction
  const startEdge = Math.min(edge1, edge2);
  const endEdge = Math.max(edge1, edge2);
  const startInt = edge1 < edge2 ? int1 : int2;
  const endInt = edge1 < edge2 ? int2 : int1;
  
  // Polygon 1: Start at first intersection, walk to end intersection
  polygon1.push({ ...startInt.point });
  for (let i = startEdge + 1; i <= endEdge; i++) {
    polygon1.push({ ...points[i] });
  }
  polygon1.push({ ...endInt.point });
  
  // Polygon 2: Start at end intersection, walk around to start intersection
  polygon2.push({ ...endInt.point });
  for (let i = endEdge + 1; i < n; i++) {
    polygon2.push({ ...points[i] });
  }
  for (let i = 0; i <= startEdge; i++) {
    polygon2.push({ ...points[i] });
  }
  polygon2.push({ ...startInt.point });
  
  // Clean up polygons (remove duplicate points)
  const cleanedPolygon1 = cleanupPolygon(polygon1);
  const cleanedPolygon2 = cleanupPolygon(polygon2);
  
  // Validate minimum polygon size
  if (cleanedPolygon1.length < 3 || cleanedPolygon2.length < 3) {
    return { success: false, polygon1: [], polygon2: [], error: 'Resulting polygons too small' };
  }
  
  return {
    success: true,
    polygon1: cleanedPolygon1,
    polygon2: cleanedPolygon2,
  };
}

/**
 * Remove duplicate/collinear points from polygon
 */
function cleanupPolygon(points: CanvasPoint[]): CanvasPoint[] {
  if (points.length < 3) return points;
  
  const result: CanvasPoint[] = [];
  const tolerance = 0.5; // Pixels
  
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const prev = result.length > 0 ? result[result.length - 1] : null;
    
    // Skip if too close to previous point
    if (prev && distance(current, prev) < tolerance) {
      continue;
    }
    
    result.push(current);
  }
  
  // Check if first and last are duplicates
  if (result.length > 1 && distance(result[0], result[result.length - 1]) < tolerance) {
    result.pop();
  }
  
  return result;
}

/**
 * Find which edge a point is on (or closest to)
 */
export function findEdgeForPoint(
  point: CanvasPoint,
  polygon: CanvasPoint[],
  tolerance: number = 10
): { edgeIndex: number; projectedPoint: CanvasPoint } | null {
  let closestEdge = -1;
  let closestDistance = tolerance;
  let closestProjection: CanvasPoint = point;
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const projection = projectPointOntoSegment(point, polygon[i], polygon[j]);
    const dist = distance(point, projection);
    
    if (dist < closestDistance) {
      closestDistance = dist;
      closestEdge = i;
      closestProjection = projection;
    }
  }
  
  if (closestEdge === -1) return null;
  
  return {
    edgeIndex: closestEdge,
    projectedPoint: closestProjection,
  };
}

/**
 * Project a point onto a line segment
 */
function projectPointOntoSegment(
  point: CanvasPoint,
  segStart: CanvasPoint,
  segEnd: CanvasPoint
): CanvasPoint {
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
 * Determine which resulting polygon contains a given hole (for hole assignment)
 */
export function assignHolesToPolygons(
  holes: Hole[],
  polygon1: CanvasPoint[],
  polygon2: CanvasPoint[]
): { holes1: Hole[]; holes2: Hole[] } {
  const holes1: Hole[] = [];
  const holes2: Hole[] = [];
  
  for (const hole of holes) {
    // Use centroid of hole to determine which polygon it belongs to
    const centroid = calculateCentroid(hole.points);
    
    if (isPointInPolygon(centroid, polygon1)) {
      holes1.push(hole);
    } else if (isPointInPolygon(centroid, polygon2)) {
      holes2.push(hole);
    }
    // If hole doesn't fit in either, it was likely on the split line - drop it
  }
  
  return { holes1, holes2 };
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(points: CanvasPoint[]): CanvasPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  
  let x = 0;
  let y = 0;
  
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  
  return { x: x / points.length, y: y / points.length };
}
