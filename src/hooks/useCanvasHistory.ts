import { useReducer, useCallback, useRef } from 'react';
import { CanvasState, CanvasAction, Room, Hole, Door, ScaleCalibration, ViewTransform, BackgroundImage } from '@/lib/canvas/types';
import { calculateBoundingBox, calculateZoomToFit } from '@/lib/canvas/geometry';

// Smooth easing function (ease-out cubic)
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const INITIAL_STATE: CanvasState = {
  rooms: [],
  scale: null,
  selectedRoomId: null,
  viewTransform: {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  },
  backgroundImage: null,
};

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD_ROOM':
      return { ...state, rooms: [...state.rooms, action.room] };
    
    case 'UPDATE_ROOM':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.roomId ? { ...room, ...action.updates } : room
        ),
      };
    
    case 'DELETE_ROOM':
      return {
        ...state,
        rooms: state.rooms.filter(room => room.id !== action.roomId),
        selectedRoomId: state.selectedRoomId === action.roomId ? null : state.selectedRoomId,
      };
    
    case 'SELECT_ROOM':
      return { ...state, selectedRoomId: action.roomId };
    
    case 'ADD_HOLE':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.roomId
            ? { ...room, holes: [...room.holes, action.hole] }
            : room
        ),
      };
    
    case 'DELETE_HOLE':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.roomId
            ? { ...room, holes: room.holes.filter(h => h.id !== action.holeId) }
            : room
        ),
      };
    
    case 'UPDATE_HOLE':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.roomId
            ? {
                ...room,
                holes: room.holes.map(h =>
                  h.id === action.holeId ? { ...h, ...action.updates } : h
                ),
              }
            : room
        ),
      };
    
    case 'ADD_DOOR':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.roomId
            ? { ...room, doors: [...room.doors, action.door] }
            : room
        ),
      };
    
    case 'SET_SCALE':
      return { ...state, scale: action.scale };
    
    case 'SET_VIEW_TRANSFORM':
      return {
        ...state,
        viewTransform: { ...state.viewTransform, ...action.transform },
      };
    
    case 'ASSIGN_MATERIAL':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.roomId
            ? { ...room, materialId: action.materialId }
            : room
        ),
      };
    
    case 'SET_BACKGROUND_IMAGE':
      return { ...state, backgroundImage: action.image };
    
    case 'UPDATE_BACKGROUND_IMAGE':
      return {
        ...state,
        backgroundImage: state.backgroundImage
          ? { ...state.backgroundImage, ...action.updates }
          : null,
      };
    
    case 'REMOVE_BACKGROUND_IMAGE':
      return { ...state, backgroundImage: null };
    
    case 'LOAD_STATE':
      return action.state;
    
    case 'RESET':
      return INITIAL_STATE;

    case 'BATCH': {
      let newState = state;
      for (const subAction of action.actions) {
        newState = canvasReducer(newState, subAction);
      }
      return newState;
    }

    default:
      return state;
  }
}

const MAX_HISTORY_SIZE = 50;

