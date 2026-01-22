import { useMemo } from 'react';
import { EditorTool } from './EditorCanvas';
import { Room, ScaleCalibration, DimensionUnit } from '@/lib/canvas/types';
import { calculatePolygonAreaWithCurves, calculatePerimeterWithCurves } from '@/lib/canvas/geometry';
import { 
  MousePointer2, 
  Pencil, 
  Move, 
  Ruler, 
  DoorOpen, 
  Combine, 
  Scissors,
  SquareDashed,
  RectangleHorizontal,
  Crosshair,
  Grid3X3,
  CornerDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasStatusBarProps {
  activeTool: EditorTool;
  scale: ScaleCalibration | null;
  cursorPosition?: { x: number; y: number } | null;
  selectedRoom: Room | null;
  dimensionUnit: DimensionUnit;
  isOrthoLocked?: boolean;
  isSnapEnabled?: boolean;
  isGridEnabled?: boolean;
  zoom?: number;
}

const toolInfo: Record<EditorTool, { icon: React.ElementType; label: string; shortcut: string }> = {
  select: { icon: MousePointer2, label: 'Select', shortcut: 'V' },
  draw: { icon: Pencil, label: 'Draw Room', shortcut: 'D' },
  rectangle: { icon: RectangleHorizontal, label: 'Rectangle', shortcut: 'R' },
  hole: { icon: SquareDashed, label: 'Cut Hole', shortcut: 'H' },
  door: { icon: DoorOpen, label: 'Add Door', shortcut: 'O' },
  scale: { icon: Ruler, label: 'Set Scale', shortcut: 'S' },
  pan: { icon: Move, label: 'Pan', shortcut: 'Space' },
  merge: { icon: Combine, label: 'Merge', shortcut: 'M' },
  split: { icon: Scissors, label: 'Split', shortcut: 'X' },
};

// Convert pixels to meters using scale (pixelsPerMm)
function pixelsToMeters(pixels: number, scale: ScaleCalibration): number {
  return (pixels / scale.pixelsPerMm) / 1000;
}

function formatDimension(meters: number, unit: DimensionUnit): string {
  switch (unit) {
    case 'cm':
      return `${(meters * 100).toFixed(1)} cm`;
    case 'mm':
      return `${(meters * 1000).toFixed(0)} mm`;
    case 'imperial': {
      const totalInches = meters * 39.3701;
      const feet = Math.floor(totalInches / 12);
      const inches = (totalInches % 12).toFixed(1);
      return `${feet}'${inches}"`;
    }
    default:
      return `${meters.toFixed(2)} m`;
  }
}

function formatArea(sqMeters: number, unit: DimensionUnit): string {
  switch (unit) {
    case 'cm':
      return `${(sqMeters * 10000).toFixed(0)} cm²`;
    case 'mm':
      return `${(sqMeters * 1000000).toFixed(0)} mm²`;
    case 'imperial': {
      const sqFeet = sqMeters * 10.7639;
      return `${sqFeet.toFixed(1)} ft²`;
    }
    default:
      return `${sqMeters.toFixed(2)} m²`;
  }
}

function formatCoordinate(pixels: number, scale: ScaleCalibration | null, unit: DimensionUnit): string {
  if (!scale) return `${pixels.toFixed(0)}px`;
  const meters = pixelsToMeters(pixels, scale);
  return formatDimension(meters, unit);
}

export function CanvasStatusBar({
  activeTool,
  scale,
  cursorPosition,
  selectedRoom,
  dimensionUnit,
  isOrthoLocked = false,
  isSnapEnabled = true,
  isGridEnabled = false,
  zoom = 1,
}: CanvasStatusBarProps) {
  const tool = toolInfo[activeTool];
  const ToolIcon = tool.icon;

  const roomStats = useMemo(() => {
    if (!selectedRoom || !scale) return null;
    
    const areaPixels = calculatePolygonAreaWithCurves(selectedRoom.points, selectedRoom.edgeCurves);
    const perimeterPixels = calculatePerimeterWithCurves(selectedRoom.points, selectedRoom.edgeCurves);
    
    // Convert from pixels to meters (pixelsPerMm / 1000 = pixelsPerMeter)
    const pixelsPerMeter = scale.pixelsPerMm * 1000;
    const areaSqM = areaPixels / (pixelsPerMeter * pixelsPerMeter);
    const perimeterM = perimeterPixels / pixelsPerMeter;
    
    return {
      area: formatArea(areaSqM, dimensionUnit),
      perimeter: formatDimension(perimeterM, dimensionUnit),
      name: selectedRoom.name || 'Unnamed Room',
    };
  }, [selectedRoom, scale, dimensionUnit]);

  return (
    <div className="glass-panel flex items-center justify-between gap-4 px-3 py-1.5 text-xs">
      {/* Left: Tool Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium">
          <ToolIcon className="w-3.5 h-3.5 text-primary" />
          <span>{tool.label}</span>
          <kbd className="hidden sm:inline-block px-1 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
            {tool.shortcut}
          </kbd>
        </div>

        {/* Scale Indicator */}
        {scale && (
          <div className="hidden sm:flex items-center gap-1 text-muted-foreground border-l border-border pl-3">
            <Ruler className="w-3 h-3" />
            <span className="font-mono">
              1:{Math.round(scale.pixelsPerMm * 100)}
            </span>
          </div>
        )}
      </div>

      {/* Center: Cursor Position & Room Info */}
      <div className="flex items-center gap-4">
        {cursorPosition && (
          <div className="hidden md:flex items-center gap-1 text-muted-foreground font-mono">
            <Crosshair className="w-3 h-3" />
            <span>
              X: {formatCoordinate(cursorPosition.x, scale, dimensionUnit)}
            </span>
            <span className="mx-1">·</span>
            <span>
              Y: {formatCoordinate(cursorPosition.y, scale, dimensionUnit)}
            </span>
          </div>
        )}

        {roomStats && (
          <div className="flex items-center gap-2 text-foreground">
            <span className="font-medium truncate max-w-[120px]">{roomStats.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono">{roomStats.area}</span>
            <span className="hidden lg:inline text-muted-foreground">·</span>
            <span className="hidden lg:inline font-mono text-muted-foreground">{roomStats.perimeter}</span>
          </div>
        )}
      </div>

      {/* Right: Active Constraints & Zoom */}
      <div className="flex items-center gap-2">
        {isOrthoLocked && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
            <CornerDownRight className="w-3 h-3" />
            <span className="hidden sm:inline">Ortho</span>
          </div>
        )}
        
        {isSnapEnabled && (
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
            isGridEnabled ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Grid3X3 className="w-3 h-3" />
            <span className="hidden sm:inline">Snap</span>
          </div>
        )}

        <div className="hidden sm:block border-l border-border pl-2 text-muted-foreground font-mono">
          {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}
