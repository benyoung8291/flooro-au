import { useReducer, useCallback, useRef } from 'react';
import { CanvasState, CanvasAction, Room, Hole, Door, ScaleCalibration, ViewTransform } from '@/lib/canvas/types';

const INITIAL_STATE: CanvasState = {
  rooms: [],
  scale: null,
  selectedRoomId: null,
  viewTransform: {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  },
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
    
    case 'LOAD_STATE':
      return action.state;
    
    case 'RESET':
      return INITIAL_STATE;
    
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
  
  const historyRef = useRef<CanvasState[]>([{ ...INITIAL_STATE, ...initialState }]);
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
      dispatch({ type: 'LOAD_STATE', state: historyRef.current[historyIndexRef.current] });
    }
  }, []);
  
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      dispatch({ type: 'LOAD_STATE', state: historyRef.current[historyIndexRef.current] });
    }
  }, []);
  
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;
  
  // Load state from JSON (e.g., from database)
  const loadFromJson = useCallback((jsonData: Record<string, unknown>) => {
    if (jsonData?.rooms && Array.isArray(jsonData.rooms)) {
      const rooms: Room[] = (jsonData.rooms as any[]).map((room, index) => ({
        id: room.id || `room_${index}`,
        name: room.name || `Room ${index + 1}`,
        points: room.points || [],
        holes: room.holes || [],
        doors: room.doors || [],
        materialId: room.materialId || null,
        color: room.color || 'hsla(217, 91%, 50%, 0.15)',
      }));
      
      const scale = jsonData.scale as ScaleCalibration | null;
      
      const newState: CanvasState = {
        rooms,
        scale: scale || null,
        selectedRoomId: null,
        viewTransform: (jsonData.viewTransform as ViewTransform) || INITIAL_STATE.viewTransform,
      };
      
      dispatch({ type: 'LOAD_STATE', state: newState });
      historyRef.current = [newState];
      historyIndexRef.current = 0;
    }
  }, []);
  
  // Export state to JSON for saving to database
  const exportToJson = useCallback((): Record<string, unknown> => {
    return {
      rooms: state.rooms,
      scale: state.scale,
      viewTransform: state.viewTransform,
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
  };
}
