import { Room, CanvasPoint } from './types';
import { distance } from './geometry';

/**
 * Represents a shared edge between two rooms
 */
export interface SharedEdge {
  room1Id: string;
  room1EdgeIndex: number;
  room2Id: string;
  room2EdgeIndex: number;
  sharedLength: number;           // Length of overlap in pixels
  overlapPercentage: number;      // How much of edge1 is shared (0-1)
  isExactMatch: boolean;          // True if edges are identical
}

/**
 * Check if two line segments are collinear (on the same infinite line)
 */
function areSegmentsCollinear(
  p1: CanvasPoint, p2: CanvasPoint,
  p3: CanvasPoint, p4: CanvasPoint,
  tolerance: number
): boolean {
  // Check if p3 and p4 are close to the line defined by p1-p2
  const lineLength = distance(p1, p2);
  if (lineLength < 0.001) return false;
  
  // Direction vector of line 1
  const dx = (p2.x - p1.x) / lineLength;
  const dy = (p2.y - p1.y) / lineLength;
  
  // Distance from p3 to line p1-p2
  const dist3 = Math.abs((p3.x - p1.x) * dy - (p3.y - p1.y) * dx);
  // Distance from p4 to line p1-p2
  const dist4 = Math.abs((p4.x - p1.x) * dy - (p4.y - p1.y) * dx);
  
  return dist3 <= tolerance && dist4 <= tolerance;
}

/**
 * Project a point onto a line segment, returning the parameter t (0-1 if on segment)
 */
function projectPointOntoLine(
  point: CanvasPoint,
  lineStart: CanvasPoint,
  lineEnd: CanvasPoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq < 0.001) return 0;
  
  return ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
}

/**
 * Calculate the overlap between two collinear segments
 * Returns { start, end } as parameters on the first segment (0-1)
 */
function calculateSegmentOverlap(
  p1: CanvasPoint, p2: CanvasPoint,  // First segment
  p3: CanvasPoint, p4: CanvasPoint   // Second segment
): { start: number; end: number } | null {
  // Project second segment endpoints onto first segment's line
  const t3 = projectPointOntoLine(p3, p1, p2);
  const t4 = projectPointOntoLine(p4, p1, p2);
  
  // Get the range of the second segment on the first segment's parameter space
  const minT = Math.min(t3, t4);
  const maxT = Math.max(t3, t4);
  
  // Calculate overlap with [0, 1] (the first segment)
  const overlapStart = Math.max(0, minT);
  const overlapEnd = Math.min(1, maxT);
  
  if (overlapStart >= overlapEnd) {
    return null; // No overlap
  }
  
  return { start: overlapStart, end: overlapEnd };
}

/**
 * Check if two edges overlap and calculate the shared portion
 */
export function edgesOverlap(
  edge1Start: CanvasPoint,
  edge1End: CanvasPoint,
  edge2Start: CanvasPoint,
  edge2End: CanvasPoint,
  tolerance: number = 5
): { sharedLength: number; overlapPercentage: number; isExactMatch: boolean } | null {
  // First check if segments are collinear
  if (!areSegmentsCollinear(edge1Start, edge1End, edge2Start, edge2End, tolerance)) {
    return null;
  }
  
  // Calculate overlap
  const overlap = calculateSegmentOverlap(edge1Start, edge1End, edge2Start, edge2End);
  if (!overlap) return null;
  
  const edge1Length = distance(edge1Start, edge1End);
  const overlapLength = (overlap.end - overlap.start) * edge1Length;
  const overlapPercentage = overlap.end - overlap.start;
  
  // Check if it's an exact match (both endpoints very close)
  const edge2Length = distance(edge2Start, edge2End);
  const isExactMatch = 
    Math.abs(edge1Length - edge2Length) < tolerance &&
    Math.abs(overlapPercentage - 1) < 0.01 &&
    (
      (distance(edge1Start, edge2Start) < tolerance && distance(edge1End, edge2End) < tolerance) ||
      (distance(edge1Start, edge2End) < tolerance && distance(edge1End, edge2Start) < tolerance)
    );
  
  return {
    sharedLength: overlapLength,
    overlapPercentage,
    isExactMatch,
  };
}

/**
 * Detect all shared edges between rooms
 */
export function detectSharedEdges(
  rooms: Room[],
  tolerance: number = 5
): SharedEdge[] {
  const sharedEdges: SharedEdge[] = [];
  
  // Compare each pair of rooms
  for (let i = 0; i < rooms.length; i++) {
    const room1 = rooms[i];
    
    for (let j = i + 1; j < rooms.length; j++) {
      const room2 = rooms[j];
      
      // Compare each edge of room1 with each edge of room2
      for (let e1 = 0; e1 < room1.points.length; e1++) {
        const p1Start = room1.points[e1];
        const p1End = room1.points[(e1 + 1) % room1.points.length];
        
        for (let e2 = 0; e2 < room2.points.length; e2++) {
          const p2Start = room2.points[e2];
          const p2End = room2.points[(e2 + 1) % room2.points.length];
          
          const overlap = edgesOverlap(p1Start, p1End, p2Start, p2End, tolerance);
          
          if (overlap && overlap.overlapPercentage > 0.1) { // At least 10% overlap
            sharedEdges.push({
              room1Id: room1.id,
              room1EdgeIndex: e1,
              room2Id: room2.id,
              room2EdgeIndex: e2,
              sharedLength: overlap.sharedLength,
              overlapPercentage: overlap.overlapPercentage,
              isExactMatch: overlap.isExactMatch,
            });
          }
        }
      }
    }
  }
  
  return sharedEdges;
}

/**
 * Get shared edges for a specific room
 */
export function getSharedEdgesForRoom(
  roomId: string,
  sharedEdges: SharedEdge[]
): Array<SharedEdge & { otherRoomId: string; thisEdgeIndex: number; otherEdgeIndex: number }> {
  return sharedEdges
    .filter(se => se.room1Id === roomId || se.room2Id === roomId)
    .map(se => {
      const isRoom1 = se.room1Id === roomId;
      return {
        ...se,
        otherRoomId: isRoom1 ? se.room2Id : se.room1Id,
        thisEdgeIndex: isRoom1 ? se.room1EdgeIndex : se.room2EdgeIndex,
        otherEdgeIndex: isRoom1 ? se.room2EdgeIndex : se.room1EdgeIndex,
      };
    });
}

/**
 * Check if a specific edge has a shared edge
 */
export function getSharedEdgeForEdge(
  roomId: string,
  edgeIndex: number,
  sharedEdges: SharedEdge[]
): (SharedEdge & { otherRoomId: string; otherEdgeIndex: number }) | null {
  for (const se of sharedEdges) {
    if (se.room1Id === roomId && se.room1EdgeIndex === edgeIndex) {
      return {
        ...se,
        otherRoomId: se.room2Id,
        otherEdgeIndex: se.room2EdgeIndex,
      };
    }
    if (se.room2Id === roomId && se.room2EdgeIndex === edgeIndex) {
      return {
        ...se,
        otherRoomId: se.room1Id,
        otherEdgeIndex: se.room1EdgeIndex,
      };
    }
  }
  return null;
}
