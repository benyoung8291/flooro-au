import { useEffect, useCallback, useState, useRef } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { CanvasPoint, Room, DEFAULT_ROOM_COLOR } from '@/lib/canvas/types';
import {
  findSnapPoint,
  applyOrthoLock,
  findAxisSnapLines,
  isPointInPolygon,
  findClosestWallSegment,
  generateRoomId,
  generateHoleId,
  generateDoorId,
  angleBetweenPoints,
} from '@/lib/canvas/geometry';
import { DOOR_WIDTHS } from '@/lib/canvas/types';

export type EditorTool = 'select' | 'draw' | 'hole' | 'door' | 'scale' | 'pan';

interface EditorCanvasProps {
  activeTool: EditorTool;
  onCanvasReady?: () => void;
  jsonData?: Record<string, unknown>;
  onDataChange?: (data: Record<string, unknown>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  materialTypes?: Map<string, string>;
}

export function EditorCanvas({
  activeTool,
  onCanvasReady,
  jsonData,
  onDataChange,
  materialTypes,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch, undo, redo, canUndo, canRedo, loadFromJson, exportToJson } = useCanvasHistory();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<CanvasPoint[]>([]);
  const [cursorPosition, setCursorPosition] = useState<CanvasPoint | null>(null);
  const [orthoLocked, setOrthoLocked] = useState(false);
  const [snapPoint, setSnapPoint] = useState<CanvasPoint | null>(null);
  const [axisSnapLines, setAxisSnapLines] = useState<{ horizontal: number | null; vertical: number | null }>({ horizontal: null, vertical: null });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<CanvasPoint | null>(null);
  const [scaleStart, setScaleStart] = useState<CanvasPoint | null>(null);
  const [selectedDoorWidth, setSelectedDoorWidth] = useState<number>(DOOR_WIDTHS[1].value);

  // Load initial data
  useEffect(() => {
    if (jsonData) {
      loadFromJson(jsonData);
    }
    onCanvasReady?.();
  }, []);

  // Notify parent of changes
  useEffect(() => {
    const data = exportToJson();
    onDataChange?.(data);
  }, [state.rooms, state.scale]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setOrthoLocked(true);
      }
      if (e.key === 'Escape') {
        setIsDrawing(false);
        setDrawingPoints([]);
        setScaleStart(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setOrthoLocked(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): CanvasPoint => {
    const { offsetX, offsetY, zoom } = state.viewTransform;
    return {
      x: (screenX - offsetX) / zoom,
      y: (screenY - offsetY) / zoom,
    };
  }, [state.viewTransform]);

  const getEventPoint = useCallback((e: React.PointerEvent): CanvasPoint => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
  }, [screenToCanvas]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const point = getEventPoint(e);

    // Middle mouse or space + click for pan
    if (e.button === 1 || (e.button === 0 && activeTool === 'pan')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button !== 0) return;

    switch (activeTool) {
      case 'select': {
        // Find clicked room
        let clickedRoom: Room | null = null;
        for (const room of state.rooms) {
          if (isPointInPolygon(point, room.points)) {
            clickedRoom = room;
            break;
          }
        }
        dispatch({ type: 'SELECT_ROOM', roomId: clickedRoom?.id || null });
        break;
      }

      case 'draw': {
        // Check for snap
        const snap = findSnapPoint(point, state.rooms);
        const actualPoint = snap || point;

        if (!isDrawing) {
          setIsDrawing(true);
          setDrawingPoints([actualPoint]);
        } else {
          // Check if closing the polygon
          const startPoint = drawingPoints[0];
          const distance = Math.sqrt(
            Math.pow(actualPoint.x - startPoint.x, 2) +
            Math.pow(actualPoint.y - startPoint.y, 2)
          );

          if (distance < 15 && drawingPoints.length >= 3) {
            // Close polygon - create room
            const newRoom: Room = {
              id: generateRoomId(),
              name: `Room ${state.rooms.length + 1}`,
              points: drawingPoints,
              holes: [],
              doors: [],
              materialId: null,
              color: DEFAULT_ROOM_COLOR,
            };
            dispatch({ type: 'ADD_ROOM', room: newRoom });
            setIsDrawing(false);
            setDrawingPoints([]);
          } else {
            // Apply ortho lock if active
            let finalPoint = actualPoint;
            if (orthoLocked && drawingPoints.length > 0) {
              finalPoint = applyOrthoLock(actualPoint, drawingPoints[drawingPoints.length - 1]);
            }
            setDrawingPoints([...drawingPoints, finalPoint]);
          }
        }
        break;
      }

      case 'hole': {
        // Must have a selected room
        if (!state.selectedRoomId) return;

        const snap = findSnapPoint(point, state.rooms);
        const actualPoint = snap || point;

        if (!isDrawing) {
          setIsDrawing(true);
          setDrawingPoints([actualPoint]);
        } else {
          const startPoint = drawingPoints[0];
          const distance = Math.sqrt(
            Math.pow(actualPoint.x - startPoint.x, 2) +
            Math.pow(actualPoint.y - startPoint.y, 2)
          );

          if (distance < 15 && drawingPoints.length >= 3) {
            // Create hole
            dispatch({
              type: 'ADD_HOLE',
              roomId: state.selectedRoomId,
              hole: {
                id: generateHoleId(),
                points: drawingPoints,
              },
            });
            setIsDrawing(false);
            setDrawingPoints([]);
          } else {
            let finalPoint = actualPoint;
            if (orthoLocked && drawingPoints.length > 0) {
              finalPoint = applyOrthoLock(actualPoint, drawingPoints[drawingPoints.length - 1]);
            }
            setDrawingPoints([...drawingPoints, finalPoint]);
          }
        }
        break;
      }

      case 'door': {
        // Find closest wall segment
        for (const room of state.rooms) {
          const wallInfo = findClosestWallSegment(point, room.points);
          if (wallInfo && wallInfo.distance < 20) {
            const p1 = room.points[wallInfo.index];
            const p2 = room.points[(wallInfo.index + 1) % room.points.length];
            const angle = angleBetweenPoints(p1, p2);

            dispatch({
              type: 'ADD_DOOR',
              roomId: room.id,
              door: {
                id: generateDoorId(),
                position: wallInfo.projectedPoint,
                width: selectedDoorWidth,
                wallIndex: wallInfo.index,
                rotation: angle,
              },
            });
            break;
          }
        }
        break;
      }

      case 'scale': {
        if (!scaleStart) {
          setScaleStart(point);
        } else {
          // Calculate scale
          const pixelLength = Math.sqrt(
            Math.pow(point.x - scaleStart.x, 2) +
            Math.pow(point.y - scaleStart.y, 2)
          );
          
          // Prompt for real-world measurement (simplified - in production, use a modal)
          const realLength = parseFloat(prompt('Enter real-world length in mm:', '1000') || '1000');
          
          if (realLength > 0 && pixelLength > 0) {
            dispatch({
              type: 'SET_SCALE',
              scale: {
                pixelLength,
                realWorldLength: realLength,
                pixelsPerMm: pixelLength / realLength,
              },
            });
          }
          setScaleStart(null);
        }
        break;
      }
    }
  }, [activeTool, isDrawing, drawingPoints, state.rooms, state.selectedRoomId, orthoLocked, selectedDoorWidth, scaleStart, getEventPoint, dispatch]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const point = getEventPoint(e);

    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      dispatch({
        type: 'SET_VIEW_TRANSFORM',
        transform: {
          offsetX: state.viewTransform.offsetX + dx,
          offsetY: state.viewTransform.offsetY + dy,
        },
      });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Update cursor position
    let finalPoint = point;
    
    if (orthoLocked && drawingPoints.length > 0) {
      finalPoint = applyOrthoLock(point, drawingPoints[drawingPoints.length - 1]);
    }

    // Check for snapping
    const snap = findSnapPoint(finalPoint, state.rooms);
    setSnapPoint(snap);
    
    if (snap) {
      finalPoint = snap;
    }

    // Check for axis snap lines
    const axisSnap = findAxisSnapLines(finalPoint, state.rooms);
    setAxisSnapLines(axisSnap);
    
    if (axisSnap.horizontal !== null) {
      finalPoint = { ...finalPoint, y: axisSnap.horizontal };
    }
    if (axisSnap.vertical !== null) {
      finalPoint = { ...finalPoint, x: axisSnap.vertical };
    }

    setCursorPosition(finalPoint);
  }, [isPanning, panStart, orthoLocked, drawingPoints, state.rooms, state.viewTransform, getEventPoint, dispatch]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, state.viewTransform.zoom * delta));
    
    // Zoom towards cursor
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const oldZoom = state.viewTransform.zoom;
    const newOffsetX = mouseX - (mouseX - state.viewTransform.offsetX) * (newZoom / oldZoom);
    const newOffsetY = mouseY - (mouseY - state.viewTransform.offsetY) * (newZoom / oldZoom);
    
    dispatch({
      type: 'SET_VIEW_TRANSFORM',
      transform: {
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      },
    });
  }, [state.viewTransform, dispatch]);

  // Handle drag and drop for materials
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const materialId = e.dataTransfer.getData('materialId');
    const materialType = e.dataTransfer.getData('materialType');
    
    if (materialId && state.selectedRoomId) {
      dispatch({ type: 'ASSIGN_MATERIAL', roomId: state.selectedRoomId, materialId });
    }
  }, [state.selectedRoomId, dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const getCursor = (): string => {
    if (isPanning) return 'grabbing';
    switch (activeTool) {
      case 'draw':
      case 'hole':
        return 'crosshair';
      case 'pan':
        return 'grab';
      case 'scale':
        return scaleStart ? 'crosshair' : 'help';
      case 'door':
        return 'pointer';
      default:
        return 'default';
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ cursor: getCursor() }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <CanvasRenderer
        state={state}
        drawingPoints={drawingPoints}
        cursorPosition={cursorPosition}
        isDrawing={isDrawing}
        orthoLocked={orthoLocked}
        snapPoint={snapPoint}
        axisSnapLines={axisSnapLines}
        materialTypes={materialTypes}
      />

      {/* Drawing indicator */}
      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium animate-pulse">
          {activeTool === 'hole' ? 'Drawing hole' : 'Drawing room'} • Click near start to close • Esc to cancel
          {orthoLocked && ' • ORTHO'}
        </div>
      )}

      {/* Scale calibration indicator */}
      {activeTool === 'scale' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {scaleStart ? 'Click second point to set scale' : 'Click first point of reference line'}
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 px-2 py-1 rounded bg-background/80 backdrop-blur text-xs text-muted-foreground">
        {Math.round(state.viewTransform.zoom * 100)}%
      </div>

      {/* Door width selector when door tool is active */}
      {activeTool === 'door' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-background/90 backdrop-blur rounded-lg p-2 border shadow-lg">
          {DOOR_WIDTHS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setSelectedDoorWidth(value)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedDoorWidth === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
