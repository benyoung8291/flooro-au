import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { CanvasState, CanvasPoint, Room, ViewTransform, MATERIAL_TYPE_COLORS, DEFAULT_ROOM_COLOR, BackgroundImage, DimensionUnit, EdgeCurve } from '@/lib/canvas/types';
import { calculatePolygonArea, calculateRoomNetArea, mmSquaredToMSquared, pixelAreaToRealArea, getQuadraticBezierPoint, getEdgeMidpoint } from '@/lib/canvas/geometry';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { SharedEdge, detectSharedEdges } from '@/lib/canvas/sharedEdgeDetector';

interface HoveredCurveControl {
  roomId: string;
  edgeIndex: number;
  isHandle: boolean;
}

interface CanvasRendererProps {
  state: CanvasState;
  drawingPoints: CanvasPoint[];
  cursorPosition: CanvasPoint | null;
  isDrawing: boolean;
  orthoLocked: boolean;
  snapPoint: CanvasPoint | null;
  axisSnapLines: { horizontal: number | null; vertical: number | null };
  materialTypes?: Map<string, string>;
  hoveredVertex?: { roomId: string; index: number } | null;
  hoveredWall?: { roomId: string; index: number } | null;
  hoveredCurveControl?: HoveredCurveControl | null;
  hoveredRoomId?: string | null;
  isDragging?: boolean;
  isDraggingMaterial?: boolean;
  dragTargetRoomId?: string | null;
  onFillDirectionClick?: (roomId: string) => void;
  showDimensionLabels?: boolean;
  dimensionUnit?: DimensionUnit;
  stripPlans?: Map<string, StripPlanResult>;
  showSeamLines?: boolean;
  showSharedEdgeIndicators?: boolean;
  // Merge mode props
  mergeFirstRoomId?: string | null;
  mergeableRoomIds?: string[];
  isMergeMode?: boolean;
}

// Cache for loaded images
const imageCache = new Map<string, HTMLImageElement>();

// Format dimension based on selected unit
function formatDimension(realLengthMm: number, unit: DimensionUnit): string {
  switch (unit) {
    case 'mm':
      return `${Math.round(realLengthMm).toLocaleString()}mm`;
    case 'cm':
      return `${(realLengthMm / 10).toFixed(1)}cm`;
    case 'm':
      return `${(realLengthMm / 1000).toFixed(2)}m`;
    case 'imperial':
      // Convert mm to inches (1 inch = 25.4mm)
      const totalInches = realLengthMm / 25.4;
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      if (feet > 0) {
        return `${feet}'${inches.toFixed(1)}"`;
      }
      return `${inches.toFixed(1)}"`;
    default:
      return `${(realLengthMm / 1000).toFixed(2)}m`;
  }
}

