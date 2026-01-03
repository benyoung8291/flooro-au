import { useState, useMemo, useRef, useCallback } from 'react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { StripPlanResult, SeamLine, SeamOverride, AvoidZone } from '@/lib/rollGoods/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Move, 
  Lock, 
  Unlock, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  GripVertical,
  Plus,
  Trash2
} from 'lucide-react';
import { FillDirectionControl } from './FillDirectionControl';
import { cn } from '@/lib/utils';

interface SeamEditorProps {
  room: Room;
  scale: ScaleCalibration | null;
  stripPlan: StripPlanResult | null;
  fillDirection: number;
  onFillDirectionChange: (direction: number) => void;
  manualSeams: SeamOverride[];
  onManualSeamsChange: (seams: SeamOverride[]) => void;
  avoidZones: AvoidZone[];
  onAvoidZonesChange: (zones: AvoidZone[]) => void;
  firstSeamOffset: number;
  onFirstSeamOffsetChange: (offset: number) => void;
  materialWidth: number;
  onRecalculate: () => void;
}

export function SeamEditor({
  room,
  scale,
  stripPlan,
  fillDirection,
  onFillDirectionChange,
  manualSeams,
  onManualSeamsChange,
  avoidZones,
  onAvoidZonesChange,
  firstSeamOffset,
  onFirstSeamOffsetChange,
  materialWidth,
  onRecalculate,
}: SeamEditorProps) {
  const [selectedSeamId, setSelectedSeamId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // SVG dimensions
  const width = 320;
  const height = 240;
  const padding = 30;

  // Calculate transformation from room coords to SVG coords
  const { transform, bbox } = useMemo(() => {
    if (!stripPlan) {
      return { transform: { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 }, bbox: null };
    }

    const bbox = stripPlan.roomBoundingBox;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const scaleX = availableWidth / Math.max(bbox.width, 1);
    const scaleY = availableHeight / Math.max(bbox.height, 1);
    const uniformScale = Math.min(scaleX, scaleY);

    return {
      transform: {
        scaleX: uniformScale,
        scaleY: uniformScale,
        offsetX: padding,
        offsetY: padding,
      },
      bbox,
    };
  }, [stripPlan]);

  const toSvgX = (mm: number) => transform.offsetX + (mm - (bbox?.minX || 0)) * transform.scaleX;
  const toSvgY = (mm: number) => transform.offsetY + (mm - (bbox?.minY || 0)) * transform.scaleY;
  const toMmX = (svgX: number) => (svgX - transform.offsetX) / transform.scaleX + (bbox?.minX || 0);
  const toMmY = (svgY: number) => (svgY - transform.offsetY) / transform.scaleY + (bbox?.minY || 0);

  // Analyze seam quality
  const analyzeSeam = useCallback((seam: SeamLine): 'optimal' | 'acceptable' | 'warning' => {
    // Check if seam is near a door
    for (const door of room.doors) {
      const doorCenter = door.position;
      const seamPosition = stripPlan?.layoutDirection === 'horizontal' ? seam.y1 : seam.x1;
      const doorPos = stripPlan?.layoutDirection === 'horizontal' ? doorCenter.y : doorCenter.x;
      
      // Convert door position to mm
      const pixelsPerMm = scale?.pixelsPerMm || 1;
      const doorPosMm = doorPos / pixelsPerMm;
      const doorWidthMm = door.width;
      
      // Check if seam is within door width
      if (Math.abs(seamPosition - doorPosMm) < doorWidthMm / 2) {
        return 'warning';
      }
      
      // Check if seam is close to door (within 300mm)
      if (Math.abs(seamPosition - doorPosMm) < doorWidthMm / 2 + 300) {
        return 'acceptable';
      }
    }
    
    // Check avoid zones
    for (const zone of avoidZones) {
      const seamPosition = stripPlan?.layoutDirection === 'horizontal' ? seam.y1 : seam.x1;
      const zoneStart = stripPlan?.layoutDirection === 'horizontal' ? zone.y : zone.x;
      const zoneEnd = zoneStart + (stripPlan?.layoutDirection === 'horizontal' ? zone.height : zone.width);
      
      if (seamPosition >= zoneStart && seamPosition <= zoneEnd) {
        return zone.priority === 'hard' ? 'warning' : 'acceptable';
      }
    }
    
    return 'optimal';
  }, [room.doors, avoidZones, stripPlan, scale]);

  // Get seam quality color
  const getSeamColor = (quality: 'optimal' | 'acceptable' | 'warning') => {
    switch (quality) {
      case 'optimal': return 'hsl(142 71% 45%)';
      case 'acceptable': return 'hsl(38 92% 50%)';
      case 'warning': return 'hsl(0 84% 60%)';
    }
  };

  // Handle seam dragging
  const handleSeamMouseDown = (seamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSeamId(seamId);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedSeamId || !svgRef.current || !stripPlan) return;

    const rect = svgRef.current.getBoundingClientRect();
    const isHorizontal = stripPlan.layoutDirection === 'horizontal';
    
    // Get position in mm
    const position = isHorizontal
      ? toMmY(e.clientY - rect.top)
      : toMmX(e.clientX - rect.left);

    // Snap to material width increments
    const snappedPosition = Math.round(position / materialWidth) * materialWidth;

    // Update or add manual seam
    const existingIndex = manualSeams.findIndex(s => s.id === selectedSeamId);
    if (existingIndex >= 0) {
      const updated = [...manualSeams];
      updated[existingIndex] = { ...updated[existingIndex], position: snappedPosition };
      onManualSeamsChange(updated);
    }
  }, [isDragging, selectedSeamId, stripPlan, manualSeams, materialWidth, onManualSeamsChange]);

  const handleMouseUp = () => {
    setIsDragging(false);
    onRecalculate();
  };

  // Lock/unlock a seam
  const toggleSeamLock = (seamId: string) => {
    const seam = stripPlan?.seamLines.find(s => s.id === seamId);
    if (!seam) return;

    const existingIndex = manualSeams.findIndex(s => s.id === seamId);
    const position = stripPlan?.layoutDirection === 'horizontal' ? seam.y1 : seam.x1;

    if (existingIndex >= 0) {
      // Toggle or remove
      const updated = manualSeams.filter(s => s.id !== seamId);
      onManualSeamsChange(updated);
    } else {
      // Add lock
      onManualSeamsChange([...manualSeams, { id: seamId, position, type: 'lock' }]);
    }
  };

  // Reset to auto-calculated seams
  const handleReset = () => {
    onManualSeamsChange([]);
    onFirstSeamOffsetChange(0);
    onRecalculate();
  };

  // Auto-optimize seams (avoid doors and zones, or center if nothing to avoid)
  const handleAutoOptimize = () => {
    if (!stripPlan) return;

    const isHorizontal = stripPlan.layoutDirection === 'horizontal' || stripPlan.layoutDirection === 'diagonal';
    const pixelsPerMm = scale?.pixelsPerMm || 1;

    // Collect all positions to avoid (doors + avoid zones)
    const avoidPositions: { pos: number; radius: number }[] = [];

    // Add door positions
    room.doors.forEach(door => {
      const pos = isHorizontal ? door.position.y : door.position.x;
      avoidPositions.push({
        pos: pos / pixelsPerMm,
        radius: door.width / 2 + 150, // Door half-width + buffer
      });
    });

    // Add avoid zone centers
    avoidZones.forEach(zone => {
      const pos = isHorizontal
        ? zone.y + zone.height / 2
        : zone.x + zone.width / 2;
      const radius = isHorizontal ? zone.height / 2 : zone.width / 2;
      avoidPositions.push({ pos, radius: radius + 100 });
    });

    // If nothing to avoid, center the seams in the room
    if (avoidPositions.length === 0) {
      const roomSize = isHorizontal
        ? stripPlan.roomBoundingBox.height
        : stripPlan.roomBoundingBox.width;
      const numStrips = Math.ceil(roomSize / materialWidth);
      const totalStripWidth = numStrips * materialWidth;
      const bestOffset = (totalStripWidth - roomSize) / 2;
      
      onFirstSeamOffsetChange(Math.max(0, Math.min(bestOffset, materialWidth - 1)));
      onRecalculate();
      return;
    }

    // Try different offsets and find one that minimizes proximity to obstacles
    let bestOffset = 0;
    let bestScore = Infinity;

    const roomSize = isHorizontal
      ? stripPlan.roomBoundingBox.height
      : stripPlan.roomBoundingBox.width;
    const minPos = isHorizontal
      ? stripPlan.roomBoundingBox.minY
      : stripPlan.roomBoundingBox.minX;

    for (let offset = 0; offset < materialWidth; offset += 25) {
      let score = 0;

      // Check each potential seam position against all obstacles
      for (let pos = minPos + offset; pos < minPos + roomSize; pos += materialWidth) {
        for (const avoid of avoidPositions) {
          const distance = Math.abs(pos - avoid.pos);
          if (distance < avoid.radius) {
            // Penalize more heavily the closer to center
            score += (avoid.radius - distance) * 2;
          }
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestOffset = offset;
      }
    }

    onFirstSeamOffsetChange(bestOffset);
    onRecalculate();
  };

  if (!stripPlan) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <p>No strip plan available.</p>
        <p className="text-xs mt-1">Assign a roll material to see seam layout.</p>
      </div>
    );
  }

  const seamQualities = stripPlan.seamLines.map(seam => ({
    seam,
    quality: analyzeSeam(seam),
    isLocked: manualSeams.some(m => m.id === seam.id && m.type === 'lock'),
  }));

  const hasWarnings = seamQualities.some(sq => sq.quality === 'warning');
  const allOptimal = seamQualities.every(sq => sq.quality === 'optimal');

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Seam Editor</h3>
            <p className="text-xs text-muted-foreground">{room.name}</p>
          </div>
          <div className="flex items-center gap-1">
            {hasWarnings && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Issues
              </Badge>
            )}
            {allOptimal && seamQualities.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Optimal
              </Badge>
            )}
          </div>
        </div>

        {/* Fill Direction Control */}
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <FillDirectionControl
            direction={fillDirection}
            onDirectionChange={onFillDirectionChange}
            size="sm"
          />
        </div>

        {/* Interactive Diagram */}
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className={cn(
              "w-full h-auto",
              isDragging && "cursor-grabbing"
            )}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background */}
            <rect x="0" y="0" width={width} height={height} fill="hsl(var(--muted) / 0.3)" />

            {/* Room outline */}
            {bbox && (
              <rect
                x={toSvgX(bbox.minX)}
                y={toSvgY(bbox.minY)}
                width={bbox.width * transform.scaleX}
                height={bbox.height * transform.scaleY}
                fill="hsl(var(--background))"
                stroke="hsl(var(--border))"
                strokeWidth="2"
              />
            )}

            {/* Strips */}
            {stripPlan.strips.map((strip, index) => {
              const isHorizontal = strip.rotation === 0;
              const x = toSvgX(strip.x);
              const y = toSvgY(strip.y);
              const w = isHorizontal ? strip.length * transform.scaleX : strip.width * transform.scaleX;
              const h = isHorizontal ? strip.width * transform.scaleY : strip.length * transform.scaleY;

              return (
                <rect
                  key={strip.id}
                  x={x}
                  y={y}
                  width={Math.max(w, 0)}
                  height={Math.max(h, 0)}
                  fill={index % 2 === 0 ? 'hsl(217 91% 60% / 0.15)' : 'hsl(217 91% 60% / 0.25)'}
                  stroke="hsl(217 91% 50% / 0.5)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Avoid zones (if any) */}
            {avoidZones.map(zone => (
              <rect
                key={zone.id}
                x={toSvgX(zone.x)}
                y={toSvgY(zone.y)}
                width={zone.width * transform.scaleX}
                height={zone.height * transform.scaleY}
                fill="hsl(0 84% 60% / 0.1)"
                stroke="hsl(0 84% 60% / 0.5)"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
            ))}

            {/* Door positions */}
            {room.doors.map((door, index) => {
              const pixelsPerMm = scale?.pixelsPerMm || 1;
              const doorX = door.position.x / pixelsPerMm;
              const doorY = door.position.y / pixelsPerMm;
              
              return (
                <g key={door.id}>
                  <circle
                    cx={toSvgX(doorX)}
                    cy={toSvgY(doorY)}
                    r="6"
                    fill="hsl(38 92% 50% / 0.3)"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth="2"
                  />
                  <text
                    x={toSvgX(doorX)}
                    y={toSvgY(doorY) + 3}
                    textAnchor="middle"
                    className="text-[8px] fill-foreground font-bold"
                  >
                    D
                  </text>
                </g>
              );
            })}

            {/* Seam lines */}
            {seamQualities.map(({ seam, quality, isLocked }) => {
              const isSelected = selectedSeamId === seam.id;
              const color = getSeamColor(quality);

              return (
                <g
                  key={seam.id}
                  className={cn(
                    "cursor-grab",
                    isSelected && "cursor-grabbing"
                  )}
                  onMouseDown={(e) => handleSeamMouseDown(seam.id, e)}
                >
                  {/* Hit area (wider for easier clicking) */}
                  <line
                    x1={toSvgX(seam.x1)}
                    y1={toSvgY(seam.y1)}
                    x2={toSvgX(seam.x2)}
                    y2={toSvgY(seam.y2)}
                    stroke="transparent"
                    strokeWidth="12"
                  />
                  {/* Visible line */}
                  <line
                    x1={toSvgX(seam.x1)}
                    y1={toSvgY(seam.y1)}
                    x2={toSvgX(seam.x2)}
                    y2={toSvgY(seam.y2)}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isLocked ? "none" : "4 2"}
                  />
                  {/* Lock indicator */}
                  {isLocked && (
                    <circle
                      cx={(toSvgX(seam.x1) + toSvgX(seam.x2)) / 2}
                      cy={(toSvgY(seam.y1) + toSvgY(seam.y2)) / 2}
                      r="4"
                      fill={color}
                    />
                  )}
                </g>
              );
            })}

            {/* Direction arrow */}
            <g transform={`translate(${width - 25}, ${height - 25}) rotate(${fillDirection})`}>
              <path
                d="M -10 0 L 10 0 M 5 -5 L 10 0 L 5 5"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>

        {/* First seam offset control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">First Seam Offset</Label>
            <span className="text-xs font-mono text-muted-foreground">
              {firstSeamOffset.toFixed(0)}mm
            </span>
          </div>
          <Slider
            value={[firstSeamOffset]}
            onValueChange={([val]) => {
              onFirstSeamOffsetChange(val);
              onRecalculate();
            }}
            max={materialWidth}
            step={50}
            className="w-full"
          />
        </div>

        {/* Seam list */}
        <div className="space-y-2">
          <Label className="text-xs">Seams ({stripPlan.seamLines.length})</Label>
          <div className="space-y-1">
            {seamQualities.map(({ seam, quality, isLocked }, index) => (
              <div
                key={seam.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded border text-xs",
                  selectedSeamId === seam.id ? "border-primary bg-primary/5" : "border-border",
                  quality === 'warning' && "bg-destructive/5 border-destructive/30"
                )}
                onClick={() => setSelectedSeamId(seam.id)}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
                <span className="font-medium">Seam {index + 1}</span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getSeamColor(quality) }}
                />
                <span className="text-muted-foreground flex-1">
                  {stripPlan.layoutDirection === 'horizontal'
                    ? `y: ${seam.y1.toFixed(0)}mm`
                    : `x: ${seam.x1.toFixed(0)}mm`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSeamLock(seam.id);
                  }}
                >
                  {isLocked ? (
                    <Lock className="w-3 h-3 text-primary" />
                  ) : (
                    <Unlock className="w-3 h-3 text-muted-foreground" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleAutoOptimize}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Auto-Optimize
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>

        {/* Legend */}
        <div className="p-2 rounded bg-muted/50 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500" />
            <span>Optimal placement</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-500" />
            <span>Near door (acceptable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500" />
            <span>In doorway (warning)</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
