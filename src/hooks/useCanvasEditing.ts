import { useState, useCallback } from 'react';
import { CanvasPoint, Room } from '@/lib/canvas/types';
import { distance } from '@/lib/canvas/geometry';

interface DragState {
  type: 'vertex' | 'wall' | null;
  roomId: string | null;
  vertexIndex: number | null;
  wallIndex: number | null;
  startPoint: CanvasPoint | null;
  originalPoints: CanvasPoint[] | null;
}

interface UseCanvasEditingProps {
  rooms: Room[];
  zoom: number;
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => void;
}

export function useCanvasEditing({ rooms, zoom, onUpdateRoom }: UseCanvasEditingProps) {
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    roomId: null,
    vertexIndex: null,
    wallIndex: null,
    startPoint: null,
    originalPoints: null,
  });
  const [hoveredVertex, setHoveredVertex] = useState<{ roomId: string; index: number } | null>(null);
  const [hoveredWall, setHoveredWall] = useState<{ roomId: string; index: number } | null>(null);

  const VERTEX_HIT_RADIUS = 12 / zoom;
  const WALL_HIT_DISTANCE = 10 / zoom;

  // Find vertex at point
  const findVertexAtPoint = useCallback((point: CanvasPoint): { roomId: string; index: number } | null => {
    for (const room of rooms) {
      for (let i = 0; i < room.points.length; i++) {
        if (distance(point, room.points[i]) < VERTEX_HIT_RADIUS) {
          return { roomId: room.id, index: i };
        }
      }
    }
    return null;
  }, [rooms, VERTEX_HIT_RADIUS]);

  // Find wall segment at point
  const findWallAtPoint = useCallback((point: CanvasPoint): { roomId: string; index: number; projection: CanvasPoint } | null => {
    for (const room of rooms) {
      for (let i = 0; i < room.points.length; i++) {
        const j = (i + 1) % room.points.length;
        const p1 = room.points[i];
        const p2 = room.points[j];
        
        // Calculate projection onto line segment
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) continue;
        
        let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        
        const projection = {
          x: p1.x + t * dx,
          y: p1.y + t * dy,
        };
        
        const dist = distance(point, projection);
        
        // Only select wall if not near a vertex
        if (dist < WALL_HIT_DISTANCE && t > 0.1 && t < 0.9) {
          return { roomId: room.id, index: i, projection };
        }
      }
    }
    return null;
  }, [rooms, WALL_HIT_DISTANCE]);

  // Handle hover to show visual feedback
  const handleHover = useCallback((point: CanvasPoint) => {
    if (dragState.type) return; // Don't update hover during drag
    
    // Check vertex first (higher priority)
    const vertex = findVertexAtPoint(point);
    if (vertex) {
      setHoveredVertex(vertex);
      setHoveredWall(null);
      return 'vertex';
    }
    
    // Then check wall
    const wall = findWallAtPoint(point);
    if (wall) {
      setHoveredVertex(null);
      setHoveredWall({ roomId: wall.roomId, index: wall.index });
      return 'wall';
    }
    
    setHoveredVertex(null);
    setHoveredWall(null);
    return null;
  }, [findVertexAtPoint, findWallAtPoint, dragState.type]);

  // Start dragging
  const startDrag = useCallback((point: CanvasPoint): boolean => {
    // Check vertex first
    const vertex = findVertexAtPoint(point);
    if (vertex) {
      const room = rooms.find(r => r.id === vertex.roomId);
      if (room) {
        setDragState({
          type: 'vertex',
          roomId: vertex.roomId,
          vertexIndex: vertex.index,
          wallIndex: null,
          startPoint: point,
          originalPoints: [...room.points],
        });
        return true;
      }
    }
    
    // Then check wall
    const wall = findWallAtPoint(point);
    if (wall) {
      const room = rooms.find(r => r.id === wall.roomId);
      if (room) {
        setDragState({
          type: 'wall',
          roomId: wall.roomId,
          vertexIndex: null,
          wallIndex: wall.index,
          startPoint: point,
          originalPoints: [...room.points],
        });
        return true;
      }
    }
    
    return false;
  }, [findVertexAtPoint, findWallAtPoint, rooms]);

  // Update during drag
  const updateDrag = useCallback((point: CanvasPoint, orthoLocked: boolean) => {
    if (!dragState.type || !dragState.roomId || !dragState.startPoint || !dragState.originalPoints) {
      return;
    }
    
    const dx = point.x - dragState.startPoint.x;
    const dy = point.y - dragState.startPoint.y;
    
    // Apply ortho lock if active
    let finalDx = dx;
    let finalDy = dy;
    if (orthoLocked) {
      if (Math.abs(dx) > Math.abs(dy)) {
        finalDy = 0;
      } else {
        finalDx = 0;
      }
    }
    
    const newPoints = [...dragState.originalPoints];
    
    if (dragState.type === 'vertex' && dragState.vertexIndex !== null) {
      // Move single vertex
      newPoints[dragState.vertexIndex] = {
        x: dragState.originalPoints[dragState.vertexIndex].x + finalDx,
        y: dragState.originalPoints[dragState.vertexIndex].y + finalDy,
      };
    } else if (dragState.type === 'wall' && dragState.wallIndex !== null) {
      // Move wall segment (two vertices)
      const i = dragState.wallIndex;
      const j = (i + 1) % newPoints.length;
      
      newPoints[i] = {
        x: dragState.originalPoints[i].x + finalDx,
        y: dragState.originalPoints[i].y + finalDy,
      };
      newPoints[j] = {
        x: dragState.originalPoints[j].x + finalDx,
        y: dragState.originalPoints[j].y + finalDy,
      };
    }
    
    onUpdateRoom(dragState.roomId, { points: newPoints });
  }, [dragState, onUpdateRoom]);

  // End drag
  const endDrag = useCallback(() => {
    setDragState({
      type: null,
      roomId: null,
      vertexIndex: null,
      wallIndex: null,
      startPoint: null,
      originalPoints: null,
    });
  }, []);

  // Get cursor style
  const getEditCursor = useCallback((point: CanvasPoint): string | null => {
    if (dragState.type) {
      return 'grabbing';
    }
    
    const vertex = findVertexAtPoint(point);
    if (vertex) {
      return 'grab';
    }
    
    const wall = findWallAtPoint(point);
    if (wall) {
      return 'move';
    }
    
    return null;
  }, [dragState.type, findVertexAtPoint, findWallAtPoint]);

  return {
    dragState,
    hoveredVertex,
    hoveredWall,
    handleHover,
    startDrag,
    updateDrag,
    endDrag,
    getEditCursor,
    isDragging: dragState.type !== null,
  };
}
