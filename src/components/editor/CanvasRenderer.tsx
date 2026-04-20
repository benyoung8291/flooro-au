import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { CanvasState, CanvasPoint, Room, ViewTransform, MATERIAL_TYPE_COLORS, DEFAULT_ROOM_COLOR, BackgroundImage, DimensionUnit, EdgeCurve, ProjectMaterial } from '@/lib/canvas/types';
import { calculatePolygonArea, calculateRoomNetArea, mmSquaredToMSquared, pixelAreaToRealArea, getQuadraticBezierPoint, getEdgeMidpoint, distance } from '@/lib/canvas/geometry';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { SharedEdge, detectSharedEdges } from '@/lib/canvas/sharedEdgeDetector';
import { HoveredHoleVertex, HoveredHoleWall } from '@/hooks/useCanvasEditing';

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
  snapType?: 'vertex' | 'grid' | 'axis' | 'drawing' | null;
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
  // Grid props
  showGrid?: boolean;
  gridSizePx?: number;
  // Merge mode props
  mergeFirstRoomId?: string | null;
  mergeableRoomIds?: string[];
  isMergeMode?: boolean;
  // Split mode props
  splitRoomId?: string | null;
  splitStartPoint?: CanvasPoint | null;
  splitPreviewEnd?: CanvasPoint | null;
  isSplitMode?: boolean;
  // Rectangle preview props
  rectangleStart?: CanvasPoint | null;
  activeTool?: string;
  // Project materials for code badges
  projectMaterials?: ProjectMaterial[];
  // Scale tool preview
  scaleStart?: CanvasPoint | null;
  // Hole rectangle preview
  holeRectStart?: CanvasPoint | null;
  // Hole editing hover state
  hoveredHoleVertex?: HoveredHoleVertex | null;
  hoveredHoleWall?: HoveredHoleWall | null;
  // Transition drawing tool state
  transitionDrawStart?: { roomId: string; edgeIndex: number; percent: number } | null;
  transitionHoverEdge?: { roomId: string; edgeIndex: number; percent: number; projectedPoint: CanvasPoint } | null;
  // Polyline auto-close indicator (glowing ring around start vertex)
  isCloseSnapping?: boolean;
  // Inline edge-length editing: receives bounding rects of dimension labels (canvas coords)
  onDimensionLabelsRendered?: (rects: DimensionLabelRect[]) => void;
}

export interface DimensionLabelRect {
  roomId: string;
  edgeIndex: number;
  // Canvas-space center & half-extents along the edge (axis-aligned bbox in canvas coords)
  cx: number;
  cy: number;
  halfWidth: number;
  halfHeight: number;
  pixelLength: number;
  realLengthMm: number | null;
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
  snapType,
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
  showGrid = false,
  gridSizePx = 0,
  mergeFirstRoomId,
  mergeableRoomIds = [],
  isMergeMode = false,
  splitRoomId,
  splitStartPoint,
  splitPreviewEnd,
  isSplitMode = false,
  rectangleStart,
  activeTool,
  projectMaterials = [],
  scaleStart,
  holeRectStart,
  hoveredHoleVertex,
  hoveredHoleWall,
  transitionDrawStart,
  transitionHoverEdge,
  isCloseSnapping = false,
  onDimensionLabelsRendered,
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

