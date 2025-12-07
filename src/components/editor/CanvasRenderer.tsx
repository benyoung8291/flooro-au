import { useEffect, useRef, useCallback, useState } from 'react';
import { CanvasState, CanvasPoint, Room, ViewTransform, MATERIAL_TYPE_COLORS, DEFAULT_ROOM_COLOR, BackgroundImage } from '@/lib/canvas/types';
import { calculatePolygonArea, calculateRoomNetArea, mmSquaredToMSquared, pixelAreaToRealArea } from '@/lib/canvas/geometry';

interface CanvasRendererProps {
  state: CanvasState;
  drawingPoints: CanvasPoint[];
  cursorPosition: CanvasPoint | null;
  isDrawing: boolean;
  orthoLocked: boolean;
  snapPoint: CanvasPoint | null;
  axisSnapLines: { horizontal: number | null; vertical: number | null };
  materialTypes?: Map<string, string>;
}

// Cache for loaded images
const imageCache = new Map<string, HTMLImageElement>();

export function CanvasRenderer({
  state,
  drawingPoints,
  cursorPosition,
  isDrawing,
  orthoLocked,
  snapPoint,
  axisSnapLines,
  materialTypes = new Map(),
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // Load background image when URL changes
  useEffect(() => {
    const bgImage = state.backgroundImage;
    if (!bgImage?.url) {
      setLoadedImage(null);
      return;
    }

    // Check cache first
    if (imageCache.has(bgImage.url)) {
      setLoadedImage(imageCache.get(bgImage.url)!);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(bgImage.url, img);
      setLoadedImage(img);
    };
    img.onerror = () => {
      console.error('Failed to load background image');
      setLoadedImage(null);
    };
    img.src = bgImage.url;
  }, [state.backgroundImage?.url]);

  const getRoomColor = useCallback((room: Room): string => {
    if (room.materialId && materialTypes.has(room.materialId)) {
      const type = materialTypes.get(room.materialId)!;
      return MATERIAL_TYPE_COLORS[type] || DEFAULT_ROOM_COLOR;
    }
    return room.color || DEFAULT_ROOM_COLOR;
  }, [materialTypes]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offsetX, offsetY, zoom } = state.viewTransform;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Set canvas size
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear canvas
    ctx.fillStyle = 'hsl(210 20% 96%)';
    ctx.fillRect(0, 0, width, height);

    // Save context for transformations
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Draw grid
    drawGrid(ctx, width, height, zoom, offsetX, offsetY);

    // Draw background image (below everything else)
    if (loadedImage && state.backgroundImage) {
      drawBackgroundImage(ctx, loadedImage, state.backgroundImage, zoom);
    }

    // Draw axis snap lines
    if (axisSnapLines.horizontal !== null) {
      ctx.strokeStyle = 'hsl(142 71% 45%)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.beginPath();
      ctx.moveTo(-10000, axisSnapLines.horizontal);
      ctx.lineTo(10000, axisSnapLines.horizontal);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (axisSnapLines.vertical !== null) {
      ctx.strokeStyle = 'hsl(142 71% 45%)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.beginPath();
      ctx.moveTo(axisSnapLines.vertical, -10000);
      ctx.lineTo(axisSnapLines.vertical, 10000);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw existing rooms
    state.rooms.forEach(room => {
      drawRoom(ctx, room, state.selectedRoomId === room.id, getRoomColor(room), zoom, state.scale);
    });

    // Draw current drawing in progress
    if (isDrawing && drawingPoints.length > 0) {
      ctx.strokeStyle = 'hsl(217 91% 50%)';
      ctx.lineWidth = 2 / zoom;
      ctx.fillStyle = 'hsla(217, 91%, 50%, 0.1)';

      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      drawingPoints.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      
      // Draw line to cursor if available
      if (cursorPosition) {
        ctx.lineTo(cursorPosition.x, cursorPosition.y);
      }
      
      ctx.stroke();

      // Draw vertices
      drawingPoints.forEach((point, index) => {
        ctx.fillStyle = index === 0 ? 'hsl(142 71% 45%)' : 'white';
        ctx.strokeStyle = 'hsl(217 91% 50%)';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Draw snap indicator
    if (snapPoint) {
      ctx.fillStyle = 'hsl(142 71% 45%)';
      ctx.beginPath();
      ctx.arc(snapPoint.x, snapPoint.y, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Draw ortho indicator (outside transform)
    if (orthoLocked && isDrawing) {
      ctx.fillStyle = 'hsl(217 91% 50%)';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('ORTHO', 10, height - 10);
    }
  }, [state, drawingPoints, cursorPosition, isDrawing, orthoLocked, snapPoint, axisSnapLines, getRoomColor, loadedImage]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      render();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [render]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bgImage: BackgroundImage,
  zoom: number
) {
  ctx.save();
  
  // Apply image transformations
  ctx.globalAlpha = bgImage.opacity;
  ctx.translate(bgImage.offsetX, bgImage.offsetY);
  ctx.rotate((bgImage.rotation * Math.PI) / 180);
  ctx.scale(bgImage.scale, bgImage.scale);
  
  // Draw image centered at origin
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  
  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  offsetX: number,
  offsetY: number
) {
  const gridSize = 50;
  const gridColor = 'hsl(214 32% 91%)';
  const majorGridColor = 'hsl(214 32% 85%)';

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5 / zoom;

  // Calculate visible area in world coordinates
  const startX = Math.floor(-offsetX / zoom / gridSize) * gridSize - gridSize;
  const endX = Math.ceil((width - offsetX) / zoom / gridSize) * gridSize + gridSize;
  const startY = Math.floor(-offsetY / zoom / gridSize) * gridSize - gridSize;
  const endY = Math.ceil((height - offsetY) / zoom / gridSize) * gridSize + gridSize;

  // Draw vertical lines
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.strokeStyle = x % (gridSize * 4) === 0 ? majorGridColor : gridColor;
    ctx.lineWidth = x % (gridSize * 4) === 0 ? 1 / zoom : 0.5 / zoom;
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.strokeStyle = y % (gridSize * 4) === 0 ? majorGridColor : gridColor;
    ctx.lineWidth = y % (gridSize * 4) === 0 ? 1 / zoom : 0.5 / zoom;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  isSelected: boolean,
  fillColor: string,
  zoom: number,
  scale: CanvasState['scale']
) {
  if (room.points.length < 3) return;

  // Draw fill
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(room.points[0].x, room.points[0].y);
  room.points.slice(1).forEach(point => {
    ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();

  // Cut out holes
  room.holes.forEach(hole => {
    if (hole.points.length >= 3) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(hole.points[0].x, hole.points[0].y);
      hole.points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });

  // Draw outline
  ctx.strokeStyle = isSelected ? 'hsl(142 71% 45%)' : 'hsl(217 91% 50%)';
  ctx.lineWidth = (isSelected ? 3 : 2) / zoom;
  ctx.beginPath();
  ctx.moveTo(room.points[0].x, room.points[0].y);
  room.points.slice(1).forEach(point => {
    ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.stroke();

  // Draw hole outlines
  room.holes.forEach(hole => {
    if (hole.points.length >= 3) {
      ctx.strokeStyle = 'hsl(0 84% 60%)';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(hole.points[0].x, hole.points[0].y);
      hole.points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Draw doors
  room.doors.forEach(door => {
    ctx.fillStyle = 'hsl(45 93% 47%)';
    ctx.strokeStyle = 'hsl(45 93% 35%)';
    ctx.lineWidth = 1 / zoom;
    
    const doorWidthPx = scale ? door.width * scale.pixelsPerMm : door.width / 10;
    const doorHeight = 8 / zoom;
    
    ctx.save();
    ctx.translate(door.position.x, door.position.y);
    ctx.rotate(door.rotation * Math.PI / 180);
    ctx.fillRect(-doorWidthPx / 2, -doorHeight / 2, doorWidthPx, doorHeight);
    ctx.strokeRect(-doorWidthPx / 2, -doorHeight / 2, doorWidthPx, doorHeight);
    ctx.restore();
  });

  // Draw vertices
  room.points.forEach(point => {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = isSelected ? 'hsl(142 71% 45%)' : 'hsl(217 91% 50%)';
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5 / zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // Draw room label with area
  const centerX = room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length;
  const centerY = room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length;
  
  const pixelArea = calculateRoomNetArea(room);
  let areaText = '';
  if (scale) {
    const realArea = mmSquaredToMSquared(pixelAreaToRealArea(pixelArea, scale));
    areaText = `${realArea.toFixed(2)} m²`;
  } else {
    areaText = `${(pixelArea / 10000).toFixed(1)} units²`;
  }

  ctx.fillStyle = 'hsl(217 91% 30%)';
  ctx.font = `bold ${14 / zoom}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(room.name, centerX, centerY - 10 / zoom);
  ctx.font = `${12 / zoom}px Inter, sans-serif`;
  ctx.fillText(areaText, centerX, centerY + 10 / zoom);
}
