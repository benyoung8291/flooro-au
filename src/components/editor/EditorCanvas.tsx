import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Polygon, Line, Circle, Point } from 'fabric';

export type EditorTool = 'select' | 'draw' | 'hole' | 'door' | 'scale' | 'pan';

interface EditorCanvasProps {
  activeTool: EditorTool;
  onCanvasReady?: (canvas: FabricCanvas) => void;
  jsonData?: Record<string, unknown>;
  onDataChange?: (data: Record<string, unknown>) => void;
}

export function EditorCanvas({ 
  activeTool, 
  onCanvasReady, 
  jsonData,
  onDataChange 
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [tempLines, setTempLines] = useState<Line[]>([]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: 'hsl(210 20% 96%)',
      selection: activeTool === 'select',
    });

    // Draw grid
    drawGrid(fabricCanvas, width, height);

    setCanvas(fabricCanvas);
    onCanvasReady?.(fabricCanvas);

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      fabricCanvas.setDimensions({ width: newWidth, height: newHeight });
      fabricCanvas.renderAll();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      fabricCanvas.dispose();
    };
  }, []);

  // Handle tool changes
  useEffect(() => {
    if (!canvas) return;

    canvas.selection = activeTool === 'select';
    canvas.defaultCursor = activeTool === 'draw' ? 'crosshair' : 'default';
    
    // Reset drawing state when switching tools
    if (activeTool !== 'draw') {
      setIsDrawing(false);
      setDrawingPoints([]);
      tempLines.forEach(line => canvas.remove(line));
      setTempLines([]);
    }

    canvas.getObjects().forEach(obj => {
      if (obj.type !== 'line' || !(obj as any).isGrid) {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select';
      }
    });

    canvas.renderAll();
  }, [activeTool, canvas]);

  // Handle canvas mouse events for drawing
  useEffect(() => {
    if (!canvas) return;

    const handleMouseDown = (e: any) => {
      if (activeTool !== 'draw') return;
      
      const pointer = canvas.getPointer(e.e);
      const point = new Point(pointer.x, pointer.y);

      if (!isDrawing) {
        // Start new polygon
        setIsDrawing(true);
        setDrawingPoints([point]);
      } else {
        // Check if clicking near start point to close polygon
        const startPoint = drawingPoints[0];
        const distance = Math.sqrt(
          Math.pow(point.x - startPoint.x, 2) + 
          Math.pow(point.y - startPoint.y, 2)
        );

        if (distance < 15 && drawingPoints.length >= 3) {
          // Close polygon
          createPolygon(drawingPoints);
          setIsDrawing(false);
          setDrawingPoints([]);
          tempLines.forEach(line => canvas.remove(line));
          setTempLines([]);
        } else {
          // Add point
          const newPoints = [...drawingPoints, point];
          setDrawingPoints(newPoints);

          // Draw line to previous point
          const prevPoint = drawingPoints[drawingPoints.length - 1];
          const line = new Line([prevPoint.x, prevPoint.y, point.x, point.y], {
            stroke: 'hsl(217 91% 50%)',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          canvas.add(line);
          setTempLines(prev => [...prev, line]);
        }
      }
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawing || activeTool !== 'draw' || drawingPoints.length === 0) return;
      
      // Could add preview line here if desired
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        // Cancel drawing
        setIsDrawing(false);
        setDrawingPoints([]);
        tempLines.forEach(line => canvas.remove(line));
        setTempLines([]);
        canvas.renderAll();
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, activeTool, isDrawing, drawingPoints, tempLines]);

  const createPolygon = useCallback((points: Point[]) => {
    if (!canvas) return;

    const polygon = new Polygon(points, {
      fill: 'hsla(217, 91%, 50%, 0.15)',
      stroke: 'hsl(217 91% 50%)',
      strokeWidth: 2,
      selectable: true,
      objectCaching: false,
    });

    // Add corner points as draggable circles
    points.forEach((point, index) => {
      const circle = new Circle({
        left: point.x - 6,
        top: point.y - 6,
        radius: 6,
        fill: 'white',
        stroke: 'hsl(217 91% 50%)',
        strokeWidth: 2,
        selectable: true,
        hasBorders: false,
        hasControls: false,
        originX: 'center',
        originY: 'center',
      });
      
      (circle as any).polygonIndex = index;
      (circle as any).parentPolygon = polygon;
      
      canvas.add(circle);
    });

    canvas.add(polygon);
    canvas.renderAll();

    // Trigger data change
    onDataChange?.({
      rooms: [
        ...(jsonData?.rooms as any[] || []),
        { 
          id: `room_${Date.now()}`,
          points: points.map(p => ({ x: p.x, y: p.y })),
          material: null,
        }
      ]
    });
  }, [canvas, jsonData, onDataChange]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full canvas-container"
    >
      <canvas ref={canvasRef} />
      
      {/* Drawing indicator */}
      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium animate-pulse">
          Click to add points • Close near start point • Press Esc to cancel
        </div>
      )}
    </div>
  );
}

function drawGrid(canvas: FabricCanvas, width: number, height: number) {
  const gridSize = 50;
  const gridColor = 'hsl(214 32% 91%)';

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    const line = new Line([x, 0, x, height], {
      stroke: gridColor,
      strokeWidth: x % (gridSize * 2) === 0 ? 1 : 0.5,
      selectable: false,
      evented: false,
    });
    (line as any).isGrid = true;
    canvas.add(line);
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    const line = new Line([0, y, width, y], {
      stroke: gridColor,
      strokeWidth: y % (gridSize * 2) === 0 ? 1 : 0.5,
      selectable: false,
      evented: false,
    });
    (line as any).isGrid = true;
    canvas.add(line);
  }

  canvas.sendObjectToBack(canvas.getObjects()[0]);
}