export function CanvasRenderer({
  state,
  drawingPoints,
  cursorPosition,
  isDrawing,
  orthoLocked,
  snapPoint,
  axisSnapLines,
  materialTypes = new Map(),
  hoveredVertex,
  hoveredWall,
  hoveredCurveControl,
  hoveredRoomId,
  isDragging,
  isDraggingMaterial = false,
  dragTargetRoomId,
  onFillDirectionClick,
  showDimensionLabels = true,
  dimensionUnit = 'm',
  stripPlans,
  showSeamLines = true,
  showSharedEdgeIndicators = true,
  mergeFirstRoomId,
  mergeableRoomIds = [],
  isMergeMode = false,
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // Detect shared edges between rooms
  const sharedEdges = useMemo(() => {
    return detectSharedEdges(state.rooms);
  }, [state.rooms]);

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
      const roomHoveredVertex = hoveredVertex?.roomId === room.id ? hoveredVertex.index : null;
      const roomHoveredWall = hoveredWall?.roomId === room.id ? hoveredWall.index : null;
      const roomHoveredCurve = hoveredCurveControl?.roomId === room.id ? hoveredCurveControl : null;
      const isRoomHovered = hoveredRoomId === room.id && state.selectedRoomId !== room.id;
      const isDragTarget = isDraggingMaterial && dragTargetRoomId === room.id;
      const isValidDropZone = isDraggingMaterial && !isDragTarget;
      const materialType = room.materialId ? materialTypes.get(room.materialId) : undefined;
      
      // Merge mode states
      const isMergeSelected = isMergeMode && mergeFirstRoomId === room.id;
      const isMergeable = isMergeMode && mergeableRoomIds.includes(room.id);
      const isMergeTarget = isMergeMode && isMergeable && hoveredRoomId === room.id;
      const isMergeDimmed = isMergeMode && mergeFirstRoomId && !isMergeable && room.id !== mergeFirstRoomId;
      
      drawRoom(
        ctx, room, 
        state.selectedRoomId === room.id, 
        isRoomHovered, 
        isDragTarget, 
        isValidDropZone, 
        getRoomColor(room), 
        zoom, 
        state.scale, 
        roomHoveredVertex, 
        roomHoveredWall, 
        roomHoveredCurve, 
        isDragging, 
        showDimensionLabels, 
        dimensionUnit,
        isMergeSelected,
        isMergeable,
        isMergeTarget,
        isMergeDimmed
      );
      
      // Draw fill direction arrow for rooms with roll materials
      if (room.materialId && materialType === 'roll') {
        drawFillDirectionArrow(ctx, room, zoom, state.selectedRoomId === room.id);
      }
      
      // Draw seam lines overlay for rooms with strip plans
      if (showSeamLines && room.materialId && materialType === 'roll' && stripPlans?.has(room.id)) {
        const stripPlan = stripPlans.get(room.id)!;
        drawSeamLines(ctx, room, stripPlan, state.scale, zoom, state.selectedRoomId === room.id);
      }
    });

    // Draw shared edge indicators (unlinked adjacent rooms)
    if (showSharedEdgeIndicators && sharedEdges.length > 0) {
      drawSharedEdgeIndicators(ctx, sharedEdges, state.rooms, zoom);
    }

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
  }, [state, drawingPoints, cursorPosition, isDrawing, orthoLocked, snapPoint, axisSnapLines, getRoomColor, loadedImage, hoveredVertex, hoveredWall, hoveredCurveControl, hoveredRoomId, isDragging, isDraggingMaterial, dragTargetRoomId, showDimensionLabels, dimensionUnit, materialTypes, onFillDirectionClick, stripPlans, showSeamLines, showSharedEdgeIndicators, sharedEdges, mergeFirstRoomId, mergeableRoomIds, isMergeMode]);

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

/**
 * Draw indicators for shared edges between rooms that are not yet linked as transitions
 */