export function useCanvasHistory(initialState?: Partial<CanvasState>) {
  const [state, dispatch] = useReducer(canvasReducer, {
    ...INITIAL_STATE,
    ...initialState,
  });
  
  const stateRef = useRef(state);
  stateRef.current = state;

  const historyRef = useRef<CanvasState[]>([{ ...INITIAL_STATE, ...initialState }]);
  const animationFrameRef = useRef<number | null>(null);
  const historyIndexRef = useRef(0);
  
  const dispatchWithHistory = useCallback((action: CanvasAction) => {
    // Actions that should not be recorded in history
    const noHistoryActions = ['SET_VIEW_TRANSFORM', 'SELECT_ROOM'];
    
    if (noHistoryActions.includes(action.type)) {
      dispatch(action);
      return;
    }
    
    dispatch(action);
    
    // After dispatch, we need to get the new state
    // Since we can't access state directly after dispatch, we compute it
    const newState = canvasReducer(historyRef.current[historyIndexRef.current], action);
    
    // Truncate any future states if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Add new state
    historyRef.current.push(newState);
    historyIndexRef.current++;
    
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, []);
  
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const targetState = historyRef.current[historyIndexRef.current];
      dispatch({ type: 'LOAD_STATE', state: { ...targetState, viewTransform: stateRef.current.viewTransform } });
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const targetState = historyRef.current[historyIndexRef.current];
      dispatch({ type: 'LOAD_STATE', state: { ...targetState, viewTransform: stateRef.current.viewTransform } });
    }
  }, []);
  
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;
  
  // Load state from JSON (e.g., from database)
  const loadFromJson = useCallback((jsonData: Record<string, unknown>, canvasSize?: { width: number; height: number }) => {
    if (jsonData?.rooms && Array.isArray(jsonData.rooms)) {
      const rooms: Room[] = (jsonData.rooms as any[]).map((room, index) => ({
        id: room.id || `room_${index}`,
        name: room.name || `Room ${index + 1}`,
        points: room.points || [],
        holes: room.holes || [],
        doors: room.doors || [],
        materialId: room.materialId || null,
        color: room.color || 'hsla(217, 91%, 50%, 0.15)',
        fillDirection: room.fillDirection,
        accessories: room.accessories,
        seamOptions: room.seamOptions,
        tilePattern: room.tilePattern,
        edgeTransitions: room.edgeTransitions || [],
        edgeCurves: room.edgeCurves,
      }));
      
      // Preserve scale from incoming data - never lose calibration
      const scale = jsonData.scale as ScaleCalibration | null;
      const backgroundImage = jsonData.backgroundImage as BackgroundImage | null;
      
      // Calculate zoom-to-fit if we have rooms and canvas dimensions
      let viewTransform = INITIAL_STATE.viewTransform;
      if (rooms.length > 0 && canvasSize && canvasSize.width > 0 && canvasSize.height > 0) {
        const boundingBox = calculateBoundingBox(rooms);
        if (boundingBox) {
          viewTransform = calculateZoomToFit(boundingBox, canvasSize.width, canvasSize.height);
        }
      }
      
      const newState: CanvasState = {
        rooms,
        scale: scale || null,
        selectedRoomId: null,
        viewTransform,
        backgroundImage: backgroundImage || null,
      };
      
      dispatch({ type: 'LOAD_STATE', state: newState });
      historyRef.current = [newState];
      historyIndexRef.current = 0;
    }
  }, []);
  
  // Cancel any running animation
  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Animate view transform smoothly
  const animateViewTransform = useCallback((
    from: ViewTransform,
    to: ViewTransform,
    duration: number = 400
  ) => {
    cancelAnimation();
    
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentTransform: ViewTransform = {
        offsetX: from.offsetX + (to.offsetX - from.offsetX) * easedProgress,
        offsetY: from.offsetY + (to.offsetY - from.offsetY) * easedProgress,
        zoom: from.zoom + (to.zoom - from.zoom) * easedProgress,
      };

      dispatch({ type: 'SET_VIEW_TRANSFORM', transform: currentTransform });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at the target
        dispatch({ type: 'SET_VIEW_TRANSFORM', transform: to });
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [cancelAnimation]);

  // Fit view to show all rooms centered with smooth animation
  const fitToView = useCallback((canvasWidth: number, canvasHeight: number, animated: boolean = true) => {
    if (state.rooms.length === 0) return;
    
    const boundingBox = calculateBoundingBox(state.rooms);
    if (!boundingBox) return;
    
    const newTransform = calculateZoomToFit(boundingBox, canvasWidth, canvasHeight);
    
    if (animated) {
      animateViewTransform(state.viewTransform, newTransform);
    } else {
      dispatch({ type: 'SET_VIEW_TRANSFORM', transform: newTransform });
    }
  }, [state.rooms, state.viewTransform, animateViewTransform]);
  
  // Export state to JSON for saving to database
  const exportToJson = useCallback((): Record<string, unknown> => {
    return {
      rooms: state.rooms,
      scale: state.scale,
      viewTransform: state.viewTransform,
      backgroundImage: state.backgroundImage,
    };
  }, [state]);
  
  return {
    state,
    dispatch: dispatchWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    loadFromJson,
    exportToJson,
    fitToView,
    animateViewTransform,
    cancelAnimation,
  };
}
