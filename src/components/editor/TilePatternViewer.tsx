import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Grid3X3,
  LayoutGrid,
  Scissors,
  Box,
  RotateCw,
  Maximize2,
  Info,
} from 'lucide-react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import {
  TilePattern,
  TileSpecs,
  TileLayoutResult,
  calculateTileLayout,
  getAvailablePatterns,
  getPatternDisplayName,
} from '@/lib/tiles';
import { cn } from '@/lib/utils';

interface TilePatternViewerProps {
  room: Room;
  tileSpecs: TileSpecs;
  scale: ScaleCalibration | null;
  onPatternChange?: (pattern: TilePattern) => void;
  className?: string;
}

const PatternIcon: React.FC<{ pattern: TilePattern; className?: string }> = ({ pattern, className }) => {
  switch (pattern) {
    case 'herringbone':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 12 L6 8 L10 12 L14 8 L18 12 L22 8" />
          <path d="M2 16 L6 12 L10 16 L14 12 L18 16 L22 12" />
          <path d="M6 8 L6 16" />
          <path d="M14 8 L14 16" />
        </svg>
      );
    case 'diagonal':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4 L12 12 L4 20" />
          <path d="M12 4 L20 12 L12 20" />
          <path d="M4 12 L12 4" />
          <path d="M12 20 L20 12" />
        </svg>
      );
    case 'brick':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="9" height="4" />
          <rect x="13" y="4" width="9" height="4" />
          <rect x="6" y="10" width="9" height="4" />
          <rect x="2" y="16" width="9" height="4" />
          <rect x="13" y="16" width="9" height="4" />
        </svg>
      );
    default:
      return <Grid3X3 className={className} />;
  }
};

export const TilePatternViewer: React.FC<TilePatternViewerProps> = ({
  room,
  tileSpecs,
  scale,
  onPatternChange,
  className,
}) => {
  const [selectedPattern, setSelectedPattern] = useState<TilePattern>('grid');
  const [showGrout, setShowGrout] = useState(true);
  const [showCuts, setShowCuts] = useState(true);
  const [centerTiles, setCenterTiles] = useState(false);

  const layout = useMemo(() => {
    return calculateTileLayout(room, tileSpecs, scale, {
      pattern: selectedPattern,
      centerTiles,
    });
  }, [room, tileSpecs, scale, selectedPattern, centerTiles]);

  const handlePatternChange = (pattern: TilePattern) => {
    setSelectedPattern(pattern);
    onPatternChange?.(pattern);
  };

  // Calculate SVG viewport
  const viewBox = useMemo(() => {
    if (layout.tilePositions.length === 0) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    layout.tilePositions.forEach(tile => {
      minX = Math.min(minX, tile.x);
      minY = Math.min(minY, tile.y);
      maxX = Math.max(maxX, tile.x + tile.width);
      maxY = Math.max(maxY, tile.y + tile.height);
    });
    
    const padding = Math.max((maxX - minX), (maxY - minY)) * 0.05;
    
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
    };
  }, [layout.tilePositions]);

  const patterns = getAvailablePatterns();

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Tile Pattern
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {room.name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pattern Selector */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Layout Pattern</Label>
          <div className="grid grid-cols-5 gap-1">
            {patterns.map(({ value, label }) => (
              <TooltipProvider key={value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedPattern === value ? 'default' : 'outline'}
                      size="sm"
                      className="h-10 p-0"
                      onClick={() => handlePatternChange(value)}
                    >
                      <PatternIcon pattern={value} className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="showGrout"
              checked={showGrout}
              onCheckedChange={setShowGrout}
            />
            <Label htmlFor="showGrout" className="text-xs">Grout Lines</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="showCuts"
              checked={showCuts}
              onCheckedChange={setShowCuts}
            />
            <Label htmlFor="showCuts" className="text-xs">Show Cuts</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="centerTiles"
              checked={centerTiles}
              onCheckedChange={setCenterTiles}
            />
            <Label htmlFor="centerTiles" className="text-xs">Center</Label>
          </div>
        </div>

        {/* Pattern Visualization */}
        <div className="rounded-lg border bg-muted/30 overflow-hidden">
          <svg
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            className="w-full h-48"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Tiles */}
            {layout.tilePositions.map((tile) => (
              <g key={tile.id}>
                <rect
                  x={tile.x}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  fill={tile.isCut ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--primary) / 0.5)'}
                  stroke={showGrout ? 'hsl(var(--muted-foreground) / 0.3)' : 'none'}
                  strokeWidth={showGrout ? tileSpecs.groutWidthMm || 3 : 0}
                  transform={tile.rotation ? `rotate(${tile.rotation} ${tile.x + tile.width/2} ${tile.y + tile.height/2})` : undefined}
                />
                {/* Cut indicator */}
                {showCuts && tile.isCut && (
                  <line
                    x1={tile.x}
                    y1={tile.y}
                    x2={tile.x + tile.width}
                    y2={tile.y + tile.height}
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="4,2"
                  />
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-lg font-bold">{layout.fullTiles}</div>
            <div className="text-[10px] text-muted-foreground">Full Tiles</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-lg font-bold text-primary">{layout.cutTiles}</div>
            <div className="text-[10px] text-muted-foreground">Cut Tiles</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-lg font-bold">{layout.totalTiles}</div>
            <div className="text-[10px] text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="rounded-lg border overflow-hidden text-sm">
          <div className="grid grid-cols-2 divide-x">
            <div className="p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room Area</span>
                <span className="font-medium">{layout.roomAreaM2.toFixed(2)} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tile Area</span>
                <span className="font-medium">{layout.tileAreaM2.toFixed(2)} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waste</span>
                <span className="font-medium text-destructive">
                  {layout.wasteFromCutsM2.toFixed(2)} m²
                </span>
              </div>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-medium">{layout.utilizationPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grout</span>
                <span className="font-medium">{layout.groutLinearM.toFixed(1)} m</span>
              </div>
              {layout.boxesNeeded && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boxes</span>
                  <span className="font-medium">{layout.boxesNeeded}</span>
                </div>
              )}
            </div>
          </div>
          {layout.materialCost > 0 && (
            <div className="border-t p-2 bg-muted/30 flex justify-between">
              <span className="font-medium">Material Cost</span>
              <span className="font-bold">${layout.materialCost.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Pattern Info */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <p>
            {selectedPattern === 'herringbone' && 'Herringbone creates a zigzag pattern, ideal for adding visual interest. Requires more cuts at edges.'}
            {selectedPattern === 'diagonal' && 'Diagonal layout rotates tiles 45°, making rooms appear larger. Increases edge cuts significantly.'}
            {selectedPattern === 'brick' && 'Brick pattern offsets each row by 50%, similar to traditional brickwork. Good balance of aesthetics and efficiency.'}
            {selectedPattern === 'thirds' && 'Thirds pattern offsets each row by 33%, creating a more subtle staggered effect than brick.'}
            {selectedPattern === 'grid' && 'Standard grid alignment is the most efficient with minimal cuts required at edges.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
