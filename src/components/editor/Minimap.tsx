import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Room, ViewTransform } from '@/lib/canvas/types';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { useState } from 'react';

interface MinimapProps {
  rooms: Room[];
  viewTransform: ViewTransform;
  canvasSize: { width: number; height: number };
  onNavigate: (offsetX: number, offsetY: number) => void;
  className?: string;
}

const MINIMAP_SIZE = 160;
const MINIMAP_PADDING = 10;

export function Minimap({ 
  rooms, 
  viewTransform, 
  canvasSize,
  onNavigate,
  className = ''
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Calculate bounding box of all rooms
  const bounds = useMemo(() => {
    if (rooms.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    rooms.forEach(room => {
      room.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });
    
    // Add padding
    const paddingPercent = 0.1;
    const width = maxX - minX;
    const height = maxY - minY;
    
    return {
      minX: minX - width * paddingPercent,
      minY: minY - height * paddingPercent,
      maxX: maxX + width * paddingPercent,
      maxY: maxY + height * paddingPercent,
      width: width * (1 + paddingPercent * 2),
      height: height * (1 + paddingPercent * 2),
    };
  }, [rooms]);
  
  // Calculate minimap scale
  const minimapScale = useMemo(() => {
    const scaleX = (MINIMAP_SIZE - MINIMAP_PADDING * 2) / bounds.width;
    const scaleY = (MINIMAP_SIZE - MINIMAP_PADDING * 2) / bounds.height;
    return Math.min(scaleX, scaleY);
  }, [bounds]);
  
  // Convert world coordinates to minimap coordinates
  const worldToMinimap = useCallback((x: number, y: number) => {
    return {
      x: (x - bounds.minX) * minimapScale + MINIMAP_PADDING,
      y: (y - bounds.minY) * minimapScale + MINIMAP_PADDING,
    };
  }, [bounds, minimapScale]);
  
  // Convert minimap coordinates to world coordinates
  const minimapToWorld = useCallback((minimapX: number, minimapY: number) => {
    return {
      x: (minimapX - MINIMAP_PADDING) / minimapScale + bounds.minX,
      y: (minimapY - MINIMAP_PADDING) / minimapScale + bounds.minY,
    };
  }, [bounds, minimapScale]);
  
  // Render minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || collapsed) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_SIZE * dpr;
    canvas.height = MINIMAP_SIZE * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.fillStyle = 'hsl(var(--background))';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Draw rooms
    rooms.forEach(room => {
      if (room.points.length < 3) return;
      
      ctx.beginPath();
      const firstPoint = worldToMinimap(room.points[0].x, room.points[0].y);
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      for (let i = 1; i < room.points.length; i++) {
        const point = worldToMinimap(room.points[i].x, room.points[i].y);
        ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      
      // Fill with room color
      ctx.fillStyle = room.color;
      ctx.fill();
      
      // Stroke outline
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    
    // Draw viewport rectangle
    const viewportWidth = canvasSize.width / viewTransform.zoom;
    const viewportHeight = canvasSize.height / viewTransform.zoom;
    const viewportX = -viewTransform.offsetX / viewTransform.zoom;
    const viewportY = -viewTransform.offsetY / viewTransform.zoom;
    
    const vpTopLeft = worldToMinimap(viewportX, viewportY);
    const vpSize = {
      width: viewportWidth * minimapScale,
      height: viewportHeight * minimapScale,
    };
    
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(vpTopLeft.x, vpTopLeft.y, vpSize.width, vpSize.height);
    ctx.setLineDash([]);
    
    // Fill viewport with semi-transparent overlay
    ctx.fillStyle = 'hsl(var(--primary) / 0.1)';
    ctx.fillRect(vpTopLeft.x, vpTopLeft.y, vpSize.width, vpSize.height);
    
  }, [rooms, viewTransform, canvasSize, minimapScale, worldToMinimap, collapsed]);
  
  // Handle click/drag on minimap
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;
    
    // Convert to world coordinates
    const worldPoint = minimapToWorld(minimapX, minimapY);
    
    // Center the viewport on this point
    const newOffsetX = -worldPoint.x * viewTransform.zoom + canvasSize.width / 2;
    const newOffsetY = -worldPoint.y * viewTransform.zoom + canvasSize.height / 2;
    
    onNavigate(newOffsetX, newOffsetY);
  }, [minimapToWorld, viewTransform.zoom, canvasSize, onNavigate]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleMinimapClick(e);
  }, [handleMinimapClick]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handleMinimapClick(e);
  }, [isDragging, handleMinimapClick]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  if (rooms.length === 0) return null;
  
  return (
    <div 
      className={`absolute bottom-4 right-4 glass-panel rounded-lg overflow-hidden shadow-lg ${className}`}
      style={{ 
        width: collapsed ? 'auto' : MINIMAP_SIZE,
        height: collapsed ? 'auto' : MINIMAP_SIZE + 32,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground">Minimap</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
        </Button>
      </div>
      
      {/* Canvas */}
      {!collapsed && (
        <canvas
          ref={canvasRef}
          width={MINIMAP_SIZE}
          height={MINIMAP_SIZE}
          className="cursor-pointer"
          style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}
    </div>
  );
}
