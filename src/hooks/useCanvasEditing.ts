import { useState, useCallback, useRef } from 'react';
import { CanvasPoint, Room, EdgeCurve } from '@/lib/canvas/types';
import { distance, calculateDefaultControlPoint } from '@/lib/canvas/geometry';

interface DragState {
  type: 'vertex' | 'wall' | 'curveControl' | 'holeVertex' | 'holeWall' | null;
  roomId: string | null;
  holeId: string | null;
  vertexIndex: number | null;
  wallIndex: number | null;
  edgeIndex: number | null;
  startPoint: CanvasPoint | null;
  originalPoints: CanvasPoint[] | null;
  originalControlPoint: CanvasPoint | null;
}

interface HoveredCurveControl {
  roomId: string;
  edgeIndex: number;
  isHandle: boolean;
}

export interface HoveredHoleVertex {
  roomId: string;
  holeId: string;
  index: number;
}

export interface HoveredHoleWall {
  roomId: string;
  holeId: string;
  index: number;
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
    holeId: null,
    vertexIndex: null,
    wallIndex: null,
    edgeIndex: null,
    startPoint: null,
    originalPoints: null,
    originalControlPoint: null,
  });
  const [hoveredVertex, setHoveredVertex] = useState<{ roomId: string; index: number } | null>(null);
  const [hoveredWall, setHoveredWall] = useState<{ roomId: string; index: number } | null>(null);
  const [hoveredCurveControl, setHoveredCurveControl] = useState<HoveredCurveControl | null>(null);
  const [hoveredHoleVertex, setHoveredHoleVertex] = useState<HoveredHoleVertex | null>(null);
  const [hoveredHoleWall, setHoveredHoleWall] = useState<HoveredHoleWall | null>(null);

  const VERTEX_HIT_RADIUS = 12 / zoom;
  const WALL_HIT_DISTANCE = 10 / zoom;
  const CURVE_CONTROL_HIT_RADIUS = 14 / zoom;
  const HOLE_VERTEX_HIT_RADIUS = 10 / zoom;
  const HOLE_WALL_HIT_DISTANCE = 8 / zoom;

  // Find hole vertex at point (highest priority for selected rooms)
  const findHoleVertexAtPoint = useCallback((point: CanvasPoint): HoveredHoleVertex | null => {
    for (const room of rooms) {
      for (const hole of room.holes) {
        for (let i = 0; i < hole.points.length; i++) {
          if (distance(point, hole.points[i]) < HOLE_VERTEX_HIT_RADIUS) {
            return { roomId: room.id, holeId: hole.id, index: i };
          }
        }
      }
    }
    return null;
  }, [rooms, HOLE_VERTEX_HIT_RADIUS]);

  // Find hole wall segment at point
  const findHoleWallAtPoint = useCallback((point: CanvasPoint): HoveredHoleWall | null => {
    for (const room of rooms) {
      for (const hole of room.holes) {
        for (let i = 0; i < hole.points.length; i++) {
          const j = (i + 1) % hole.points.length;
          const p1 = hole.points[i];
          const p2 = hole.points[j];

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const lengthSq = dx * dx + dy * dy;
          if (lengthSq === 0) continue;

          let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq;
          t = Math.max(0, Math.min(1, t));

          const projection = { x: p1.x + t * dx, y: p1.y + t * dy };
          const dist = distance(point, projection);

          if (dist < HOLE_WALL_HIT_DISTANCE && t > 0.1 && t < 0.9) {
            return { roomId: room.id, holeId: hole.id, index: i };
          }
        }
      }
    }
    return null;
  }, [rooms, HOLE_WALL_HIT_DISTANCE]);

  // Find curve control point at position
  const findCurveControlAtPoint = useCallback((point: CanvasPoint): HoveredCurveControl | null => {
    for (const room of rooms) {
      if (!room.edgeCurves) continue;
      for (let i = 0; i < room.edgeCurves.length; i++) {
        const curve = room.edgeCurves[i];
        if (curve?.type === 'quadratic' && curve.controlPoint) {
          if (distance(point, curve.controlPoint) < CURVE_CONTROL_HIT_RADIUS) {
            return { roomId: room.id, edgeIndex: i, isHandle: true };
          }
        }
      }
    }
    return null;
  }, [rooms, CURVE_CONTROL_HIT_RADIUS]);

  // Find edge midpoint for adding curve
  const findEdgeMidpointAtPoint = useCallback((point: CanvasPoint): HoveredCurveControl | null => {
    for (const room of rooms) {
      for (let i = 0; i < room.points.length; i++) {
        const j = (i + 1) % room.points.length;
        const p1 = room.points[i];
        const p2 = room.points[j];
        if (room.edgeCurves?.[i]?.type === 'quadratic') continue;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        if (distance(point, { x: midX, y: midY }) < CURVE_CONTROL_HIT_RADIUS) {
          return { roomId: room.id, edgeIndex: i, isHandle: false };
        }
      }
    }
    return null;
  }, [rooms, CURVE_CONTROL_HIT_RADIUS]);

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
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lengthSq = dx * dx + dy * dy;
        if (lengthSq === 0) continue;
        let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        const projection = { x: p1.x + t * dx, y: p1.y + t * dy };
        const dist = distance(point, projection);
        if (dist < WALL_HIT_DISTANCE && t > 0.1 && t < 0.9) {
          return { roomId: room.id, index: i, projection };
        }
      }
    }
    return null;
  }, [rooms, WALL_HIT_DISTANCE]);

  // Handle hover - priority: holeVertex > holeWall > curveControl > vertex > edgeMidpoint > wall
  const handleHover = useCallback((point: CanvasPoint) => {
    if (dragState.type) return;

    // Check hole vertices first
    const holeVertex = findHoleVertexAtPoint(point);
    if (holeVertex) {
      setHoveredHoleVertex(holeVertex);
      setHoveredHoleWall(null);
      setHoveredCurveControl(null);
      setHoveredVertex(null);
      setHoveredWall(null);
      return 'holeVertex';
    }

    // Check hole walls
    const holeWall = findHoleWallAtPoint(point);
    if (holeWall) {
      setHoveredHoleWall(holeWall);
      setHoveredHoleVertex(null);
      setHoveredCurveControl(null);
      setHoveredVertex(null);
      setHoveredWall(null);
      return 'holeWall';
    }

    // Check curve control
    const curveControl = findCurveControlAtPoint(point);
    if (curveControl) {
      setHoveredCurveControl(curveControl);
      setHoveredHoleVertex(null);
      setHoveredHoleWall(null);
      setHoveredVertex(null);
      setHoveredWall(null);
      return 'curveControl';
    }

    // Check vertex
    const vertex = findVertexAtPoint(point);
    if (vertex) {
      setHoveredVertex(vertex);
      setHoveredHoleVertex(null);
      setHoveredHoleWall(null);
      setHoveredWall(null);
      setHoveredCurveControl(null);
      return 'vertex';
    }

    // Check edge midpoint
    const edgeMidpoint = findEdgeMidpointAtPoint(point);
    if (edgeMidpoint) {
      setHoveredCurveControl(edgeMidpoint);
      setHoveredHoleVertex(null);
      setHoveredHoleWall(null);
      setHoveredVertex(null);
      setHoveredWall(null);
      return 'edgeMidpoint';
    }

    // Check wall
    const wall = findWallAtPoint(point);
    if (wall) {
      setHoveredWall({ roomId: wall.roomId, index: wall.index });
      setHoveredHoleVertex(null);
      setHoveredHoleWall(null);
      setHoveredVertex(null);
      setHoveredCurveControl(null);
      return 'wall';
    }

    setHoveredVertex(null);
    setHoveredWall(null);
    setHoveredCurveControl(null);
    setHoveredHoleVertex(null);
    setHoveredHoleWall(null);
    return null;
  }, [findHoleVertexAtPoint, findHoleWallAtPoint, findVertexAtPoint, findWallAtPoint, findCurveControlAtPoint, findEdgeMidpointAtPoint, dragState.type]);

  // Add curve to an edge
  const addCurveToEdge = useCallback((roomId: string, edgeIndex: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const p1 = room.points[edgeIndex];
    const p2 = room.points[(edgeIndex + 1) % room.points.length];
    const controlPoint = calculateDefaultControlPoint(p1, p2);
    const newEdgeCurves: EdgeCurve[] = [...(room.edgeCurves || [])];
    while (newEdgeCurves.length <= edgeIndex) {
      newEdgeCurves.push({ type: 'straight' });
    }
    newEdgeCurves[edgeIndex] = { type: 'quadratic', controlPoint };
    onUpdateRoom(roomId, { edgeCurves: newEdgeCurves });
  }, [rooms, onUpdateRoom]);

  // Remove curve from an edge
  const removeCurveFromEdge = useCallback((roomId: string, edgeIndex: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.edgeCurves) return;
    const newEdgeCurves = [...room.edgeCurves];
    newEdgeCurves[edgeIndex] = { type: 'straight' };
    onUpdateRoom(roomId, { edgeCurves: newEdgeCurves });
  }, [rooms, onUpdateRoom]);

  // Start dragging - priority: holeVertex > holeWall > curveControl > vertex > wall
  const startDrag = useCallback((point: CanvasPoint): boolean => {
    // Check hole vertex
    const holeVertex = findHoleVertexAtPoint(point);
    if (holeVertex) {
      const room = rooms.find(r => r.id === holeVertex.roomId);
      const hole = room?.holes.find(h => h.id === holeVertex.holeId);
      if (hole) {
        setDragState({
          type: 'holeVertex',
          roomId: holeVertex.roomId,
          holeId: holeVertex.holeId,
          vertexIndex: holeVertex.index,
          wallIndex: null,
          edgeIndex: null,
          startPoint: point,
          originalPoints: [...hole.points],
          originalControlPoint: null,
        });
        return true;
      }
    }

    // Check hole wall
    const holeWall = findHoleWallAtPoint(point);
    if (holeWall) {
      const room = rooms.find(r => r.id === holeWall.roomId);
      const hole = room?.holes.find(h => h.id === holeWall.holeId);
      if (hole) {
        setDragState({
          type: 'holeWall',
          roomId: holeWall.roomId,
          holeId: holeWall.holeId,
          vertexIndex: null,
          wallIndex: holeWall.index,
          edgeIndex: null,
          startPoint: point,
          originalPoints: [...hole.points],
          originalControlPoint: null,
        });
        return true;
      }
    }

    // Check curve control
    const curveControl = findCurveControlAtPoint(point);
    if (curveControl) {
      const room = rooms.find(r => r.id === curveControl.roomId);
      if (room) {
        const curve = room.edgeCurves?.[curveControl.edgeIndex];
        setDragState({
          type: 'curveControl',
          roomId: curveControl.roomId,
          holeId: null,
          vertexIndex: null,
          wallIndex: null,
          edgeIndex: curveControl.edgeIndex,
          startPoint: point,
          originalPoints: null,
          originalControlPoint: curve?.controlPoint || null,
        });
        return true;
      }
    }

    // Check edge midpoint (add new curve)
    const edgeMidpoint = findEdgeMidpointAtPoint(point);
    if (edgeMidpoint && !edgeMidpoint.isHandle) {
      addCurveToEdge(edgeMidpoint.roomId, edgeMidpoint.edgeIndex);
      const room = rooms.find(r => r.id === edgeMidpoint.roomId);
      if (room) {
        const p1 = room.points[edgeMidpoint.edgeIndex];
        const p2 = room.points[(edgeMidpoint.edgeIndex + 1) % room.points.length];
        const controlPoint = calculateDefaultControlPoint(p1, p2);
        setDragState({
          type: 'curveControl',
          roomId: edgeMidpoint.roomId,
          holeId: null,
          vertexIndex: null,
          wallIndex: null,
          edgeIndex: edgeMidpoint.edgeIndex,
          startPoint: point,
          originalPoints: null,
          originalControlPoint: controlPoint,
        });
        return true;
      }
    }

    // Check vertex
    const vertex = findVertexAtPoint(point);
    if (vertex) {
      const room = rooms.find(r => r.id === vertex.roomId);
      if (room) {
        setDragState({
          type: 'vertex',
          roomId: vertex.roomId,
          holeId: null,
          vertexIndex: vertex.index,
          wallIndex: null,
          edgeIndex: null,
          startPoint: point,
          originalPoints: [...room.points],
          originalControlPoint: null,
        });
        return true;
      }
    }

    // Check wall
    const wall = findWallAtPoint(point);
    if (wall) {
      const room = rooms.find(r => r.id === wall.roomId);
      if (room) {
        setDragState({
          type: 'wall',
          roomId: wall.roomId,
          holeId: null,
          vertexIndex: null,
          wallIndex: wall.index,
          edgeIndex: null,
          startPoint: point,
          originalPoints: [...room.points],
          originalControlPoint: null,
        });
        return true;
      }
    }

    return false;
  }, [findHoleVertexAtPoint, findHoleWallAtPoint, findVertexAtPoint, findWallAtPoint, findCurveControlAtPoint, findEdgeMidpointAtPoint, rooms, addCurveToEdge]);

  // Update during drag
  const updateDrag = useCallback((point: CanvasPoint, orthoLocked: boolean) => {
    if (!dragState.type || !dragState.roomId || !dragState.startPoint) return;

    const dx = point.x - dragState.startPoint.x;
    const dy = point.y - dragState.startPoint.y;
    let finalDx = dx;
    let finalDy = dy;
    if (orthoLocked) {
      if (Math.abs(dx) > Math.abs(dy)) {
        finalDy = 0;
      } else {
        finalDx = 0;
      }
    }

    // Curve control drag
    if (dragState.type === 'curveControl' && dragState.edgeIndex !== null) {
      const room = rooms.find(r => r.id === dragState.roomId);
      if (!room) return;
      const newEdgeCurves: EdgeCurve[] = [...(room.edgeCurves || [])];
      while (newEdgeCurves.length <= dragState.edgeIndex) {
        newEdgeCurves.push({ type: 'straight' });
      }
      const originalControl = dragState.originalControlPoint || { x: 0, y: 0 };
      newEdgeCurves[dragState.edgeIndex] = {
        type: 'quadratic',
        controlPoint: {
          x: originalControl.x + finalDx,
          y: originalControl.y + finalDy,
        },
      };
      onUpdateRoom(dragState.roomId, { edgeCurves: newEdgeCurves });
      return;
    }

    // Hole vertex drag
    if (dragState.type === 'holeVertex' && dragState.holeId && dragState.vertexIndex !== null && dragState.originalPoints) {
      const room = rooms.find(r => r.id === dragState.roomId);
      if (!room) return;
      const updatedHoles = room.holes.map(h => {
        if (h.id === dragState.holeId) {
          const newPoints = [...dragState.originalPoints!];
          newPoints[dragState.vertexIndex!] = {
            x: dragState.originalPoints![dragState.vertexIndex!].x + finalDx,
            y: dragState.originalPoints![dragState.vertexIndex!].y + finalDy,
          };
          return { ...h, points: newPoints };
        }
        return h;
      });
      onUpdateRoom(dragState.roomId, { holes: updatedHoles });
      return;
    }

    // Hole wall drag
    if (dragState.type === 'holeWall' && dragState.holeId && dragState.wallIndex !== null && dragState.originalPoints) {
      const room = rooms.find(r => r.id === dragState.roomId);
      if (!room) return;
      const i = dragState.wallIndex;
      const j = (i + 1) % dragState.originalPoints.length;
      const updatedHoles = room.holes.map(h => {
        if (h.id === dragState.holeId) {
          const newPoints = [...dragState.originalPoints!];
          newPoints[i] = {
            x: dragState.originalPoints![i].x + finalDx,
            y: dragState.originalPoints![i].y + finalDy,
          };
          newPoints[j] = {
            x: dragState.originalPoints![j].x + finalDx,
            y: dragState.originalPoints![j].y + finalDy,
          };
          return { ...h, points: newPoints };
        }
        return h;
      });
      onUpdateRoom(dragState.roomId, { holes: updatedHoles });
      return;
    }

    // Room vertex/wall drag
    if (!dragState.originalPoints) return;
    const newPoints = [...dragState.originalPoints];

    if (dragState.type === 'vertex' && dragState.vertexIndex !== null) {
      newPoints[dragState.vertexIndex] = {
        x: dragState.originalPoints[dragState.vertexIndex].x + finalDx,
        y: dragState.originalPoints[dragState.vertexIndex].y + finalDy,
      };
    } else if (dragState.type === 'wall' && dragState.wallIndex !== null) {
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
  }, [dragState, onUpdateRoom, rooms]);

  // End drag
  const endDrag = useCallback(() => {
    setDragState({
      type: null,
      roomId: null,
      holeId: null,
      vertexIndex: null,
      wallIndex: null,
      edgeIndex: null,
      startPoint: null,
      originalPoints: null,
      originalControlPoint: null,
    });
  }, []);

  // Handle double-click to remove curve
  const handleDoubleClick = useCallback((point: CanvasPoint): boolean => {
    const curveControl = findCurveControlAtPoint(point);
    if (curveControl && curveControl.isHandle) {
      removeCurveFromEdge(curveControl.roomId, curveControl.edgeIndex);
      return true;
    }
    return false;
  }, [findCurveControlAtPoint, removeCurveFromEdge]);

  // Get cursor style
  const getEditCursor = useCallback((point: CanvasPoint): string | null => {
    if (dragState.type) return 'grabbing';

    const holeVertex = findHoleVertexAtPoint(point);
    if (holeVertex) return 'grab';

    const holeWall = findHoleWallAtPoint(point);
    if (holeWall) return 'move';

    const curveControl = findCurveControlAtPoint(point);
    if (curveControl) return 'grab';

    const edgeMidpoint = findEdgeMidpointAtPoint(point);
    if (edgeMidpoint) return 'pointer';

    const vertex = findVertexAtPoint(point);
    if (vertex) return 'grab';

    const wall = findWallAtPoint(point);
    if (wall) return 'move';

    return null;
  }, [dragState.type, findHoleVertexAtPoint, findHoleWallAtPoint, findVertexAtPoint, findWallAtPoint, findCurveControlAtPoint, findEdgeMidpointAtPoint]);

  return {
    dragState,
    hoveredVertex,
    hoveredWall,
    hoveredCurveControl,
    hoveredHoleVertex,
    hoveredHoleWall,
    handleHover,
    startDrag,
    updateDrag,
    endDrag,
    handleDoubleClick,
    getEditCursor,
    isDragging: dragState.type !== null,
    addCurveToEdge,
    removeCurveFromEdge,
  };
}
