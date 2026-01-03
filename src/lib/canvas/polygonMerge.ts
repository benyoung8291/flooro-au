import { Room, CanvasPoint } from './types';
import { SharedEdge, edgesOverlap } from './sharedEdgeDetector';
import { distance } from './geometry';

export interface MergeResult {
  success: boolean;
  mergedPoints: CanvasPoint[];
  error?: string;
}

/**
 * Check if two points are approximately equal
 */
function pointsEqual(p1: CanvasPoint, p2: CanvasPoint, tolerance: number = 2): boolean {
  return distance(p1, p2) < tolerance;
}

/**
 * Remove duplicate consecutive points from a polygon
 */
function removeDuplicatePoints(points: CanvasPoint[], tolerance: number = 2): CanvasPoint[] {
  if (points.length < 2) return points;
  
  const result: CanvasPoint[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    if (!pointsEqual(points[i], result[result.length - 1], tolerance)) {
      result.push(points[i]);
    }
  }
  
  // Check if last point duplicates first
  if (result.length > 1 && pointsEqual(result[result.length - 1], result[0], tolerance)) {
    result.pop();
  }
  
  return result;
}

/**
 * Check if three points are collinear
 */
function areCollinear(p1: CanvasPoint, p2: CanvasPoint, p3: CanvasPoint, tolerance: number = 1): boolean {
  // Cross product should be near zero for collinear points
  const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  const length = Math.max(distance(p1, p2), distance(p2, p3));
  // Normalize by length to get area-like tolerance
  return Math.abs(cross) / (length + 0.001) < tolerance;
}

/**
 * Remove collinear points from a polygon (simplify)
 */
function removeCollinearPoints(points: CanvasPoint[]): CanvasPoint[] {
  if (points.length < 4) return points;
  
  const result: CanvasPoint[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    
    if (!areCollinear(prev, curr, next)) {
      result.push(curr);
    }
  }
  
  return result.length >= 3 ? result : points;
}

/**
 * Clean up the merged polygon
 */
function cleanupPolygon(points: CanvasPoint[]): CanvasPoint[] {
  let result = removeDuplicatePoints(points);
  result = removeCollinearPoints(result);
  return result;
}

/**
 * Find the closest vertex in the other polygon to a given point
 */
function findClosestVertexIndex(point: CanvasPoint, points: CanvasPoint[]): number {
  let minDist = Infinity;
  let minIndex = 0;
  
  for (let i = 0; i < points.length; i++) {
    const d = distance(point, points[i]);
    if (d < minDist) {
      minDist = d;
      minIndex = i;
    }
  }
  
  return minIndex;
}

/**
 * Get the winding direction of a polygon (positive = CCW, negative = CW)
 */
function getPolygonWindingArea(points: CanvasPoint[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += (points[j].x - points[i].x) * (points[j].y + points[i].y);
  }
  return area;
}

/**
 * Merge two rooms at their shared edge
 */
export function mergeRoomsAtSharedEdge(
  room1: Room,
  room2: Room,
  sharedEdge: SharedEdge
): MergeResult {
  const points1 = room1.points;
  const points2 = room2.points;
  
  if (points1.length < 3 || points2.length < 3) {
    return { success: false, mergedPoints: [], error: 'Rooms must have at least 3 vertices' };
  }
  
  // Determine which room/edge indices to use
  const isRoom1First = sharedEdge.room1Id === room1.id;
  const edge1Index = isRoom1First ? sharedEdge.room1EdgeIndex : sharedEdge.room2EdgeIndex;
  const edge2Index = isRoom1First ? sharedEdge.room2EdgeIndex : sharedEdge.room1EdgeIndex;
  
  // Get the shared edge endpoints for both rooms
  const edge1Start = points1[edge1Index];
  const edge1End = points1[(edge1Index + 1) % points1.length];
  const edge2Start = points2[edge2Index];
  const edge2End = points2[(edge2Index + 1) % points2.length];
  
  // Determine if edges are in opposite directions (they should be for adjacent rooms)
  // Adjacent rooms share an edge but traverse it in opposite directions
  const sameDirection = distance(edge1Start, edge2Start) < distance(edge1Start, edge2End);
  
  // Build the merged polygon by walking around room1, then jumping to room2
  const mergedPoints: CanvasPoint[] = [];
  
  // Start after the shared edge end of room1 and walk around
  // We skip the shared edge by starting from (edge1Index + 1) and going to edge1Index
  const n1 = points1.length;
  const n2 = points2.length;
  
  // Walk room1: from the vertex after shared edge end, around to shared edge start
  for (let i = 0; i < n1 - 1; i++) {
    const idx = (edge1Index + 1 + i) % n1;
    mergedPoints.push(points1[idx]);
  }
  
  // Now jump to room2 and walk around it, skipping its shared edge
  // If same direction: start from edge2End, walk to edge2Start
  // If opposite direction: start from edge2Start + 1, walk around
  
  if (sameDirection) {
    // Edges go same direction - walk room2 backward
    for (let i = 0; i < n2 - 1; i++) {
      const idx = (edge2Index + n2 - i) % n2;
      mergedPoints.push(points2[idx]);
    }
  } else {
    // Edges go opposite directions (normal case for adjacent rooms)
    // Walk room2 forward, starting after its shared edge
    for (let i = 0; i < n2 - 1; i++) {
      const idx = (edge2Index + 1 + i) % n2;
      mergedPoints.push(points2[idx]);
    }
  }
  
  // Clean up the result
  const cleanedPoints = cleanupPolygon(mergedPoints);
  
  if (cleanedPoints.length < 3) {
    return { success: false, mergedPoints: [], error: 'Merged polygon has too few vertices' };
  }
  
  return { success: true, mergedPoints: cleanedPoints };
}

/**
 * Find the shared edge between two specific rooms
 */
export function findSharedEdgeBetweenRooms(
  room1: Room,
  room2: Room,
  tolerance: number = 5
): SharedEdge | null {
  // Compare each edge of room1 with each edge of room2
  for (let e1 = 0; e1 < room1.points.length; e1++) {
    const p1Start = room1.points[e1];
    const p1End = room1.points[(e1 + 1) % room1.points.length];
    
    for (let e2 = 0; e2 < room2.points.length; e2++) {
      const p2Start = room2.points[e2];
      const p2End = room2.points[(e2 + 1) % room2.points.length];
      
      const overlap = edgesOverlap(p1Start, p1End, p2Start, p2End, tolerance);
      
      if (overlap && overlap.overlapPercentage > 0.1) {
        return {
          room1Id: room1.id,
          room1EdgeIndex: e1,
          room2Id: room2.id,
          room2EdgeIndex: e2,
          sharedLength: overlap.sharedLength,
          overlapPercentage: overlap.overlapPercentage,
          isExactMatch: overlap.isExactMatch,
        };
      }
    }
  }
  
  return null;
}
