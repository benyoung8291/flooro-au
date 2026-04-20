import { useMemo } from 'react';
import { EditorTool } from './EditorCanvas';
import { Room, ScaleCalibration, DimensionUnit } from '@/lib/canvas/types';
import { calculatePolygonAreaWithCurves, calculatePerimeterWithCurves, calculateRoomNetArea } from '@/lib/canvas/geometry';
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
  ArrowLeftRight,
  Crosshair,
  Grid3X3,
  CornerDownRight,
  Percent,
  Triangle,
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
  isRightAngleLocked?: boolean;
  zoom?: number;
  /** Default waste % to apply when room has no override */
  defaultWastePercent?: number;
}

const toolInfo: Record<EditorTool, { icon: React.ElementType; label: string; shortcut: string }> = {
  select: { icon: MousePointer2, label: 'Select', shortcut: 'V' },
  draw: { icon: Pencil, label: 'Draw Room', shortcut: 'D' },
  rectangle: { icon: RectangleHorizontal, label: 'Rectangle', shortcut: 'R' },
  hole: { icon: SquareDashed, label: 'Cut Hole', shortcut: 'H' },
  door: { icon: DoorOpen, label: 'Add Door', shortcut: 'O' },
  transition: { icon: ArrowLeftRight, label: 'Transition', shortcut: 'T' },
  scale: { icon: Ruler, label: 'Set Scale', shortcut: 'S' },
  pan: { icon: Move, label: 'Pan', shortcut: 'Space' },
  merge: { icon: Combine, label: 'Merge', shortcut: 'M' },
  split: { icon: Scissors, label: 'Split', shortcut: 'X' },
};

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
  isRightAngleLocked = false,
  zoom = 1,
  defaultWastePercent = 10,
}: CanvasStatusBarProps) {
  const tool = toolInfo[activeTool];
  const ToolIcon = tool.icon;

  // Live measurement HUD: net area, order area (with waste), perimeter, doors,
  // transitions, applied waste %. Updates whenever the selected room changes.
  const roomStats = useMemo(() => {
    if (!selectedRoom || !scale) return null;

    const grossPixels = calculatePolygonAreaWithCurves(selectedRoom.points, selectedRoom.edgeCurves);
    const netPixels = calculateRoomNetArea(selectedRoom);
    const perimeterPixels = calculatePerimeterWithCurves(selectedRoom.points, selectedRoom.edgeCurves);

    const pixelsPerMeter = scale.pixelsPerMm * 1000;
    const grossSqM = grossPixels / (pixelsPerMeter * pixelsPerMeter);
    const netSqM = netPixels / (pixelsPerMeter * pixelsPerMeter);
    const perimeterM = perimeterPixels / pixelsPerMeter;

    const wastePct = selectedRoom.wastePercent ?? defaultWastePercent;
    const orderSqM = netSqM * (1 + wastePct / 100);

    const doorCount = selectedRoom.doors?.length ?? 0;
    const transitionCount = selectedRoom.edgeTransitions?.length ?? 0;
    const holeCount = selectedRoom.holes?.length ?? 0;

    return {
      name: selectedRoom.name || 'Unnamed Room',
      net: formatArea(netSqM, dimensionUnit),
      order: formatArea(orderSqM, dimensionUnit),
      gross: formatArea(grossSqM, dimensionUnit),
      perimeter: formatDimension(perimeterM, dimensionUnit),
      wastePct,
      doorCount,
      transitionCount,
      holeCount,
    };
  }, [selectedRoom, scale, dimensionUnit, defaultWastePercent]);

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

        {scale && (
          <div className="hidden sm:flex items-center gap-1 text-muted-foreground border-l border-border pl-3">
            <Ruler className="w-3 h-3" />
            <span className="font-mono">
              1:{Math.round(scale.pixelsPerMm * 100)}
            </span>
          </div>
        )}
      </div>

      {/* Center: Cursor Position & Live Room HUD */}
      <div className="flex items-center gap-3 min-w-0">
        {cursorPosition && !roomStats && (
          <div className="hidden md:flex items-center gap-1 text-muted-foreground font-mono">
            <Crosshair className="w-3 h-3" />
            <span>X: {formatCoordinate(cursorPosition.x, scale, dimensionUnit)}</span>
            <span className="mx-1">·</span>
            <span>Y: {formatCoordinate(cursorPosition.y, scale, dimensionUnit)}</span>
          </div>
        )}

        {roomStats && (
          <div className="flex items-center gap-2 text-foreground min-w-0">
            <span className="font-medium truncate max-w-[140px]">{roomStats.name}</span>
            <span className="text-muted-foreground">·</span>

            {/* Net area */}
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-muted-foreground uppercase">Net</span>
              <span className="font-mono">{roomStats.net}</span>
            </div>

            {/* Order area (always shown) */}
            <span className="text-muted-foreground">·</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-primary uppercase font-medium">Order</span>
              <span className="font-mono text-primary">{roomStats.order}</span>
            </div>

            {/* Perimeter */}
            <span className="hidden lg:inline text-muted-foreground">·</span>
            <div className="hidden lg:flex items-baseline gap-1">
              <span className="text-[10px] text-muted-foreground uppercase">Perim</span>
              <span className="font-mono text-muted-foreground">{roomStats.perimeter}</span>
            </div>

            {/* Waste % chip */}
            <span className="hidden lg:inline text-muted-foreground">·</span>
            <div className="hidden lg:flex items-center gap-0.5 text-muted-foreground">
              <Percent className="w-3 h-3" />
              <span className="font-mono">{roomStats.wastePct}%</span>
            </div>

            {/* Door / transition counts */}
            {roomStats.doorCount > 0 && (
              <>
                <span className="hidden xl:inline text-muted-foreground">·</span>
                <div className="hidden xl:flex items-center gap-0.5 text-muted-foreground">
                  <DoorOpen className="w-3 h-3" />
                  <span>{roomStats.doorCount}</span>
                </div>
              </>
            )}
            {roomStats.transitionCount > 0 && (
              <>
                <span className="hidden xl:inline text-muted-foreground">·</span>
                <div className="hidden xl:flex items-center gap-0.5 text-muted-foreground">
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>{roomStats.transitionCount}</span>
                </div>
              </>
            )}
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

        {isRightAngleLocked && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-medium">
            <Triangle className="w-3 h-3" />
            <span className="hidden sm:inline">45°</span>
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
