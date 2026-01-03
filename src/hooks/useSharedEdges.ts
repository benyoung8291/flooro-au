import { useMemo, useCallback } from 'react';
import { Room, EdgeTransition } from '@/lib/canvas/types';
import {
  SharedEdge,
  detectSharedEdges,
  getSharedEdgesForRoom as getSharedEdgesForRoomUtil,
  getSharedEdgeForEdge,
} from '@/lib/canvas/sharedEdgeDetector';

export interface UseSharedEdgesResult {
  /** All detected shared edges across all rooms */
  sharedEdges: SharedEdge[];
  /** Get shared edges for a specific room */
  getSharedEdgesForRoom: (roomId: string) => ReturnType<typeof getSharedEdgesForRoomUtil>;
  /** Get shared edge info for a specific edge */
  getSharedEdge: (roomId: string, edgeIndex: number) => ReturnType<typeof getSharedEdgeForEdge>;
  /** Auto-link all shared edges as transitions for a room */
  autoLinkSharedEdges: (
    room: Room,
    rooms: Room[],
    onUpdateRoom: (roomId: string, updates: Partial<Room>) => void
  ) => number;
}

/**
 * Hook for managing shared edge detection between rooms
 */
export function useSharedEdges(rooms: Room[]): UseSharedEdgesResult {
  // Memoized detection - only recalculate when rooms change
  const sharedEdges = useMemo(() => {
    return detectSharedEdges(rooms);
  }, [rooms]);

  // Get shared edges for a specific room
  const getSharedEdgesForRoom = useCallback(
    (roomId: string) => {
      return getSharedEdgesForRoomUtil(roomId, sharedEdges);
    },
    [sharedEdges]
  );

  // Check if a specific edge has a shared edge
  const getSharedEdge = useCallback(
    (roomId: string, edgeIndex: number) => {
      return getSharedEdgeForEdge(roomId, edgeIndex, sharedEdges);
    },
    [sharedEdges]
  );

  // Auto-link all shared edges as transitions for a room
  const autoLinkSharedEdges = useCallback(
    (
      room: Room,
      allRooms: Room[],
      onUpdateRoom: (roomId: string, updates: Partial<Room>) => void
    ): number => {
      const roomSharedEdges = getSharedEdgesForRoomUtil(room.id, sharedEdges);
      const existingTransitions = room.edgeTransitions || [];
      
      // Find shared edges that aren't already transitions
      const newTransitions: EdgeTransition[] = [];
      
      for (const shared of roomSharedEdges) {
        const alreadyTransition = existingTransitions.some(
          t => t.edgeIndex === shared.thisEdgeIndex
        );
        
        if (!alreadyTransition) {
          const otherRoom = allRooms.find(r => r.id === shared.otherRoomId);
          newTransitions.push({
            edgeIndex: shared.thisEdgeIndex,
            adjacentRoomId: shared.otherRoomId,
            adjacentRoomName: otherRoom?.name,
            transitionType: 'auto',
          });
        }
      }
      
      if (newTransitions.length > 0) {
        onUpdateRoom(room.id, {
          edgeTransitions: [...existingTransitions, ...newTransitions],
        });
      }
      
      return newTransitions.length;
    },
    [sharedEdges]
  );

  return {
    sharedEdges,
    getSharedEdgesForRoom,
    getSharedEdge,
    autoLinkSharedEdges,
  };
}
