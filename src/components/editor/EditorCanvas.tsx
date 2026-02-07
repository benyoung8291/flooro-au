import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import { Minimap } from './Minimap';
import { DimensionInputOverlay } from './DimensionInputOverlay';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { useCanvasEditing } from '@/hooks/useCanvasEditing';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { CanvasPoint, Room, DEFAULT_ROOM_COLOR, BackgroundImage, DimensionUnit, EdgeCurve, SnapSettings, DEFAULT_SNAP_SETTINGS, EdgeTransition, ProjectMaterial } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { StripPlanResult } from '@/lib/rollGoods/types';
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
  findSmartSnapPoint,
  getGridSizeInPixels,
  distance,
} from '@/lib/canvas/geometry';
import { detectSharedEdges, detectSharedEdgesForNewRoom } from '@/lib/canvas/sharedEdgeDetector';
import { mergeRoomsAtSharedEdge, findSharedEdgeBetweenRooms } from '@/lib/canvas/polygonMerge';
import { splitPolygonWithLine, findEdgeForPoint, assignHolesToPolygons } from '@/lib/canvas/polygonSplit';
import { DOOR_WIDTHS } from '@/lib/canvas/types';
import { FinishesLegend } from '@/components/reports/FinishesLegend';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

const SNAP_SETTINGS_KEY = 'flooro_snap_settings';


export type EditorTool = 'select' | 'draw' | 'rectangle' | 'hole' | 'door' | 'scale' | 'pan' | 'merge' | 'split';

interface EditorCanvasProps {
  activeTool: EditorTool;
  onToolChange?: (tool: EditorTool) => void;
  onCanvasReady?: () => void;
  jsonData?: Record<string, unknown>;
  onDataChange?: (data: Record<string, unknown>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  materialTypes?: Map<string, string>;
  materials?: Material[];
  backgroundImage?: BackgroundImage | null;
  onSetBackgroundImage?: (image: BackgroundImage) => void;
  onUpdateBackgroundImage?: (updates: Partial<BackgroundImage>) => void;
  onRemoveBackgroundImage?: () => void;
  showFinishesLegend?: boolean;
  showDimensionLabels?: boolean;
  dimensionUnit?: DimensionUnit;
  stripPlans?: Map<string, StripPlanResult>;
  showSeamLines?: boolean;
  // Snap settings - controlled by parent via toolbar
  snapSettings?: SnapSettings;
  onSnapSettingsChange?: (settings: SnapSettings) => void;
  // Project materials for canvas badges
  projectMaterials?: ProjectMaterial[];
}

export function EditorCanvas({
  activeTool,
  onToolChange,
  onCanvasReady,
  jsonData,
  onDataChange,
  materialTypes,
  materials = [],
  backgroundImage,
  onSetBackgroundImage,
  onUpdateBackgroundImage,
  onRemoveBackgroundImage,
  showFinishesLegend = false,
  showDimensionLabels = true,
  dimensionUnit = 'm',
  stripPlans,
  showSeamLines = true,
  snapSettings: externalSnapSettings,
  onSnapSettingsChange,
  projectMaterials = [],
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const hasInitializedRef = useRef(false);
  const hasAppliedZoomRef = useRef(false);
  const lastJsonDataRef = useRef<Record<string, unknown> | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExportedDataRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);
  const { state, dispatch, undo, redo, canUndo, canRedo, loadFromJson, exportToJson, fitToView, animateViewTransform } = useCanvasHistory();

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<CanvasPoint[]>([]);
  const [cursorPosition, setCursorPosition] = useState<CanvasPoint | null>(null);
  const [orthoLocked, setOrthoLocked] = useState(false);
  const [snapPoint, setSnapPoint] = useState<CanvasPoint | null>(null);
  const [snapType, setSnapType] = useState<'vertex' | 'grid' | 'axis' | 'drawing' | null>(null);
  const [axisSnapLines, setAxisSnapLines] = useState<{ horizontal: number | null; vertical: number | null }>({ horizontal: null, vertical: null });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<CanvasPoint | null>(null);
  const [scaleStart, setScaleStart] = useState<CanvasPoint | null>(null);
  const [selectedDoorWidth, setSelectedDoorWidth] = useState<number>(DOOR_WIDTHS[1].value);
  const [isTouchGesture, setIsTouchGesture] = useState(false);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [isDraggingMaterial, setIsDraggingMaterial] = useState(false);
  const [dragTargetRoomId, setDragTargetRoomId] = useState<string | null>(null);
  
  // Scale input modal state
  const [scaleInputOpen, setScaleInputOpen] = useState(false);
  const [scaleInputValue, setScaleInputValue] = useState('');
  const [scaleInputUnit, setScaleInputUnit] = useState<'mm' | 'cm' | 'm'>('m');
  const [pendingScalePixelLength, setPendingScalePixelLength] = useState<number | null>(null);

  // Rectangle tool state
  const [rectangleStart, setRectangleStart] = useState<CanvasPoint | null>(null);
  
  // Snap settings state - use external if provided, otherwise use local state
  const [localSnapSettings, setLocalSnapSettings] = useState<SnapSettings>(() => {
    const saved = localStorage.getItem(SNAP_SETTINGS_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_SNAP_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SNAP_SETTINGS;
      }
    }
    return DEFAULT_SNAP_SETTINGS;
  });
  
  const snapSettings = externalSnapSettings || localSnapSettings;
  const setSnapSettings = onSnapSettingsChange || setLocalSnapSettings;
  
  const [tempSnapDisabled, setTempSnapDisabled] = useState(false); // Alt key held
  const [showDimensionInput, setShowDimensionInput] = useState(false);
  