function drawSharedEdgeIndicators(
  ctx: CanvasRenderingContext2D,
  sharedEdges: SharedEdge[],
  rooms: Room[],
  zoom: number
) {
  for (const shared of sharedEdges) {
    const room1 = rooms.find(r => r.id === shared.room1Id);
    const room2 = rooms.find(r => r.id === shared.room2Id);
    if (!room1 || !room2) continue;

    // Check if this edge is already marked as a transition in either room
    const isTransitionInRoom1 = room1.edgeTransitions?.some(
      t => t.edgeIndex === shared.room1EdgeIndex
    );
    const isTransitionInRoom2 = room2.edgeTransitions?.some(
      t => t.edgeIndex === shared.room2EdgeIndex
    );

    // Only show indicator if not already a transition
    if (isTransitionInRoom1 || isTransitionInRoom2) continue;

    // Get edge midpoints
    const p1Start = room1.points[shared.room1EdgeIndex];
    const p1End = room1.points[(shared.room1EdgeIndex + 1) % room1.points.length];
    const mid1X = (p1Start.x + p1End.x) / 2;
    const mid1Y = (p1Start.y + p1End.y) / 2;

    const p2Start = room2.points[shared.room2EdgeIndex];
    const p2End = room2.points[(shared.room2EdgeIndex + 1) % room2.points.length];
    const mid2X = (p2Start.x + p2End.x) / 2;
    const mid2Y = (p2Start.y + p2End.y) / 2;

    // Draw connection line between midpoints
    ctx.save();
    ctx.strokeStyle = 'hsl(217 91% 60%)';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(mid1X, mid1Y);
    ctx.lineTo(mid2X, mid2Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Draw link indicator at the connection midpoint
    const connMidX = (mid1X + mid2X) / 2;
    const connMidY = (mid1Y + mid2Y) / 2;

    // Draw diamond indicator
    ctx.save();
    ctx.fillStyle = 'hsl(217 91% 55%)';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5 / zoom;
    
    const size = 6 / zoom;
    ctx.beginPath();
    ctx.moveTo(connMidX, connMidY - size);
    ctx.lineTo(connMidX + size, connMidY);
    ctx.lineTo(connMidX, connMidY + size);
    ctx.lineTo(connMidX - size, connMidY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Draw small link icons at the edge midpoints
    drawLinkIcon(ctx, mid1X, mid1Y, zoom);
    drawLinkIcon(ctx, mid2X, mid2Y, zoom);
  }
}

/**
 * Draw a small link icon at a position
 */
function drawLinkIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number
) {
  const size = 5 / zoom;
  
  ctx.save();
  ctx.fillStyle = 'hsl(217 91% 50%)';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw chain link symbol
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.2 / zoom;
  ctx.beginPath();
  // Left link
  ctx.arc(x - size * 0.3, y, size * 0.4, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  // Right link
  ctx.arc(x + size * 0.3, y, size * 0.4, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
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
  isHovered: boolean,
  isDragTarget: boolean,
  isValidDropZone: boolean,
  fillColor: string,
  zoom: number,
  scale: CanvasState['scale'],
  hoveredVertexIndex: number | null = null,
  hoveredWallIndex: number | null = null,
  hoveredCurve: HoveredCurveControl | null = null,
  isDragging: boolean = false,
  showDimensionLabels: boolean = true,
  dimensionUnit: DimensionUnit = 'm',
  isMergeSelected: boolean = false,
  isMergeable: boolean = false,
  isMergeTarget: boolean = false,
  isMergeDimmed: boolean = false
) {
  if (room.points.length < 3) return;

  // Helper to draw path with curves
  const drawPathWithCurves = (points: CanvasPoint[], edgeCurves?: EdgeCurve[]) => {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const p2 = points[j];
      const curve = edgeCurves?.[i];
      
      if (curve?.type === 'quadratic' && curve.controlPoint) {
        ctx.quadraticCurveTo(curve.controlPoint.x, curve.controlPoint.y, p2.x, p2.y);
      } else {
        ctx.lineTo(p2.x, p2.y);
      }
    }
  };

  // Draw fill with merge mode highlighting
  if (isMergeTarget) {
    ctx.fillStyle = 'hsla(142 71% 45% / 0.4)';
  } else if (isMergeSelected) {
    ctx.fillStyle = 'hsla(280 70% 50% / 0.35)';
  } else if (isMergeable) {
    ctx.fillStyle = 'hsla(217 91% 60% / 0.25)';
  } else if (isMergeDimmed) {
    ctx.fillStyle = 'hsla(0 0% 50% / 0.15)';
  } else if (isDragTarget) {
    ctx.fillStyle = 'hsla(142 71% 45% / 0.3)';
  } else if (isValidDropZone) {
    ctx.fillStyle = 'hsla(217 91% 50% / 0.15)';
  } else {
    ctx.fillStyle = fillColor;
  }
  ctx.beginPath();
  drawPathWithCurves(room.points, room.edgeCurves);
  ctx.closePath();
  ctx.fill();

  // Cut out holes
  room.holes.forEach(hole => {
    if (hole.points.length >= 3) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'white';
      ctx.beginPath();
      drawPathWithCurves(hole.points, hole.edgeCurves);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });

  // Draw outline with wall highlighting, hover effect, drag target effect, and transition edges
  for (let i = 0; i < room.points.length; i++) {
    const j = (i + 1) % room.points.length;
    const p1 = room.points[i];
    const p2 = room.points[j];
    const curve = room.edgeCurves?.[i];
    
    const isWallHovered = hoveredWallIndex === i && !isDragging;
    const isCurved = curve?.type === 'quadratic' && curve.controlPoint;
    const isTransitionEdge = room.edgeTransitions?.some(t => t.edgeIndex === i);
    
    // Determine stroke style based on state priority
    if (isMergeTarget) {
      ctx.strokeStyle = 'hsl(142 71% 45%)';
      ctx.lineWidth = 4 / zoom;
      ctx.setLineDash([]);
    } else if (isMergeSelected) {
      ctx.strokeStyle = 'hsl(280 70% 50%)';
      ctx.lineWidth = 4 / zoom;
      ctx.setLineDash([]);
    } else if (isMergeable) {
      ctx.strokeStyle = 'hsl(217 91% 60%)';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
    } else if (isMergeDimmed) {
      ctx.strokeStyle = 'hsl(0 0% 60%)';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([]);
    } else if (isDragTarget) {
      ctx.strokeStyle = 'hsl(142 71% 45%)';
      ctx.lineWidth = 4 / zoom;
      ctx.setLineDash([8 / zoom, 4 / zoom]);
    } else if (isValidDropZone) {
      ctx.strokeStyle = 'hsl(217 91% 60%)';
      ctx.lineWidth = 2.5 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
    } else if (isWallHovered) {
      ctx.strokeStyle = 'hsl(45 93% 47%)';
      ctx.lineWidth = 4 / zoom;
      ctx.setLineDash([]);
    } else if (isTransitionEdge) {
      // Transition edges get amber/orange dashed style
      ctx.strokeStyle = isSelected ? 'hsl(35 90% 50%)' : 'hsl(35 80% 55%)';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
    } else if (isCurved) {
      // Curved edges get a distinct color
      ctx.strokeStyle = isSelected ? 'hsl(280 70% 50%)' : 'hsl(280 60% 55%)';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([]);
    } else if (isSelected) {
      ctx.strokeStyle = 'hsl(142 71% 45%)';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([]);
    } else if (isHovered) {
      ctx.strokeStyle = 'hsl(217 91% 60%)';
      ctx.lineWidth = 2.5 / zoom;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = 'hsl(217 91% 50%)';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([]);
    }
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    if (curve?.type === 'quadratic' && curve.controlPoint) {
      ctx.quadraticCurveTo(curve.controlPoint.x, curve.controlPoint.y, p2.x, p2.y);
    } else {
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw transition indicator "T" at edge midpoint
    if (isTransitionEdge && !isDragTarget && !isValidDropZone) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      // Draw circle background
      ctx.fillStyle = 'hsl(35 90% 50%)';
      ctx.beginPath();
      ctx.arc(midX, midY, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw "T" letter
      ctx.fillStyle = 'white';
      ctx.font = `bold ${10 / zoom}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('T', midX, midY);
    }
  }

  // Draw curve control points and midpoint indicators
  if (isSelected) {
    for (let i = 0; i < room.points.length; i++) {
      const j = (i + 1) % room.points.length;
      const p1 = room.points[i];
      const p2 = room.points[j];
      const curve = room.edgeCurves?.[i];
      
      const isControlHovered = hoveredCurve?.edgeIndex === i && hoveredCurve.isHandle;
      const isMidpointHovered = hoveredCurve?.edgeIndex === i && !hoveredCurve.isHandle;
      
      if (curve?.type === 'quadratic' && curve.controlPoint) {
        // Draw control point handle
        const cp = curve.controlPoint;
        
        // Draw guide lines from control point to edge endpoints
        ctx.strokeStyle = 'hsla(280 60% 50% / 0.4)';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([3 / zoom, 3 / zoom]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(cp.x, cp.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw control point diamond
        const size = (isControlHovered ? 10 : 7) / zoom;
        ctx.save();
        ctx.translate(cp.x, cp.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = isControlHovered ? 'hsl(280 70% 55%)' : 'hsl(280 60% 65%)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 / zoom;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        // Draw "+" indicator at edge midpoint for adding curve
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        // Only show if edge is long enough
        const edgeLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        if (edgeLength > 40 / zoom) {
          const size = (isMidpointHovered ? 12 : 8) / zoom;
          
          ctx.fillStyle = isMidpointHovered ? 'hsl(280 70% 50%)' : 'hsla(280 50% 60% / 0.6)';
          ctx.beginPath();
          ctx.arc(midX, midY, size / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw "+" symbol
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1.5 / zoom;
          ctx.beginPath();
          ctx.moveTo(midX - size / 4, midY);
          ctx.lineTo(midX + size / 4, midY);
          ctx.moveTo(midX, midY - size / 4);
          ctx.lineTo(midX, midY + size / 4);
          ctx.stroke();
        }
      }
    }
  }

  // Draw dimension labels on each wall (if enabled)
  if (showDimensionLabels) {
    drawDimensionLabels(ctx, room.points, room.edgeCurves, zoom, scale, dimensionUnit);
  }

  // Draw hole outlines with curve support
  room.holes.forEach(hole => {
    if (hole.points.length >= 3) {
      ctx.strokeStyle = 'hsl(0 84% 60%)';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.beginPath();
      drawPathWithCurves(hole.points, hole.edgeCurves);
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

  // Draw vertices with hover highlighting
  room.points.forEach((point, index) => {
    const isVertexHovered = hoveredVertexIndex === index && !isDragging;
    
    ctx.fillStyle = isVertexHovered ? 'hsl(45 93% 47%)' : 'white';
    ctx.strokeStyle = isVertexHovered 
      ? 'hsl(45 93% 35%)' 
      : isSelected 
        ? 'hsl(142 71% 45%)' 
        : 'hsl(217 91% 50%)';
    ctx.lineWidth = (isVertexHovered ? 3 : 2) / zoom;
    
    ctx.beginPath();
    ctx.arc(point.x, point.y, (isVertexHovered ? 8 : 5) / zoom, 0, Math.PI * 2);
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

function drawDimensionLabels(
  ctx: CanvasRenderingContext2D,
  points: CanvasPoint[],
  edgeCurves: EdgeCurve[] | undefined,
  zoom: number,
  scale: CanvasState['scale'],
  dimensionUnit: DimensionUnit = 'm'
) {
  if (points.length < 2) return;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const p1 = points[i];
    const p2 = points[j];
    const curve = edgeCurves?.[i];

    // Calculate wall/edge length (accounting for curves)
    let pixelLength: number;
    let midX: number;
    let midY: number;
    let angle: number;

    if (curve?.type === 'quadratic' && curve.controlPoint) {
      // For curved edges, calculate arc length and use curve midpoint
      const cp = curve.controlPoint;
      // Approximate arc length using chord + 2*height method
      const chordLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const chordMidX = (p1.x + p2.x) / 2;
      const chordMidY = (p1.y + p2.y) / 2;
      const height = Math.sqrt((cp.x - chordMidX) ** 2 + (cp.y - chordMidY) ** 2);
      pixelLength = chordLength + (4 * height * height) / (3 * chordLength + 0.001);
      
      // Use curve midpoint for label position
      const curveMid = getQuadraticBezierPoint(p1, cp, p2, 0.5);
      midX = curveMid.x;
      midY = curveMid.y;
      
      // Angle at curve midpoint (tangent)
      const t = 0.5;
      const tangentX = 2 * (1 - t) * (cp.x - p1.x) + 2 * t * (p2.x - cp.x);
      const tangentY = 2 * (1 - t) * (cp.y - p1.y) + 2 * t * (p2.y - cp.y);
      angle = Math.atan2(tangentY, tangentX);
    } else {
      // Straight edge
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      pixelLength = Math.sqrt(dx * dx + dy * dy);
      midX = (p1.x + p2.x) / 2;
      midY = (p1.y + p2.y) / 2;
      angle = Math.atan2(dy, dx);
    }

    // Skip very short walls
    if (pixelLength < 20) continue;

    // Format dimension text using user's selected unit
    let dimensionText: string;
    if (scale) {
      const realLengthMm = pixelLength / scale.pixelsPerMm;
      dimensionText = formatDimension(realLengthMm, dimensionUnit);
    } else {
      dimensionText = `${Math.round(pixelLength)}px`;
    }

    // Calculate offset perpendicular to wall (outside the room)
    const offsetDistance = 16 / zoom;
    const perpAngle = angle - Math.PI / 2;
    const offsetX = Math.cos(perpAngle) * offsetDistance;
    const offsetY = Math.sin(perpAngle) * offsetDistance;

    // Determine text rotation (keep text readable)
    let textAngle = angle;
    if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
      textAngle += Math.PI;
    }

    // Draw dimension label background
    ctx.save();
    ctx.translate(midX + offsetX, midY + offsetY);
    ctx.rotate(textAngle);

    const fontSize = 10 / zoom;
    ctx.font = `${fontSize}px Inter, sans-serif`;
    const textWidth = ctx.measureText(dimensionText).width;
    const padding = 3 / zoom;

    // Background pill
    ctx.fillStyle = 'hsla(0, 0%, 100%, 0.9)';
    ctx.beginPath();
    ctx.roundRect(
      -textWidth / 2 - padding,
      -fontSize / 2 - padding,
      textWidth + padding * 2,
      fontSize + padding * 2,
      3 / zoom
    );
    ctx.fill();

    // Border
    ctx.strokeStyle = 'hsl(214 32% 80%)';
    ctx.lineWidth = 0.5 / zoom;
    ctx.stroke();

    // Text
    ctx.fillStyle = 'hsl(217 91% 30%)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dimensionText, 0, 0);

    ctx.restore();
  }
}

function drawFillDirectionArrow(
  ctx: CanvasRenderingContext2D,
  room: Room,
  zoom: number,
  isSelected: boolean
) {
  if (room.points.length < 3) return;
  
  // Calculate room centroid
  const centerX = room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length;
  const centerY = room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length;
  
  const direction = room.fillDirection || 0;
  const arrowLength = 35 / zoom;
  const arrowHeadSize = 10 / zoom;
  
  // Calculate arrow end point
  const radians = (direction * Math.PI) / 180;
  const endX = centerX + Math.cos(radians) * arrowLength;
  const endY = centerY + Math.sin(radians) * arrowLength;
  
  // Save context
  ctx.save();
  
  // Draw arrow shaft
  ctx.strokeStyle = isSelected ? 'hsl(180 70% 45%)' : 'hsl(180 60% 50%)';
  ctx.lineWidth = 3 / zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  
  // Draw arrow head
  const headAngle1 = radians + Math.PI + Math.PI / 6;
  const headAngle2 = radians + Math.PI - Math.PI / 6;
  
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX + Math.cos(headAngle1) * arrowHeadSize,
    endY + Math.sin(headAngle1) * arrowHeadSize
  );
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX + Math.cos(headAngle2) * arrowHeadSize,
    endY + Math.sin(headAngle2) * arrowHeadSize
  );
  ctx.stroke();
  
  // Draw center dot (clickable indicator)
  ctx.fillStyle = isSelected ? 'hsl(180 70% 45%)' : 'hsl(180 60% 50%)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5 / zoom, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

// Line-line intersection calculation
function lineLineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return null; // Parallel lines
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }
  return null;
}

// Find intersection points of a line with polygon edges
function getLinePolygonIntersections(
  x1: number, y1: number, x2: number, y2: number,
  polygon: { x: number; y: number }[]
): { x: number; y: number }[] {
  const intersections: { x: number; y: number }[] = [];
  
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    
    const intersection = lineLineIntersection(x1, y1, x2, y2, p1.x, p1.y, p2.x, p2.y);
    if (intersection) {
      intersections.push(intersection);
    }
  }
  
  return intersections;
}

// Point-in-polygon test using ray casting algorithm
function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function drawSeamLines(
  ctx: CanvasRenderingContext2D,
  room: Room,
  stripPlan: StripPlanResult,
  scale: CanvasState['scale'],
  zoom: number,
  isSelected: boolean
) {
  if (!scale || !stripPlan.seamLines || stripPlan.seamLines.length === 0) return;
  
  ctx.save();
  
  // Set seam line style - purple/magenta to distinguish from other elements
  ctx.strokeStyle = isSelected ? 'hsl(280 70% 50%)' : 'hsl(280 50% 60%)';
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([6 / zoom, 4 / zoom]);
  ctx.lineCap = 'round';
  
  stripPlan.seamLines.forEach(seam => {
    // Convert mm coordinates to pixels
    const x1Px = seam.x1 * scale.pixelsPerMm;
    const y1Px = seam.y1 * scale.pixelsPerMm;
    const x2Px = seam.x2 * scale.pixelsPerMm;
    const y2Px = seam.y2 * scale.pixelsPerMm;
    
    // Get intersection points with outer room polygon
    let allIntersections = getLinePolygonIntersections(
      x1Px, y1Px, x2Px, y2Px,
      room.points
    );
    
    // Get intersections with each hole polygon
    room.holes.forEach(hole => {
      if (hole.points.length >= 3) {
        const holeIntersections = getLinePolygonIntersections(
          x1Px, y1Px, x2Px, y2Px,
          hole.points
        );
        allIntersections = [...allIntersections, ...holeIntersections];
      }
    });
    
    // Need at least 2 intersection points to draw segments
    if (allIntersections.length < 2) return;
    
    // Sort intersections along the seam direction
    const isVertical = Math.abs(x2Px - x1Px) < Math.abs(y2Px - y1Px);
    allIntersections.sort((a, b) => isVertical ? a.y - b.y : a.x - b.x);
    
    // Draw segments where midpoint is inside the room (not in a hole)
    for (let i = 0; i < allIntersections.length - 1; i++) {
      const p1 = allIntersections[i];
      const p2 = allIntersections[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const midPoint = { x: midX, y: midY };
      
      // Check if midpoint is inside outer polygon
      if (!isPointInPolygon(midPoint, room.points)) continue;
      
      // Check if midpoint is inside any hole (if so, skip this segment)
      let inHole = false;
      for (const hole of room.holes) {
        if (hole.points.length >= 3 && isPointInPolygon(midPoint, hole.points)) {
          inHole = true;
          break;
        }
      }
      if (inHole) continue;
      
      // Draw this valid segment
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  });
  
  ctx.setLineDash([]);
  ctx.restore();
}
