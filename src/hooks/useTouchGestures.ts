import { useRef, useCallback } from 'react';

interface TouchState {
  touches: { id: number; x: number; y: number }[];
  initialDistance: number | null;
  initialZoom: number;
  initialCenter: { x: number; y: number } | null;
  initialOffset: { x: number; y: number };
}

interface UseTouchGesturesProps {
  zoom: number;
  offsetX: number;
  offsetY: number;
  onTransformChange: (transform: { zoom?: number; offsetX?: number; offsetY?: number }) => void;
  minZoom?: number;
  maxZoom?: number;
}

export function useTouchGestures({
  zoom,
  offsetX,
  offsetY,
  onTransformChange,
  minZoom = 0.1,
  maxZoom = 5,
}: UseTouchGesturesProps) {
  const touchState = useRef<TouchState>({
    touches: [],
    initialDistance: null,
    initialZoom: zoom,
    initialCenter: null,
    initialOffset: { x: offsetX, y: offsetY },
  });

  const getDistance = (t1: { x: number; y: number }, t2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(t2.x - t1.x, 2) + Math.pow(t2.y - t1.y, 2));
  };

  const getCenter = (t1: { x: number; y: number }, t2: { x: number; y: number }): { x: number; y: number } => {
    return {
      x: (t1.x + t2.x) / 2,
      y: (t1.y + t2.y) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent, containerRect: DOMRect) => {
    const touches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX - containerRect.left,
      y: t.clientY - containerRect.top,
    }));

    touchState.current.touches = touches;

    if (touches.length === 2) {
      // Initialize pinch-to-zoom state
      touchState.current.initialDistance = getDistance(touches[0], touches[1]);
      touchState.current.initialZoom = zoom;
      touchState.current.initialCenter = getCenter(touches[0], touches[1]);
      touchState.current.initialOffset = { x: offsetX, y: offsetY };
    }
  }, [zoom, offsetX, offsetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent, containerRect: DOMRect): boolean => {
    const touches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX - containerRect.left,
      y: t.clientY - containerRect.top,
    }));

    if (touches.length === 2 && touchState.current.initialDistance !== null) {
      // Two-finger gesture: pinch-to-zoom and pan
      e.preventDefault();

      const currentDistance = getDistance(touches[0], touches[1]);
      const currentCenter = getCenter(touches[0], touches[1]);

      // Calculate zoom
      const scale = currentDistance / touchState.current.initialDistance;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, touchState.current.initialZoom * scale));

      // Calculate pan with zoom adjustment
      const initialCenter = touchState.current.initialCenter!;
      const zoomRatio = newZoom / touchState.current.initialZoom;
      
      // Calculate new offset to keep the pinch center point stable
      const newOffsetX = currentCenter.x - (initialCenter.x - touchState.current.initialOffset.x) * zoomRatio;
      const newOffsetY = currentCenter.y - (initialCenter.y - touchState.current.initialOffset.y) * zoomRatio;

      onTransformChange({
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });

      touchState.current.touches = touches;
      return true; // Gesture handled
    }

    touchState.current.touches = touches;
    return false; // Not a multi-touch gesture
  }, [minZoom, maxZoom, onTransformChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const remainingTouches = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }));

    if (remainingTouches.length < 2) {
      // Reset pinch state when fewer than 2 touches
      touchState.current.initialDistance = null;
      touchState.current.initialCenter = null;
    }

    touchState.current.touches = remainingTouches;
  }, []);

  const isTwoFingerGesture = useCallback((): boolean => {
    return touchState.current.touches.length >= 2;
  }, []);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isTwoFingerGesture,
  };
}