  // Merge tool state
  const [mergeFirstRoom, setMergeFirstRoom] = useState<Room | null>(null);
  const [mergeableRoomIds, setMergeableRoomIds] = useState<string[]>([]);

  // Split tool state
  const [splitRoom, setSplitRoom] = useState<Room | null>(null);
  const [splitStartPoint, setSplitStartPoint] = useState<CanvasPoint | null>(null);
  const [splitPreviewEnd, setSplitPreviewEnd] = useState<CanvasPoint | null>(null);
  const [splitStartEdge, setSplitStartEdge] = useState<number | null>(null);

  // Persist snap settings
  useEffect(() => {
    localStorage.setItem(SNAP_SETTINGS_KEY, JSON.stringify(snapSettings));
  }, [snapSettings]);

  // Effective snap settings (respects temp disable)
  const effectiveSnapSettings = useMemo(() => ({
    ...snapSettings,
    enabled: snapSettings.enabled && !tempSnapDisabled,
  }), [snapSettings, tempSnapDisabled]);

  // Grid size in pixels for rendering
  const gridSizePx = useMemo(() => {
    if (!snapSettings.gridEnabled || !snapSettings.enabled) return 0;
    return getGridSizeInPixels(snapSettings.gridSize, state.scale);
  }, [snapSettings.gridEnabled, snapSettings.enabled, snapSettings.gridSize, state.scale]);

  // Detect shared edges for merge tool
  const sharedEdges = useMemo(() => {
    return detectSharedEdges(state.rooms);
  }, [state.rooms]);