    // Set canvas size with HiDPI support
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = width;
    const displayHeight = height;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
    }

    // Scale context for HiDPI
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear canvas
    const isDarkMode = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDarkMode ? 'hsl(220 13% 13%)' : 'hsl(210 20% 96%)';
    ctx.fillRect(0, 0, width, height);

    // Save context for transformations
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Draw default subtle grid
    drawGrid(ctx, width, height, zoom, offsetX, offsetY);

    // Draw snap grid overlay if enabled
    if (showGrid && gridSizePx > 0) {
      drawSnapGrid(ctx, width, height, zoom, offsetX, offsetY, gridSizePx);
    }

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

    // Collect dimension label rects for inline-edit hit testing
    const labelRects: DimensionLabelRect[] = [];

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
        isMergeDimmed,
        projectMaterials,
        labelRects
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
      
      // Draw hole vertices for selected room (for interactive editing)
      if (room.id === state.selectedRoomId && room.holes.length > 0) {
        room.holes.forEach(hole => {
          // Draw hole wall hover highlighting
          if (hoveredHoleWall?.roomId === room.id && hoveredHoleWall?.holeId === hole.id) {
            const wallIdx = hoveredHoleWall.index;
            const wp1 = hole.points[wallIdx];
            const wp2 = hole.points[(wallIdx + 1) % hole.points.length];
            ctx.strokeStyle = 'hsl(45 93% 47%)';
            ctx.lineWidth = 4 / zoom;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(wp1.x, wp1.y);
            ctx.lineTo(wp2.x, wp2.y);
            ctx.stroke();
          }
          
          // Draw hole vertices
          hole.points.forEach((p, idx) => {
            const isHovered = hoveredHoleVertex?.roomId === room.id && hoveredHoleVertex?.holeId === hole.id && hoveredHoleVertex?.index === idx;
            ctx.fillStyle = isHovered ? 'hsl(45 93% 47%)' : 'hsl(0 84% 60%)';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();
            ctx.arc(p.x, p.y, (isHovered ? 7 : 4) / zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        });
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

      // Draw polygon close zone indicator when enough points exist
      if (drawingPoints.length >= 3) {
        const firstPoint = drawingPoints[0];
        ctx.save();
        if (isCloseSnapping) {
          // Strong glowing ring when actively snapping to close
          ctx.shadowColor = 'hsl(142 71% 45%)';
          ctx.shadowBlur = 16 / zoom;
          ctx.strokeStyle = 'hsl(142 71% 45%)';
          ctx.lineWidth = 3 / zoom;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(firstPoint.x, firstPoint.y, 14 / zoom, 0, Math.PI * 2);
          ctx.stroke();
          // Inner filled marker
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'hsl(142 71% 45%)';
          ctx.beginPath();
          ctx.arc(firstPoint.x, firstPoint.y, 6 / zoom, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = 'hsla(142, 71%, 45%, 0.5)';
          ctx.lineWidth = 1 / zoom;
          ctx.setLineDash([4 / zoom, 4 / zoom]);
          ctx.beginPath();
          ctx.arc(firstPoint.x, firstPoint.y, 15 / zoom, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    }

    // Draw rectangle preview while placing
    if (rectangleStart && activeTool === 'rectangle' && cursorPosition) {
      const rx1 = Math.min(rectangleStart.x, cursorPosition.x);
      const ry1 = Math.min(rectangleStart.y, cursorPosition.y);
      const rx2 = Math.max(rectangleStart.x, cursorPosition.x);
      const ry2 = Math.max(rectangleStart.y, cursorPosition.y);
      const rw = rx2 - rx1;
      const rh = ry2 - ry1;

      ctx.save();
      ctx.setLineDash([8 / zoom, 4 / zoom]);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 2 / zoom;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.beginPath();
      ctx.rect(rx1, ry1, rw, rh);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw start corner marker
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.beginPath();
      ctx.arc(rectangleStart.x, rectangleStart.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Show dimensions text
      if (rw > 5 && rh > 5) {
        let widthText: string;
        let heightText: string;
        if (state.scale) {
          const wMm = rw / state.scale.pixelsPerMm;
          const hMm = rh / state.scale.pixelsPerMm;
          widthText = formatDimension(wMm, dimensionUnit);
          heightText = formatDimension(hMm, dimensionUnit);
        } else {
          widthText = `${Math.round(rw)}px`;
          heightText = `${Math.round(rh)}px`;
        }

        const dimText = `${widthText} × ${heightText}`;
        const fontSize = 12 / zoom;
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(dimText, rx1 + rw / 2, ry1 - 6 / zoom);
      }

      ctx.restore();
    }

    // Draw scale tool reference line
    if (scaleStart && activeTool === 'scale' && cursorPosition) {
      ctx.save();

      // Draw the reference line
      ctx.strokeStyle = 'hsl(45 93% 47%)';
      ctx.lineWidth = 2.5 / zoom;
      ctx.setLineDash([8 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(scaleStart.x, scaleStart.y);
      ctx.lineTo(cursorPosition.x, cursorPosition.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw start point
      ctx.fillStyle = 'hsl(45 93% 47%)';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.arc(scaleStart.x, scaleStart.y, 6 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw end point (cursor)
      ctx.fillStyle = 'hsl(45 93% 47%)';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.arc(cursorPosition.x, cursorPosition.y, 6 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Show pixel length label at midpoint
      const dx = cursorPosition.x - scaleStart.x;
      const dy = cursorPosition.y - scaleStart.y;
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      const midX = (scaleStart.x + cursorPosition.x) / 2;
      const midY = (scaleStart.y + cursorPosition.y) / 2;

      const fontSize = 12 / zoom;
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      const lengthText = `${Math.round(pixelLength)}px`;
      const textWidth = ctx.measureText(lengthText).width;
      const padding = 4 / zoom;

      // Background pill
      ctx.fillStyle = 'hsla(45, 93%, 47%, 0.9)';
      ctx.beginPath();
      ctx.roundRect(
        midX - textWidth / 2 - padding,
        midY - fontSize - padding * 2,
        textWidth + padding * 2,
        fontSize + padding * 2,
        3 / zoom
      );
      ctx.fill();

      // Text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lengthText, midX, midY - fontSize / 2 - padding / 2);

      ctx.restore();
    } else if (scaleStart && activeTool === 'scale') {
      // Draw just the start point when cursor hasn't moved yet
      ctx.save();
      ctx.fillStyle = 'hsl(45 93% 47%)';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.arc(scaleStart.x, scaleStart.y, 6 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw hole rectangle preview while cutting
    if (holeRectStart && activeTool === 'hole' && cursorPosition) {
      const hx1 = Math.min(holeRectStart.x, cursorPosition.x);
      const hy1 = Math.min(holeRectStart.y, cursorPosition.y);
      const hx2 = Math.max(holeRectStart.x, cursorPosition.x);
      const hy2 = Math.max(holeRectStart.y, cursorPosition.y);
      const hw = hx2 - hx1;
      const hh = hy2 - hy1;

      ctx.save();
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.strokeStyle = 'hsl(0 84% 60%)';
      ctx.lineWidth = 2 / zoom;
      ctx.fillStyle = 'hsla(0, 84%, 60%, 0.1)';
      ctx.beginPath();
      ctx.rect(hx1, hy1, hw, hh);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw start corner marker
      ctx.fillStyle = 'hsl(0 84% 60%)';
      ctx.beginPath();
      ctx.arc(holeRectStart.x, holeRectStart.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Show dimensions text
      if (hw > 5 && hh > 5) {
        let widthText: string;
        let heightText: string;
        if (state.scale) {
          const wMm = hw / state.scale.pixelsPerMm;
          const hMm = hh / state.scale.pixelsPerMm;
          widthText = formatDimension(wMm, dimensionUnit);
          heightText = formatDimension(hMm, dimensionUnit);
        } else {
          widthText = `${Math.round(hw)}px`;
          heightText = `${Math.round(hh)}px`;
        }

        const dimText = `${widthText} × ${heightText}`;
        const fontSize = 12 / zoom;
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = 'hsl(0 84% 60%)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(dimText, hx1 + hw / 2, hy1 - 6 / zoom);
      }

      ctx.restore();
    }

    // Draw snap indicator with type-specific styling
    if (snapPoint) {
      if (snapType === 'vertex') {
        // Vertex snap - highlighted ring
        ctx.strokeStyle = 'hsl(142 71% 45%)';
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.arc(snapPoint.x, snapPoint.y, 12 / zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'hsl(142 71% 45%)';
        ctx.beginPath();
        ctx.arc(snapPoint.x, snapPoint.y, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
      } else if (snapType === 'grid') {
        // Grid snap - crosshair
        ctx.strokeStyle = 'hsl(217 91% 60%)';
        ctx.lineWidth = 1.5 / zoom;
        const size = 10 / zoom;
        ctx.beginPath();
        ctx.moveTo(snapPoint.x - size, snapPoint.y);
        ctx.lineTo(snapPoint.x + size, snapPoint.y);
        ctx.moveTo(snapPoint.x, snapPoint.y - size);
        ctx.lineTo(snapPoint.x, snapPoint.y + size);
        ctx.stroke();
        ctx.fillStyle = 'hsl(217 91% 50%)';
        ctx.beginPath();
        ctx.arc(snapPoint.x, snapPoint.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Default snap indicator
        ctx.fillStyle = 'hsl(142 71% 45%)';
        ctx.beginPath();
        ctx.arc(snapPoint.x, snapPoint.y, 8 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw split preview
    if (isSplitMode && splitRoomId && splitStartPoint) {
      // Draw start point marker
      ctx.fillStyle = 'hsl(280 70% 50%)';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.arc(splitStartPoint.x, splitStartPoint.y, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw preview line to cursor/end point
      if (splitPreviewEnd) {
        ctx.strokeStyle = 'hsl(280 70% 50%)';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.beginPath();
        ctx.moveTo(splitStartPoint.x, splitStartPoint.y);
        ctx.lineTo(splitPreviewEnd.x, splitPreviewEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw end point indicator
        ctx.fillStyle = 'hsl(280 70% 60%)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.arc(splitPreviewEnd.x, splitPreviewEnd.y, 6 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Highlight split room edges when in split mode but no start point yet
    if (isSplitMode && splitRoomId && !splitStartPoint) {
      const splitRoom = state.rooms.find(r => r.id === splitRoomId);
      if (splitRoom) {
        ctx.strokeStyle = 'hsl(280 70% 50%)';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([8 / zoom, 4 / zoom]);
        ctx.beginPath();
        splitRoom.points.forEach((p, i) => {
          if (i === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        });
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw transition tool visuals
    if (activeTool === 'transition') {
      // Draw hover highlight on nearest edge
      if (transitionHoverEdge) {
        const hoverRoom = state.rooms.find(r => r.id === transitionHoverEdge.roomId);
        if (hoverRoom) {
          const ei = transitionHoverEdge.edgeIndex;
          const hp1 = hoverRoom.points[ei];
          const hp2 = hoverRoom.points[(ei + 1) % hoverRoom.points.length];
          
          // Highlight the edge in amber
          ctx.strokeStyle = 'hsla(35, 90%, 50%, 0.6)';
          ctx.lineWidth = 5 / zoom;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(hp1.x, hp1.y);
          ctx.lineTo(hp2.x, hp2.y);
          ctx.stroke();

          // Draw snap dot at projected point
          ctx.fillStyle = 'hsl(35 90% 50%)';
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2 / zoom;
          ctx.beginPath();
          ctx.arc(transitionHoverEdge.projectedPoint.x, transitionHoverEdge.projectedPoint.y, 6 / zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Draw start marker and preview line if first click is set
      if (transitionDrawStart) {
        const startRoom = state.rooms.find(r => r.id === transitionDrawStart.roomId);
        if (startRoom) {
          const ei = transitionDrawStart.edgeIndex;
          const sp1 = startRoom.points[ei];
          const sp2 = startRoom.points[(ei + 1) % startRoom.points.length];
          const startPos = {
            x: sp1.x + (sp2.x - sp1.x) * transitionDrawStart.percent,
            y: sp1.y + (sp2.y - sp1.y) * transitionDrawStart.percent,
          };

          // Draw start marker
          ctx.fillStyle = 'hsl(35 90% 50%)';
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2.5 / zoom;
          ctx.beginPath();
          ctx.arc(startPos.x, startPos.y, 7 / zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw preview line to hover position if on same edge
          if (transitionHoverEdge && transitionHoverEdge.roomId === transitionDrawStart.roomId && transitionHoverEdge.edgeIndex === transitionDrawStart.edgeIndex) {
            const endPos = transitionHoverEdge.projectedPoint;
            // Amber dashed preview between start and hover
            ctx.strokeStyle = 'hsl(35 90% 50%)';
            ctx.lineWidth = 4 / zoom;
            ctx.setLineDash([8 / zoom, 4 / zoom]);
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Semi-transparent fill strip along the preview
            const edgeDx = sp2.x - sp1.x;
            const edgeDy = sp2.y - sp1.y;
            const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
            if (edgeLen > 0) {
              const perpX = -edgeDy / edgeLen;
              const perpY = edgeDx / edgeLen;
              const stripWidth = 3 / zoom;

              ctx.fillStyle = 'hsla(35, 90%, 50%, 0.2)';
              ctx.beginPath();
              ctx.moveTo(startPos.x + perpX * stripWidth, startPos.y + perpY * stripWidth);
              ctx.lineTo(endPos.x + perpX * stripWidth, endPos.y + perpY * stripWidth);
              ctx.lineTo(endPos.x - perpX * stripWidth, endPos.y - perpY * stripWidth);
              ctx.lineTo(startPos.x - perpX * stripWidth, startPos.y - perpY * stripWidth);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }

    // Draw subtle amber tint strips on existing transition segments (always visible)
    for (const room of state.rooms) {
      if (!room.edgeTransitions || room.edgeTransitions.length === 0) continue;
      for (const transition of room.edgeTransitions) {
        const ei = transition.edgeIndex;
        if (ei < 0 || ei >= room.points.length) continue;
        const tp1 = room.points[ei];
        const tp2 = room.points[(ei + 1) % room.points.length];
        const tStart = transition.startPercent ?? 0;
        const tEnd = transition.endPercent ?? 1;
        const segStart = { x: tp1.x + (tp2.x - tp1.x) * tStart, y: tp1.y + (tp2.y - tp1.y) * tStart };
        const segEnd = { x: tp1.x + (tp2.x - tp1.x) * tEnd, y: tp1.y + (tp2.y - tp1.y) * tEnd };

        const edgeDx = tp2.x - tp1.x;
        const edgeDy = tp2.y - tp1.y;
        const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
        if (edgeLen === 0) continue;
        const perpX = -edgeDy / edgeLen;
        const perpY = edgeDx / edgeLen;
        const stripWidth = 3 / zoom;

        ctx.fillStyle = 'hsla(35, 90%, 50%, 0.15)';
        ctx.beginPath();
        ctx.moveTo(segStart.x, segStart.y);
        ctx.lineTo(segEnd.x, segEnd.y);
        ctx.lineTo(segEnd.x - perpX * stripWidth * 2, segEnd.y - perpY * stripWidth * 2);
        ctx.lineTo(segStart.x - perpX * stripWidth * 2, segStart.y - perpY * stripWidth * 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();

    // Draw ortho indicator (outside transform)
    if (orthoLocked && isDrawing) {
      ctx.fillStyle = 'hsl(217 91% 50%)';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('ORTHO', 10, height - 10);
    }

    // Notify parent of label rects for inline-edit hit testing
    onDimensionLabelsRendered?.(labelRects);
  }, [state, drawingPoints, cursorPosition, isDrawing, orthoLocked, snapPoint, snapType, axisSnapLines, getRoomColor, loadedImage, hoveredVertex, hoveredWall, hoveredCurveControl, hoveredRoomId, isDragging, isDraggingMaterial, dragTargetRoomId, showDimensionLabels, dimensionUnit, materialTypes, onFillDirectionClick, stripPlans, showSeamLines, showSharedEdgeIndicators, sharedEdges, mergeFirstRoomId, mergeableRoomIds, isMergeMode, splitRoomId, splitStartPoint, splitPreviewEnd, isSplitMode, showGrid, gridSizePx, rectangleStart, activeTool, projectMaterials, scaleStart, holeRectStart, hoveredHoleVertex, hoveredHoleWall, transitionDrawStart, transitionHoverEdge, isCloseSnapping, onDimensionLabelsRendered]);

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
  // Adaptive grid: keep ~50px screen spacing regardless of zoom
  const minScreenSpacing = 50;
  const rawSize = minScreenSpacing / zoom;
  
  // Snap to a "nice" number so grid looks clean
  const niceNumbers = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
  let gridSize = niceNumbers[niceNumbers.length - 1];
  for (const n of niceNumbers) {
    if (n >= rawSize) { gridSize = n; break; }
  }

  const gridColor = 'hsl(214 32% 91%)';
  const majorGridColor = 'hsl(214 32% 85%)';

  // Calculate visible area in world coordinates
  const startX = Math.floor(-offsetX / zoom / gridSize) * gridSize - gridSize;
  const endX = Math.ceil((width - offsetX) / zoom / gridSize) * gridSize + gridSize;
  const startY = Math.floor(-offsetY / zoom / gridSize) * gridSize - gridSize;
  const endY = Math.ceil((height - offsetY) / zoom / gridSize) * gridSize + gridSize;

  // Safety: skip if too many lines (shouldn't happen with adaptive sizing, but just in case)
  const lineCountX = (endX - startX) / gridSize;
  const lineCountY = (endY - startY) / gridSize;
  if (lineCountX > 200 || lineCountY > 200) return;

  // Fade grid at low zoom levels to prevent visual clutter
  const gridAlpha = Math.min(1, zoom * 2.5);
  ctx.save();
  ctx.globalAlpha = gridAlpha;

  // Batch minor grid lines into single path
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5 / zoom;
  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSize) {
    if (x % (gridSize * 4) !== 0) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
  }
  for (let y = startY; y <= endY; y += gridSize) {
    if (y % (gridSize * 4) !== 0) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
  }
  ctx.stroke();

  // Batch major grid lines into single path
  ctx.strokeStyle = majorGridColor;
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSize) {
    if (x % (gridSize * 4) === 0) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
  }
  for (let y = startY; y <= endY; y += gridSize) {
    if (y % (gridSize * 4) === 0) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
  }
  ctx.stroke();

  ctx.restore();
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
  isMergeDimmed: boolean = false,
  projectMaterials: ProjectMaterial[] = [],
  labelCollector?: DimensionLabelRect[]
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
    const edgeTransitions = room.edgeTransitions?.filter(t => t.edgeIndex === i) || [];
    const hasAnyTransition = edgeTransitions.length > 0;
    
    // For partial transitions, draw wall segments and transition segments separately
    if (hasAnyTransition && !isMergeTarget && !isMergeSelected && !isMergeable && !isMergeDimmed && !isDragTarget && !isValidDropZone && !isWallHovered) {
      // Sort transitions by startPercent
      const sorted = [...edgeTransitions].sort((a, b) => (a.startPercent ?? 0) - (b.startPercent ?? 0));
      
      // Draw wall portions (gaps between transitions)
      let lastEnd = 0;
      for (const t of sorted) {
        const tStart = t.startPercent ?? 0;
        const tEnd = t.endPercent ?? 1;
        
        // Draw wall from lastEnd to tStart
        if (tStart > lastEnd) {
          const segP1 = { x: p1.x + (p2.x - p1.x) * lastEnd, y: p1.y + (p2.y - p1.y) * lastEnd };
          const segP2 = { x: p1.x + (p2.x - p1.x) * tStart, y: p1.y + (p2.y - p1.y) * tStart };
          ctx.strokeStyle = isSelected ? 'hsl(142 71% 45%)' : 'hsl(217 91% 50%)';
          ctx.lineWidth = (isSelected ? 3 : 2) / zoom;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(segP1.x, segP1.y);
          ctx.lineTo(segP2.x, segP2.y);
          ctx.stroke();
        }
        
        // Draw transition portion
        const segP1 = { x: p1.x + (p2.x - p1.x) * tStart, y: p1.y + (p2.y - p1.y) * tStart };
        const segP2 = { x: p1.x + (p2.x - p1.x) * tEnd, y: p1.y + (p2.y - p1.y) * tEnd };
        ctx.strokeStyle = isSelected ? 'hsl(35 90% 50%)' : 'hsl(35 80% 55%)';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.beginPath();
        ctx.moveTo(segP1.x, segP1.y);
        ctx.lineTo(segP2.x, segP2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        lastEnd = tEnd;
      }
      
      // Draw remaining wall after last transition
      if (lastEnd < 1) {
        const segP1 = { x: p1.x + (p2.x - p1.x) * lastEnd, y: p1.y + (p2.y - p1.y) * lastEnd };
        ctx.strokeStyle = isSelected ? 'hsl(142 71% 45%)' : 'hsl(217 91% 50%)';
        ctx.lineWidth = (isSelected ? 3 : 2) / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(segP1.x, segP1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      
      // Draw transition label badges for each segment
      for (const transition of sorted) {
        const tStart = transition.startPercent ?? 0;
        const tEnd = transition.endPercent ?? 1;
        const midPct = (tStart + tEnd) / 2;
        const midX = p1.x + (p2.x - p1.x) * midPct;
        const midY = p1.y + (p2.y - p1.y) * midPct;
        
        const edgeLabel = `E${i + 1}`;
        const typeLabel = transition.transitionType === 'auto' ? '' :
          transition.transitionType === 'alu-angle' ? `Alu ${transition.aluAngleSizeMm || '?'}mm` :
          transition.transitionType === 't-molding' ? 'T-Mold' :
          transition.transitionType === 'reducer' ? 'Reducer' :
          transition.transitionType === 'threshold' ? 'Threshold' :
          transition.transitionType === 'ramp' ? 'Ramp' :
          transition.transitionType === 'end-cap' ? 'End Cap' : '';
        const adjLabel = transition.adjacentRoomName ? `→ ${transition.adjacentRoomName}` : '';
        const pctLabel = (tStart > 0 || tEnd < 1) ? `${Math.round(tStart * 100)}-${Math.round(tEnd * 100)}%` : '';
        const fullLabel = [edgeLabel, typeLabel, pctLabel, adjLabel].filter(Boolean).join(' ');

        const fontSize = 9 / zoom;
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const textWidth = ctx.measureText(fullLabel).width;
        const paddingX = 5 / zoom;
        const paddingY = 3 / zoom;
        const badgeHeight = fontSize + paddingY * 2;
        const badgeWidth = textWidth + paddingX * 2;

        const edgeDx = p2.x - p1.x;
        const edgeDy = p2.y - p1.y;
        const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
        const perpX = edgeLen > 0 ? -edgeDy / edgeLen : 0;
        const perpY = edgeLen > 0 ? edgeDx / edgeLen : 0;
        const offsetDist = 14 / zoom;
        const labelX = midX + perpX * offsetDist;
        const labelY = midY + perpY * offsetDist;

        ctx.fillStyle = 'hsl(35 90% 50%)';
        ctx.beginPath();
        ctx.roundRect(labelX - badgeWidth / 2, labelY - badgeHeight / 2, badgeWidth, badgeHeight, 3 / zoom);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fullLabel, labelX, labelY);
      }
    } else {
      // Original single-stroke drawing for non-transition edges or override states
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
      } else if (isCurved) {
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
    }

    // Draw edge number labels for selected rooms (non-transition edges)
    if (isSelected && !hasAnyTransition && !isDragTarget && !isValidDropZone && !isMergeSelected && !isMergeable && !isMergeTarget && !isMergeDimmed) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      // Offset perpendicular to edge
      const edgeDx = p2.x - p1.x;
      const edgeDy = p2.y - p1.y;
      const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);

      // Only show for edges long enough
      if (edgeLen > 30 / zoom) {
        const perpX = edgeLen > 0 ? -edgeDy / edgeLen : 0;
        const perpY = edgeLen > 0 ? edgeDx / edgeLen : 0;
        const offsetDist = 14 / zoom;
        const labelX = midX + perpX * offsetDist;
        const labelY = midY + perpY * offsetDist;

        const edgeLabel = `E${i + 1}`;
        const fontSize = 8 / zoom;
        ctx.font = `${fontSize}px Inter, sans-serif`;
        const tw = ctx.measureText(edgeLabel).width;
        const px = 3 / zoom;
        const py = 2 / zoom;

        // Semi-transparent background
        ctx.fillStyle = 'hsla(217, 91%, 50%, 0.6)';
        ctx.beginPath();
        ctx.roundRect(
          labelX - tw / 2 - px,
          labelY - fontSize / 2 - py,
          tw + px * 2,
          fontSize + py * 2,
          2 / zoom
        );
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edgeLabel, labelX, labelY);
      }
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
    drawDimensionLabels(ctx, room.points, room.edgeCurves, zoom, scale, dimensionUnit, room.id, labelCollector);
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
    
    // Draw resize handles when room is selected
    if (isSelected) {
      const handleSize = 6 / zoom;
      const handleY = 0;
      
      // Left handle
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'hsl(45 93% 35%)';
      ctx.lineWidth = 1.5 / zoom;
      ctx.fillRect(-doorWidthPx / 2 - handleSize / 2, handleY - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(-doorWidthPx / 2 - handleSize / 2, handleY - handleSize / 2, handleSize, handleSize);
      
      // Right handle
      ctx.fillRect(doorWidthPx / 2 - handleSize / 2, handleY - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(doorWidthPx / 2 - handleSize / 2, handleY - handleSize / 2, handleSize, handleSize);
    }
    
    ctx.restore();
  });

  // Draw transition resize handles (diamond-shaped, only for selected room)
  if (isSelected && room.edgeTransitions && room.edgeTransitions.length > 0) {
    for (const transition of room.edgeTransitions) {
      const edgeIdx = transition.edgeIndex;
      if (edgeIdx < 0 || edgeIdx >= room.points.length) continue;
      const ep1 = room.points[edgeIdx];
      const ep2 = room.points[(edgeIdx + 1) % room.points.length];
      const tStart = transition.startPercent ?? 0;
      const tEnd = transition.endPercent ?? 1;

      const handleSize = 7 / zoom;
      const positions = [
        { x: ep1.x + (ep2.x - ep1.x) * tStart, y: ep1.y + (ep2.y - ep1.y) * tStart },
        { x: ep1.x + (ep2.x - ep1.x) * tEnd, y: ep1.y + (ep2.y - ep1.y) * tEnd },
      ];

      for (const pos of positions) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(Math.PI / 4); // Diamond = rotated square
        ctx.fillStyle = 'hsl(35 90% 50%)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 / zoom;
        ctx.fillRect(-handleSize / 2, -handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(-handleSize / 2, -handleSize / 2, handleSize, handleSize);
        ctx.restore();
      }
    }
  }

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
  // Calculate true polygon centroid using signed area method
  let cx = 0, cy = 0, signedArea = 0;
  for (let i = 0; i < room.points.length; i++) {
    const j = (i + 1) % room.points.length;
    const cross = room.points[i].x * room.points[j].y - room.points[j].x * room.points[i].y;
    cx += (room.points[i].x + room.points[j].x) * cross;
    cy += (room.points[i].y + room.points[j].y) * cross;
    signedArea += cross;
  }
  signedArea /= 2;
  const centerX = signedArea !== 0 ? cx / (6 * signedArea) : room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length;
  const centerY = signedArea !== 0 ? cy / (6 * signedArea) : room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length;
  
  const pixelArea = calculateRoomNetArea(room);
  let areaText = '';
  if (scale) {
    const realAreaM2 = mmSquaredToMSquared(pixelAreaToRealArea(pixelArea, scale));
    if (dimensionUnit === 'imperial') {
      const sqFt = realAreaM2 * 10.7639;
      areaText = `${sqFt.toFixed(1)} ft²`;
    } else {
      areaText = `${realAreaM2.toFixed(2)} m²`;
    }
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

  // Draw material code badge if room has a project material
  if (room.materialId && projectMaterials.length > 0) {
    const projectMaterial = projectMaterials.find(pm => pm.id === room.materialId);
    if (projectMaterial?.materialCode) {
      const code = projectMaterial.materialCode;
      const codeY = centerY + 30 / zoom;
      
      // Measure text for badge background
      ctx.font = `bold ${10 / zoom}px ui-monospace, monospace`;
      const textMetrics = ctx.measureText(code);
      const badgeWidth = textMetrics.width + 8 / zoom;
      const badgeHeight = 14 / zoom;
      
      // Draw badge background (rounded rect)
      ctx.fillStyle = 'hsl(217 91% 50%)';
      const radius = 3 / zoom;
      const badgeX = centerX - badgeWidth / 2;
      const badgeY = codeY - badgeHeight / 2;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
      ctx.fill();
      
      // Draw text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(code, centerX, codeY);
    }
  }
}

function drawDimensionLabels(
  ctx: CanvasRenderingContext2D,
  points: CanvasPoint[],
  edgeCurves: EdgeCurve[] | undefined,
  zoom: number,
  scale: CanvasState['scale'],
  dimensionUnit: DimensionUnit = 'm',
  roomId?: string,
  collector?: DimensionLabelRect[]
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

    // Capture label rect for inline-edit hit testing (axis-aligned bbox in canvas coords)
    if (collector && roomId) {
      const labelCx = midX + offsetX;
      const labelCy = midY + offsetY;
      const halfW = textWidth / 2 + padding;
      const halfH = fontSize / 2 + padding;
      // Account for rotation: use largest axis-aligned bbox of the rotated rect
      const cosA = Math.abs(Math.cos(textAngle));
      const sinA = Math.abs(Math.sin(textAngle));
      const bboxHalfW = halfW * cosA + halfH * sinA;
      const bboxHalfH = halfW * sinA + halfH * cosA;
      collector.push({
        roomId,
        edgeIndex: i,
        cx: labelCx,
        cy: labelCy,
        halfWidth: bboxHalfW,
        halfHeight: bboxHalfH,
        pixelLength,
        realLengthMm: scale ? pixelLength / scale.pixelsPerMm : null,
      });
    }
  }
}

function drawFillDirectionArrow(
  ctx: CanvasRenderingContext2D,
  room: Room,
  zoom: number,
  isSelected: boolean
) {
  if (room.points.length < 3) return;
  
  // Calculate true polygon centroid
  let arrowCx = 0, arrowCy = 0, arrowSignedArea = 0;
  for (let i = 0; i < room.points.length; i++) {
    const j = (i + 1) % room.points.length;
    const cross = room.points[i].x * room.points[j].y - room.points[j].x * room.points[i].y;
    arrowCx += (room.points[i].x + room.points[j].x) * cross;
    arrowCy += (room.points[i].y + room.points[j].y) * cross;
    arrowSignedArea += cross;
  }
  arrowSignedArea /= 2;
  const centerX = arrowSignedArea !== 0 ? arrowCx / (6 * arrowSignedArea) : room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length;
  const centerY = arrowSignedArea !== 0 ? arrowCy / (6 * arrowSignedArea) : room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length;
  
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

/**
 * Draw snap grid overlay with enhanced visibility
 */
function drawSnapGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  gridSizePx: number
) {
  if (gridSizePx <= 0) return;
  
  // Calculate visible bounds in canvas coordinates
  const visibleMinX = -offsetX / zoom;
  const visibleMaxX = (width - offsetX) / zoom;
  const visibleMinY = -offsetY / zoom;
  const visibleMaxY = (height - offsetY) / zoom;
  
  // Calculate grid line start/end positions
  const startX = Math.floor(visibleMinX / gridSizePx) * gridSizePx;
  const endX = Math.ceil(visibleMaxX / gridSizePx) * gridSizePx;
  const startY = Math.floor(visibleMinY / gridSizePx) * gridSizePx;
  const endY = Math.ceil(visibleMaxY / gridSizePx) * gridSizePx;
  
  // Skip if too dense -- lines and dots would be invisible at this zoom
  const linesX = (endX - startX) / gridSizePx;
  const linesY = (endY - startY) / gridSizePx;
  if (linesX > 100 || linesY > 100) return;
  
  ctx.save();
  
  // Fade snap grid at low zoom
  const snapAlpha = Math.min(1, zoom * 2);
  ctx.globalAlpha = snapAlpha;
  
  ctx.strokeStyle = 'hsla(217, 70%, 50%, 0.15)';
  ctx.lineWidth = 1 / zoom;
  
  // Batch vertical lines into single path
  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSizePx) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  ctx.stroke();
  
  // Batch horizontal lines into single path
  ctx.beginPath();
  for (let y = startY; y <= endY; y += gridSizePx) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
  
  // Only draw intersection dots if reasonable count
  if (linesX * linesY < 2500) {
    ctx.fillStyle = 'hsla(217, 70%, 50%, 0.25)';
    const dotSize = 2 / zoom;
    for (let x = startX; x <= endX; x += gridSizePx) {
      for (let y = startY; y <= endY; y += gridSizePx) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  ctx.restore();
}