  // Canvas editing hook for vertex and wall dragging
  const handleUpdateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    dispatch({ type: 'UPDATE_ROOM', roomId, updates });
  }, [dispatch]);

  const {
    hoveredVertex,
    hoveredWall,
    hoveredCurveControl,
    handleHover,
    startDrag,
    updateDrag,
    endDrag,
    handleDoubleClick,
    getEditCursor,
    isDragging,
  } = useCanvasEditing({
    rooms: state.rooms,
    zoom: state.viewTransform.zoom,
    onUpdateRoom: handleUpdateRoom,
  });

  // Touch gestures hook for pinch-to-zoom and two-finger pan
  const handleTransformChange = useCallback((transform: { zoom?: number; offsetX?: number; offsetY?: number }) => {
    dispatch({ type: 'SET_VIEW_TRANSFORM', transform });
  }, [dispatch]);

  const {
    handleTouchStart: touchStart,
    handleTouchMove: touchMove,
    handleTouchEnd: touchEnd,
    isTwoFingerGesture,
  } = useTouchGestures({
    zoom: state.viewTransform.zoom,
    offsetX: state.viewTransform.offsetX,
    offsetY: state.viewTransform.offsetY,
    onTransformChange: handleTransformChange,
  });

  // Sync background image from props to internal state
  useEffect(() => {
    if (backgroundImage !== undefined) {
      if (backgroundImage) {
        dispatch({ type: 'SET_BACKGROUND_IMAGE', image: backgroundImage });
      } else {
        dispatch({ type: 'REMOVE_BACKGROUND_IMAGE' });
      }
    }
  }, [backgroundImage, dispatch]);

  // Track canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    updateSize();
    onCanvasReady?.();
    
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [onCanvasReady]);
  
  // Reset initialization state when jsonData identity changes (project switch)
  // Use deep comparison for room IDs to detect actual project changes vs echoed state
  useEffect(() => {
    const incomingRooms = jsonData?.rooms as Room[] | undefined;
    const currentRoomIds = state.rooms.map(r => r.id).sort().join(',');
    const incomingRoomIds = incomingRooms?.map((r: Room) => r.id).sort().join(',') || '';
    
    // Only reset if this is truly new project data (different room structure)
    const isNewProject = jsonData !== lastJsonDataRef.current && 
                         (state.rooms.length === 0 || currentRoomIds !== incomingRoomIds);
    
    if (isNewProject) {
      hasInitializedRef.current = false;
      hasAppliedZoomRef.current = false;
      lastJsonDataRef.current = jsonData || null;
    }
  }, [jsonData, state.rooms]);

  // Load data when we have jsonData and valid canvas size
  useEffect(() => {
    const hasValidSize = canvasSize.width > 100 && canvasSize.height > 100;
    
    if (jsonData && hasValidSize && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadFromJson(jsonData, canvasSize);
    }
  }, [jsonData, canvasSize, loadFromJson]);

  // Apply zoom-to-fit after state.rooms is populated
  useEffect(() => {
    const hasRooms = state.rooms.length > 0;
    const hasValidSize = canvasSize.width > 100 && canvasSize.height > 100;
    
    if (hasRooms && hasValidSize && !hasAppliedZoomRef.current && hasInitializedRef.current) {
      hasAppliedZoomRef.current = true;
      // Small delay to ensure DOM layout is complete
      const timeoutId = setTimeout(() => {
        fitToView(canvasSize.width, canvasSize.height, true);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [state.rooms, canvasSize, fitToView]);

  // Notify parent of changes with debounce to prevent rapid-fire updates
  // NOTE: We intentionally exclude exportToJson and viewTransform from deps
  // to avoid triggering parent updates during pan/zoom, which can cause
  // cascading re-renders that reset the user's view position.
  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the data change notification
    saveTimeoutRef.current = setTimeout(() => {
      const data = {
        rooms: state.rooms,
        scale: state.scale,
        backgroundImage: state.backgroundImage,
      };
      const dataString = JSON.stringify(data);

      // Only notify if data actually changed
      if (dataString !== lastExportedDataRef.current) {
        lastExportedDataRef.current = dataString;
        onDataChange?.(data);
      }
    }, 100);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rooms, state.scale, state.backgroundImage, onDataChange]);


  // Sync external room property changes (fillDirection, seamOptions, accessories, etc.)
  // This handles updates from TakeoffPanel/RoomDetailView that don't change geometry
  useEffect(() => {
    if (!jsonData?.rooms || !hasInitializedRef.current) return;
    
    const incomingRooms = jsonData.rooms as Room[];
    
    // For each room in internal state, check if external data has updated non-geometry properties
    state.rooms.forEach(internalRoom => {
      const externalRoom = incomingRooms.find(r => r.id === internalRoom.id);
      if (!externalRoom) return;
      
      // Check if non-geometry properties differ
      const propsChanged = (
        internalRoom.fillDirection !== externalRoom.fillDirection ||
        internalRoom.materialId !== externalRoom.materialId ||
        internalRoom.name !== externalRoom.name ||
        internalRoom.color !== externalRoom.color ||
        internalRoom.tilePattern !== externalRoom.tilePattern ||
        JSON.stringify(internalRoom.accessories) !== JSON.stringify(externalRoom.accessories) ||
        JSON.stringify(internalRoom.seamOptions) !== JSON.stringify(externalRoom.seamOptions)
      );
      
      if (propsChanged) {
        // Merge external properties into internal state, preserving geometry
        dispatch({
          type: 'UPDATE_ROOM',
          roomId: internalRoom.id,
          updates: {
            fillDirection: externalRoom.fillDirection,
            materialId: externalRoom.materialId,
            name: externalRoom.name,
            color: externalRoom.color,
            tilePattern: externalRoom.tilePattern,
            accessories: externalRoom.accessories,
            seamOptions: externalRoom.seamOptions,
          },
        });
      }
    });
  }, [jsonData?.rooms, dispatch, state.rooms]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setOrthoLocked(true);
      }
      if (e.key === 'Alt') {
        setTempSnapDisabled(true);
      }
      if (e.key === 'Escape') {
        setIsDrawing(false);
        setDrawingPoints([]);
        setScaleStart(null);
        setRectangleStart(null);
        setShowDimensionInput(false);
        // Cancel merge mode
        setMergeFirstRoom(null);
        setMergeableRoomIds([]);
        // Cancel split mode
        setSplitRoom(null);
        setSplitStartPoint(null);
        setSplitPreviewEnd(null);
        setSplitStartEdge(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Toggle grid snap
      if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey) {
        setSnapSettings({ ...snapSettings, gridEnabled: !snapSettings.gridEnabled });
      }
      // Toggle dimension input while drawing
      if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey && isDrawing) {
        setShowDimensionInput(prev => !prev);
      }
      // Keyboard shortcut for merge tool
      if (e.key === 'm' || e.key === 'M') {
        if (!e.metaKey && !e.ctrlKey && onToolChange) {
          onToolChange('merge');
        }
      }
      // Keyboard shortcut for split tool
      if (e.key === 'x' || e.key === 'X') {
        if (!e.metaKey && !e.ctrlKey && onToolChange) {
          onToolChange('split');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setOrthoLocked(false);
      }
      if (e.key === 'Alt') {
        setTempSnapDisabled(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, onToolChange, isDrawing]);

  // Reset tool state when tool changes
  useEffect(() => {
    if (activeTool !== 'merge') {
      setMergeFirstRoom(null);
      setMergeableRoomIds([]);
    }
    if (activeTool !== 'split') {
      setSplitRoom(null);
      setSplitStartPoint(null);
      setSplitPreviewEnd(null);
      setSplitStartEdge(null);
    }
    if (activeTool !== 'rectangle') {
      setRectangleStart(null);
    }
  }, [activeTool]);

  // Clean up pending RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Handle merge rooms
  const handleMergeRooms = useCallback((room1: Room, room2: Room) => {
    // Find shared edge
    const sharedEdge = findSharedEdgeBetweenRooms(room1, room2);
    if (!sharedEdge) {
      toast.error("These rooms don't share a wall");
      return;
    }
    
    // Merge polygons
    const result = mergeRoomsAtSharedEdge(room1, room2, sharedEdge);
    if (!result.success) {
      toast.error(result.error || "Could not merge rooms");
      return;
    }
    
    // Create merged room
    const mergedRoom: Room = {
      id: generateRoomId(),
      name: `${room1.name} + ${room2.name}`,
      points: result.mergedPoints,
      holes: [...(room1.holes || []), ...(room2.holes || [])],
      doors: [...(room1.doors || []), ...(room2.doors || [])],
      materialId: room1.materialId || room2.materialId,
      color: room1.color || room2.color || DEFAULT_ROOM_COLOR,
      fillDirection: room1.fillDirection || room2.fillDirection,
      accessories: room1.accessories || room2.accessories,
    };
    
    // Delete old rooms, add merged (atomic batch)
    dispatch({ type: 'BATCH', actions: [
      { type: 'DELETE_ROOM', roomId: room1.id },
      { type: 'DELETE_ROOM', roomId: room2.id },
      { type: 'ADD_ROOM', room: mergedRoom },
      { type: 'SELECT_ROOM', roomId: mergedRoom.id },
    ]});
    
    // Reset merge state
    setMergeFirstRoom(null);
    setMergeableRoomIds([]);
    
    toast.success(`Merged "${room1.name}" and "${room2.name}"`);
  }, [dispatch]);

  // Handle split room
  const handleSplitRoom = useCallback((
    room: Room,
    startPoint: CanvasPoint,
    endPoint: CanvasPoint,
    startEdgeIndex: number,
    endEdgeIndex: number
  ) => {
    // Validate we're splitting across different edges
    if (startEdgeIndex === endEdgeIndex) {
      toast.error("Split line must cross two different edges");
      return;
    }
    
    // Perform split
    const result = splitPolygonWithLine(room.points, startPoint, endPoint);
    if (!result.success) {
      toast.error(result.error || "Could not split room");
      return;
    }
    
    // Assign holes to the appropriate polygon
    const { holes1, holes2 } = assignHolesToPolygons(
      room.holes || [],
      result.polygon1,
      result.polygon2
    );
    
    // Assign doors based on which polygon contains them
    const doors1: typeof room.doors = [];
    const doors2: typeof room.doors = [];
    for (const door of room.doors || []) {
      if (isPointInPolygon(door.position, result.polygon1)) {
        doors1.push(door);
      } else {
        doors2.push(door);
      }
    }
    
    // Create two new rooms
    const room1: Room = {
      id: generateRoomId(),
      name: `${room.name} A`,
      points: result.polygon1,
      holes: holes1,
      doors: doors1,
      materialId: room.materialId,
      color: room.color || DEFAULT_ROOM_COLOR,
      fillDirection: room.fillDirection,
      accessories: room.accessories,
    };
    
    const room2: Room = {
      id: generateRoomId(),
      name: `${room.name} B`,
      points: result.polygon2,
      holes: holes2,
      doors: doors2,
      materialId: room.materialId,
      color: room.color || DEFAULT_ROOM_COLOR,
      fillDirection: room.fillDirection,
      accessories: room.accessories,
    };
    
    // Delete original, add new rooms (atomic batch)
    dispatch({ type: 'BATCH', actions: [
      { type: 'DELETE_ROOM', roomId: room.id },
      { type: 'ADD_ROOM', room: room1 },
      { type: 'ADD_ROOM', room: room2 },
      { type: 'SELECT_ROOM', roomId: room1.id },
    ]});
    
    // Reset split state
    setSplitRoom(null);
    setSplitStartPoint(null);
    setSplitPreviewEnd(null);
    setSplitStartEdge(null);
    
    toast.success(`Split "${room.name}" into two rooms`);
  }, [dispatch]);

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
    // Ignore during touch gestures
    if (isTouchGesture || isTwoFingerGesture()) return;
    
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
        // Try to start dragging vertex or wall first
        if (startDrag(point)) {
          return;
        }

        // Check if clicking near an edge midpoint of the selected room to toggle transition
        if (state.selectedRoomId) {
          const selectedRoom = state.rooms.find(r => r.id === state.selectedRoomId);
          if (selectedRoom) {
            const clickRadius = 12 / state.viewTransform.zoom;
            for (let i = 0; i < selectedRoom.points.length; i++) {
              const j = (i + 1) % selectedRoom.points.length;
              const midX = (selectedRoom.points[i].x + selectedRoom.points[j].x) / 2;
              const midY = (selectedRoom.points[i].y + selectedRoom.points[j].y) / 2;
              const dist = distance(point, { x: midX, y: midY });
              if (dist < clickRadius) {
                // Toggle transition on this edge
                const existing = selectedRoom.edgeTransitions || [];
                const hasTransition = existing.some(t => t.edgeIndex === i);
                if (hasTransition) {
                  dispatch({
                    type: 'UPDATE_ROOM',
                    roomId: selectedRoom.id,
                    updates: { edgeTransitions: existing.filter(t => t.edgeIndex !== i) },
                  });
                  toast.success(`Removed transition from Edge ${i + 1}`);
                } else {
                  // Auto-detect adjacent room for this edge
                  const sharedEdgesForRoom = detectSharedEdgesForNewRoom(
                    { ...selectedRoom, points: selectedRoom.points } as Room,
                    state.rooms.filter(r => r.id !== selectedRoom.id)
                  );
                  const sharedForEdge = sharedEdgesForRoom.find(se => se.newRoomEdgeIndex === i);
                  const newTransition: EdgeTransition = {
                    edgeIndex: i,
                    adjacentRoomId: sharedForEdge?.existingRoomId,
                    adjacentRoomName: sharedForEdge?.existingRoomName,
                    transitionType: 'auto',
                  };
                  dispatch({
                    type: 'UPDATE_ROOM',
                    roomId: selectedRoom.id,
                    updates: { edgeTransitions: [...existing, newTransition] },
                  });
                  toast.success(`Added transition to Edge ${i + 1}${sharedForEdge ? ` (→ ${sharedForEdge.existingRoomName})` : ''}`);
                }
                return; // Don't fall through to room selection
              }
            }
          }
        }

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
        // Use smart snapping with priority: vertex > grid > axis
        // Snap radius is in screen pixels, convert to canvas space
        const smartSnap = findSmartSnapPoint(
          point,
          state.rooms,
          drawingPoints,
          effectiveSnapSettings,
          state.scale,
          15 / state.viewTransform.zoom
        );
        const actualPoint = smartSnap?.point || point;

        if (!isDrawing) {
          setIsDrawing(true);
          setDrawingPoints([actualPoint]);
        } else {
          // Check if closing the polygon
          const startPoint = drawingPoints[0];
          const distToStart = distance(actualPoint, startPoint);

          if (distToStart < 15 / state.viewTransform.zoom && drawingPoints.length >= 3) {
            // Close polygon - create room
            const newRoom: Room = {
              id: generateRoomId(),
              name: `Room ${state.rooms.length + 1}`,
              points: drawingPoints,
              holes: [],
              doors: [],
              materialId: null,
              color: DEFAULT_ROOM_COLOR,
              edgeTransitions: [],
            };
            
            // Auto-detect shared edges with existing rooms
            const sharedEdgesForNewRoom = detectSharedEdgesForNewRoom(newRoom, state.rooms);
            
            if (sharedEdgesForNewRoom.length > 0) {
              newRoom.edgeTransitions = sharedEdgesForNewRoom.map(se => ({
                edgeIndex: se.newRoomEdgeIndex,
                adjacentRoomId: se.existingRoomId,
                adjacentRoomName: se.existingRoomName,
                transitionType: 'auto' as const,
              }));
              
              toast.success(`${sharedEdgesForNewRoom.length} shared edge(s) detected - marked as transitions`);
            }
            
            dispatch({ type: 'ADD_ROOM', room: newRoom });
            setIsDrawing(false);
            setDrawingPoints([]);
            setShowDimensionInput(false);
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

      case 'rectangle': {
        // Smart snapping for corner - zoom-aware radius
        const smartSnap = findSmartSnapPoint(point, state.rooms, [], effectiveSnapSettings, state.scale, 15 / state.viewTransform.zoom);
        const actualPoint = smartSnap?.point || point;

        if (!rectangleStart) {
          // First click - set corner
          setRectangleStart(actualPoint);
        } else {
          // Second click - create rectangle room
          const x1 = Math.min(rectangleStart.x, actualPoint.x);
          const y1 = Math.min(rectangleStart.y, actualPoint.y);
          const x2 = Math.max(rectangleStart.x, actualPoint.x);
          const y2 = Math.max(rectangleStart.y, actualPoint.y);

          // Only create if has some size
          if (Math.abs(x2 - x1) > 10 && Math.abs(y2 - y1) > 10) {
            const rectPoints: CanvasPoint[] = [
              { x: x1, y: y1 },
              { x: x2, y: y1 },
              { x: x2, y: y2 },
              { x: x1, y: y2 },
            ];

            const newRoom: Room = {
              id: generateRoomId(),
              name: `Room ${state.rooms.length + 1}`,
              points: rectPoints,
              holes: [],
              doors: [],
              materialId: null,
              color: DEFAULT_ROOM_COLOR,
              edgeTransitions: [],
            };

            // Auto-detect shared edges
            const sharedEdgesForNewRoom = detectSharedEdgesForNewRoom(newRoom, state.rooms);
            if (sharedEdgesForNewRoom.length > 0) {
              newRoom.edgeTransitions = sharedEdgesForNewRoom.map(se => ({
                edgeIndex: se.newRoomEdgeIndex,
                adjacentRoomId: se.existingRoomId,
                adjacentRoomName: se.existingRoomName,
                transitionType: 'auto' as const,
              }));
            }

            dispatch({ type: 'ADD_ROOM', room: newRoom });
          }
          setRectangleStart(null);
        }
        break;
      }

      case 'hole': {
        // Must have a selected room
        if (!state.selectedRoomId) return;

        const snap = findSnapPoint(point, state.rooms, 10 / state.viewTransform.zoom);
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

          if (distance < 15 / state.viewTransform.zoom && drawingPoints.length >= 3) {
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

          // Open modal for real-world measurement input
          setPendingScalePixelLength(pixelLength);
          setScaleInputValue('');
          // Keep the last-used unit (don't reset scaleInputUnit)
          setScaleInputOpen(true);
          setScaleStart(null);
        }
        break;
      }

      case 'merge': {
        // Find clicked room
        let clickedRoom: Room | null = null;
        for (const room of state.rooms) {
          if (isPointInPolygon(point, room.points)) {
            clickedRoom = room;
            break;
          }
        }
        
        if (!clickedRoom) return;
        
        if (!mergeFirstRoom) {
          // First room selection
          setMergeFirstRoom(clickedRoom);
          
          // Find which rooms are adjacent (share an edge)
          const adjacentRoomIds: string[] = [];
          for (const se of sharedEdges) {
            if (se.room1Id === clickedRoom.id) {
              adjacentRoomIds.push(se.room2Id);
            } else if (se.room2Id === clickedRoom.id) {
              adjacentRoomIds.push(se.room1Id);
            }
          }
          setMergeableRoomIds([...new Set(adjacentRoomIds)]);
          dispatch({ type: 'SELECT_ROOM', roomId: clickedRoom.id });
        } else {
          // Second room selection
          if (clickedRoom.id === mergeFirstRoom.id) {
            // Clicked same room - deselect
            setMergeFirstRoom(null);
            setMergeableRoomIds([]);
            dispatch({ type: 'SELECT_ROOM', roomId: null });
          } else if (mergeableRoomIds.includes(clickedRoom.id)) {
            // Valid merge target
            handleMergeRooms(mergeFirstRoom, clickedRoom);
          } else {
            // Not adjacent - start new selection
            toast.error("Rooms are not adjacent. Select a room that shares a wall.");
          }
        }
        break;
      }

      case 'split': {
        // Find clicked room
        let clickedRoom: Room | null = null;
        for (const room of state.rooms) {
          if (isPointInPolygon(point, room.points)) {
            clickedRoom = room;
            break;
          }
        }
        
        if (!splitRoom) {
          // First click - select room to split
          if (!clickedRoom) return;
          setSplitRoom(clickedRoom);
          dispatch({ type: 'SELECT_ROOM', roomId: clickedRoom.id });
        } else if (!splitStartPoint) {
          // Second click - set split start point (must be on edge)
          const edgeInfo = findEdgeForPoint(point, splitRoom.points, 20 / state.viewTransform.zoom);
          if (!edgeInfo) {
            toast.error("Click on a room edge to start the split");
            return;
          }
          setSplitStartPoint(edgeInfo.projectedPoint);
          setSplitStartEdge(edgeInfo.edgeIndex);
        } else {
          // Third click - set split end point and execute split
          const edgeInfo = findEdgeForPoint(point, splitRoom.points, 20 / state.viewTransform.zoom);
          if (!edgeInfo) {
            toast.error("Click on a room edge to complete the split");
            return;
          }
          
          if (edgeInfo.edgeIndex === splitStartEdge) {
            toast.error("Split line must cross two different edges");
            return;
          }
          
          handleSplitRoom(splitRoom, splitStartPoint, edgeInfo.projectedPoint, splitStartEdge!, edgeInfo.edgeIndex);
        }
        break;
      }
    }
  }, [activeTool, isDrawing, drawingPoints, state.rooms, state.selectedRoomId, state.viewTransform.zoom, orthoLocked, selectedDoorWidth, scaleStart, getEventPoint, dispatch, isTouchGesture, isTwoFingerGesture, startDrag, mergeFirstRoom, mergeableRoomIds, sharedEdges, handleMergeRooms, splitRoom, splitStartPoint, splitStartEdge, handleSplitRoom]);

  // Handle pointer move (RAF-throttled to avoid per-pixel expensive operations)
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Ignore during touch gestures
    if (isTouchGesture || isTwoFingerGesture()) return;

    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Extract event data before RAF (React synthetic events are pooled and
    // cannot be accessed asynchronously inside the requestAnimationFrame callback)
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      // Compute canvas point from extracted coordinates
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const point = screenToCanvas(clientX - rect.left, clientY - rect.top);

      if (isPanning && panStart) {
        const dx = clientX - panStart.x;
        const dy = clientY - panStart.y;
        dispatch({
          type: 'SET_VIEW_TRANSFORM',
          transform: {
            offsetX: state.viewTransform.offsetX + dx,
            offsetY: state.viewTransform.offsetY + dy,
          },
        });
        setPanStart({ x: clientX, y: clientY });
        return;
      }

      // Handle dragging in select mode
      if (activeTool === 'select' && isDragging) {
        updateDrag(point, orthoLocked);
        setCursorPosition(point);
        return;
      }

      // Handle hover for select or merge mode (visual feedback)
      if (activeTool === 'select' || activeTool === 'merge' || activeTool === 'split') {
        if (activeTool === 'select') {
          handleHover(point);
        }

        // Check for room hover
        let foundHoveredRoom: string | null = null;
        for (const room of state.rooms) {
          if (isPointInPolygon(point, room.points)) {
            foundHoveredRoom = room.id;
            break;
          }
        }
        setHoveredRoomId(foundHoveredRoom);

        // Update split preview
        if (activeTool === 'split' && splitRoom && splitStartPoint) {
          // Snap to edge if close
          const edgeInfo = findEdgeForPoint(point, splitRoom.points, 20 / state.viewTransform.zoom);
          if (edgeInfo) {
            setSplitPreviewEnd(edgeInfo.projectedPoint);
          } else {
            setSplitPreviewEnd(point);
          }
        }
      } else {
        setHoveredRoomId(null);
        setSplitPreviewEnd(null);
      }

      // Update cursor position
      let finalPoint = point;

      if (orthoLocked && drawingPoints.length > 0) {
        finalPoint = applyOrthoLock(point, drawingPoints[drawingPoints.length - 1]);
      }

      // Use smart snapping when drawing - zoom-aware radius
      if (activeTool === 'draw' || activeTool === 'hole') {
        const smartSnap = findSmartSnapPoint(
          finalPoint,
          state.rooms,
          drawingPoints,
          effectiveSnapSettings,
          state.scale,
          15 / state.viewTransform.zoom
        );

        if (smartSnap) {
          setSnapPoint(smartSnap.point);
          setSnapType(smartSnap.type);
          finalPoint = smartSnap.point;
        } else {
          setSnapPoint(null);
          setSnapType(null);
        }

        // Check for axis snap lines if enabled - zoom-aware radius
        if (effectiveSnapSettings.axisSnapEnabled) {
          const axisSnap = findAxisSnapLines(finalPoint, state.rooms, 10 / state.viewTransform.zoom);
          setAxisSnapLines(axisSnap);

          if (axisSnap.horizontal !== null) {
            finalPoint = { ...finalPoint, y: axisSnap.horizontal };
          }
          if (axisSnap.vertical !== null) {
            finalPoint = { ...finalPoint, x: axisSnap.vertical };
          }
        } else {
          setAxisSnapLines({ horizontal: null, vertical: null });
        }
      } else {
        // Legacy snapping for other tools - zoom-aware radius
        const snap = findSnapPoint(finalPoint, state.rooms, 10 / state.viewTransform.zoom);
        setSnapPoint(snap);
        setSnapType(snap ? 'vertex' : null);

        if (snap) {
          finalPoint = snap;
        }

        const axisSnap = findAxisSnapLines(finalPoint, state.rooms, 10 / state.viewTransform.zoom);
        setAxisSnapLines(axisSnap);

        if (axisSnap.horizontal !== null) {
          finalPoint = { ...finalPoint, y: axisSnap.horizontal };
        }
        if (axisSnap.vertical !== null) {
          finalPoint = { ...finalPoint, x: axisSnap.vertical };
        }
      }

      setCursorPosition(finalPoint);
    });
  }, [isPanning, panStart, orthoLocked, drawingPoints, state.rooms, state.viewTransform, state.scale, screenToCanvas, dispatch, activeTool, isDragging, updateDrag, handleHover, isTouchGesture, isTwoFingerGesture, splitRoom, splitStartPoint, effectiveSnapSettings]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);

    // End any dragging operation
    if (isDragging) {
      endDrag();
    }
  }, [isDragging, endDrag]);

  // Handle double-click (for removing curves)
  const handleDoubleClickEvent = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'select') return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const point = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    handleDoubleClick(point);
  }, [activeTool, screenToCanvas, handleDoubleClick]);

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
    
    // Use drag target room if available, otherwise fall back to selected room
    const targetRoomId = dragTargetRoomId || state.selectedRoomId;
    
    if (materialId && targetRoomId) {
      dispatch({ type: 'ASSIGN_MATERIAL', roomId: targetRoomId, materialId });
      // Also select the room we just assigned to
      if (targetRoomId !== state.selectedRoomId) {
        dispatch({ type: 'SELECT_ROOM', roomId: targetRoomId });
      }
    }
    
    setIsDraggingMaterial(false);
    setDragTargetRoomId(null);
  }, [state.selectedRoomId, dragTargetRoomId, dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // Check if we're dragging a material
    if (!isDraggingMaterial) {
      setIsDraggingMaterial(true);
    }
    
    // Find which room the cursor is over
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const point = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    
    let foundRoom: string | null = null;
    for (const room of state.rooms) {
      if (isPointInPolygon(point, room.points)) {
        foundRoom = room.id;
        break;
      }
    }
    setDragTargetRoomId(foundRoom);
  }, [isDraggingMaterial, screenToCanvas, state.rooms]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if we're leaving the canvas entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingMaterial(false);
      setDragTargetRoomId(null);
    }
  }, []);

  const getCursor = useCallback((): string => {
    if (isPanning) return 'grabbing';
    if (isDragging) return 'grabbing';
    
    // Check for edit cursor in select mode
    if (activeTool === 'select' && cursorPosition) {
      const editCursor = getEditCursor(cursorPosition);
      if (editCursor) return editCursor;
    }
    
    switch (activeTool) {
      case 'select':
        if (hoveredRoomId) return 'pointer';
        return 'default';
      case 'draw':
      case 'hole':
        return 'crosshair';
      case 'pan':
        return 'grab';
      case 'scale':
        return 'crosshair';
      case 'door':
        return 'pointer';
      case 'merge':
        if (hoveredRoomId) {
          if (mergeFirstRoom && mergeableRoomIds.includes(hoveredRoomId)) {
            return 'copy';
          }
          return 'pointer';
        }
        return 'default';
      case 'split':
        if (splitRoom && splitStartPoint) {
          return 'crosshair';
        }
        if (hoveredRoomId) return 'pointer';
        return 'crosshair';
      default:
        return 'default';
    }
  }, [isPanning, isDragging, activeTool, cursorPosition, getEditCursor, hoveredRoomId, mergeFirstRoom, mergeableRoomIds, splitRoom, splitStartPoint]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (e.touches.length >= 2) {
      setIsTouchGesture(true);
      touchStart(e, rect);
    }
  }, [touchStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (e.touches.length >= 2) {
      const handled = touchMove(e, rect);
      if (handled) {
        setIsTouchGesture(true);
      }
    }
  }, [touchMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEnd(e);
    if (e.touches.length < 2) {
      setIsTouchGesture(false);
    }
  }, [touchEnd]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden touch-none"
      style={{ cursor: getCursor() }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClickEvent}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <CanvasRenderer
        state={state}
        drawingPoints={drawingPoints}
        cursorPosition={cursorPosition}
        isDrawing={isDrawing}
        orthoLocked={orthoLocked}
        snapPoint={snapPoint}
        snapType={snapType}
        axisSnapLines={axisSnapLines}
        materialTypes={materialTypes}
        hoveredVertex={hoveredVertex}
        hoveredWall={hoveredWall}
        hoveredCurveControl={hoveredCurveControl}
        hoveredRoomId={hoveredRoomId}
        isDragging={isDragging}
        isDraggingMaterial={isDraggingMaterial}
        dragTargetRoomId={dragTargetRoomId}
        showDimensionLabels={showDimensionLabels}
        dimensionUnit={dimensionUnit}
        stripPlans={stripPlans}
        showSeamLines={showSeamLines}
        showGrid={snapSettings.gridEnabled && snapSettings.enabled}
        gridSizePx={gridSizePx}
        mergeFirstRoomId={mergeFirstRoom?.id || null}
        mergeableRoomIds={mergeableRoomIds}
        isMergeMode={activeTool === 'merge'}
        splitRoomId={splitRoom?.id || null}
        splitStartPoint={splitStartPoint}
        splitPreviewEnd={splitPreviewEnd}
        isSplitMode={activeTool === 'split'}
        rectangleStart={rectangleStart}
        activeTool={activeTool}
        projectMaterials={projectMaterials}
        scaleStart={scaleStart}
      />

      {/* Material drag indicator */}
      {isDraggingMaterial && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium animate-fade-in">
          {dragTargetRoomId ? 'Drop to assign material' : 'Drag over a room to assign'}
        </div>
      )}

      {/* Drawing indicator */}
      {isDrawing && !showDimensionInput && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium animate-pulse">
          {activeTool === 'hole' ? 'Drawing hole' : 'Drawing room'} • Click near start to close • L for length input • Esc to cancel
          {orthoLocked && ' • ORTHO'}
          {tempSnapDisabled && ' • SNAP OFF'}
        </div>
      )}

      {/* Dimension Input Overlay */}
      <DimensionInputOverlay
        isDrawing={isDrawing}
        lastPoint={drawingPoints.length > 0 ? drawingPoints[drawingPoints.length - 1] : null}
        cursorPosition={cursorPosition}
        scale={state.scale}
        dimensionUnit={dimensionUnit}
        visible={showDimensionInput}
        onClose={() => setShowDimensionInput(false)}
        onSubmitDimension={(lengthMm) => {
          if (!cursorPosition || drawingPoints.length === 0) return;
          
          const lastPoint = drawingPoints[drawingPoints.length - 1];
          
          // Calculate direction from last point to cursor
          const dx = cursorPosition.x - lastPoint.x;
          const dy = cursorPosition.y - lastPoint.y;
          const currentLength = Math.sqrt(dx * dx + dy * dy);
          
          if (currentLength === 0) return;
          
          // Normalize direction
          const dirX = dx / currentLength;
          const dirY = dy / currentLength;
          
          // Calculate new point at exact distance
          const lengthPx = state.scale ? lengthMm * state.scale.pixelsPerMm : lengthMm;
          const newPoint = {
            x: lastPoint.x + dirX * lengthPx,
            y: lastPoint.y + dirY * lengthPx,
          };
          
          setDrawingPoints([...drawingPoints, newPoint]);
        }}
      />

      {/* Scale calibration indicator */}
      {activeTool === 'scale' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {scaleStart ? 'Click second point to set scale' : 'Click first point of reference line'}
        </div>
      )}

      {/* Merge mode indicator */}
      {activeTool === 'merge' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
          {mergeFirstRoom 
            ? `Merging: ${mergeFirstRoom.name} • Click adjacent room to merge • Esc to cancel`
            : 'Click first room to merge • Esc to cancel'
          }
        </div>
      )}

      {/* Split mode indicator */}
      {activeTool === 'split' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
          {splitRoom 
            ? splitStartPoint
              ? `Splitting: ${splitRoom.name} • Click another edge to complete • Esc to cancel`
              : `Splitting: ${splitRoom.name} • Click on an edge to start • Esc to cancel`
            : 'Click a room to split • Esc to cancel'
          }
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div className="px-2 py-1 rounded bg-background/80 backdrop-blur text-xs text-muted-foreground">
          {Math.round(state.viewTransform.zoom * 100)}%
        </div>
        {state.rooms.length > 0 && (
          <button
            onClick={() => fitToView(canvasSize.width, canvasSize.height)}
            className="p-1.5 rounded bg-background/80 backdrop-blur hover:bg-background/90 transition-colors text-muted-foreground hover:text-foreground"
            title="Fit to view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
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
      
      {/* Minimap */}
      <Minimap
        rooms={state.rooms}
        viewTransform={state.viewTransform}
        canvasSize={canvasSize}
        onNavigate={(offsetX, offsetY) => {
          dispatch({
            type: 'SET_VIEW_TRANSFORM',
            transform: { offsetX, offsetY },
          });
        }}
      />

      {/* Finishes Legend - show if any room has a material from projectMaterials with a code */}
      {showFinishesLegend && state.rooms.some(r => r.materialId) && (
        <div className="absolute top-4 right-4 z-10">
          <FinishesLegend
            rooms={state.rooms}
            materials={materials}
            compact
          />
        </div>
      )}

      {/* Scale Calibration Dialog */}
      <Dialog open={scaleInputOpen} onOpenChange={(open) => {
        if (!open) {
          setScaleInputOpen(false);
          setPendingScalePixelLength(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Scale</DialogTitle>
            <DialogDescription>
              Enter the real-world length of the line you just drew.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scale-length" className="text-right">
                Length
              </Label>
              <Input
                id="scale-length"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 1000"
                value={scaleInputValue}
                onChange={(e) => setScaleInputValue(e.target.value)}
                className="col-span-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const parsed = parseFloat(scaleInputValue);
                    if (!parsed || parsed <= 0 || !pendingScalePixelLength) return;
                    let realLengthMm = parsed;
                    if (scaleInputUnit === 'cm') realLengthMm = parsed * 10;
                    else if (scaleInputUnit === 'm') realLengthMm = parsed * 1000;
                    dispatch({
                      type: 'SET_SCALE',
                      scale: {
                        pixelLength: pendingScalePixelLength,
                        realWorldLength: realLengthMm,
                        pixelsPerMm: pendingScalePixelLength / realLengthMm,
                      },
                    });
                    setScaleInputOpen(false);
                    setPendingScalePixelLength(null);
                    toast.success('Scale calibrated');
                  }
                }}
              />
              <Select value={scaleInputUnit} onValueChange={(v) => setScaleInputUnit(v as 'mm' | 'cm' | 'm')}>
                <SelectTrigger className="col-span-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setScaleInputOpen(false);
              setPendingScalePixelLength(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              const parsed = parseFloat(scaleInputValue);
              if (!parsed || parsed <= 0 || !pendingScalePixelLength) {
                toast.error('Please enter a valid positive number');
                return;
              }
              let realLengthMm = parsed;
              if (scaleInputUnit === 'cm') realLengthMm = parsed * 10;
              else if (scaleInputUnit === 'm') realLengthMm = parsed * 1000;
              dispatch({
                type: 'SET_SCALE',
                scale: {
                  pixelLength: pendingScalePixelLength,
                  realWorldLength: realLengthMm,
                  pixelsPerMm: pendingScalePixelLength / realLengthMm,
                },
              });
              setScaleInputOpen(false);
              setPendingScalePixelLength(null);
              toast.success('Scale calibrated');
            }}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
