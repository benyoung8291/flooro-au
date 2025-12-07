import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Scissors,
  TrendingDown,
  Package,
  ArrowRight,
  Recycle,
  Settings2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  DollarSign,
  Ruler,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { RollMaterialSpecs } from '@/lib/rollGoods/types';
import {
  optimizeCutPlan,
  getOptimizationSummary,
  OptimizedCutPlan,
  OptimizationOptions,
  DropPiece,
} from '@/lib/rollGoods/cutOptimizer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CrossRoomOptimizerProps {
  rooms: Room[];
  material: RollMaterialSpecs;
  materialName?: string;
  scale: ScaleCalibration | null;
  onApplyOptimization?: (plan: OptimizedCutPlan) => void;
  onAllocateDrop?: (drop: DropPiece, targetRoomId: string) => void;
  showDetailedDrops?: boolean;
}

export const CrossRoomOptimizer: React.FC<CrossRoomOptimizerProps> = ({
  rooms,
  material,
  materialName,
  scale,
  onApplyOptimization,
  onAllocateDrop,
  showDetailedDrops = false,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showDropDetails, setShowDropDetails] = useState(showDetailedDrops);
  const [options, setOptions] = useState<OptimizationOptions>({
    minDropLength: 500,
    allowPatternMismatch: false,
  });

  const optimizedPlan = useMemo(() => {
    if (rooms.length < 2) return null;
    return optimizeCutPlan(rooms, material, scale, options);
  }, [rooms, material, scale, options]);

  const summary = useMemo(() => {
    if (!optimizedPlan) return null;
    return getOptimizationSummary(optimizedPlan);
  }, [optimizedPlan]);

  // Categorize drops by usability
  const categorizedDrops = useMemo(() => {
    if (!optimizedPlan) return { usable: [], short: [], allocated: [] };
    
    const usable: DropPiece[] = [];
    const short: DropPiece[] = [];
    const allocated: DropPiece[] = [];
    
    optimizedPlan.drops.forEach(drop => {
      if (drop.isUsed) {
        allocated.push(drop);
      } else if (drop.length >= (options.minDropLength || 500)) {
        usable.push(drop);
      } else {
        short.push(drop);
      }
    });
    
    return { usable, short, allocated };
  }, [optimizedPlan, options.minDropLength]);

  // Handle auto-allocate all usable drops
  const handleAutoAllocate = useCallback(() => {
    if (!optimizedPlan || !onApplyOptimization) return;
    
    onApplyOptimization(optimizedPlan);
    toast.success('Optimization applied', {
      description: `${optimizedPlan.reusedPieces.length} drops allocated across rooms`,
    });
  }, [optimizedPlan, onApplyOptimization]);

  // Get drop color based on length
  const getDropColor = (length: number) => {
    if (length >= 1000) return 'bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-400';
    if (length >= 500) return 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-400';
    return 'bg-muted border-border text-muted-foreground';
  };

  if (rooms.length < 2) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">
            Add 2+ rooms with the same material to enable cross-room optimization
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!optimizedPlan || !summary) {
    return null;
  }

  const hasSavings = optimizedPlan.costSaved > 0 || optimizedPlan.wasteSavedM2 > 0;

  return (
    <Card className={cn(
      "transition-all duration-200",
      hasSavings && "border-green-500/30 bg-green-500/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Recycle className="h-4 w-4" />
            Cross-Room Optimization
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            {showSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Settings Panel */}
        {showSettings && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Minimum Drop Length: {options.minDropLength}mm
              </Label>
              <Slider
                value={[options.minDropLength || 500]}
                min={200}
                max={2000}
                step={100}
                onValueChange={([val]) => setOptions(o => ({ ...o, minDropLength: val }))}
              />
              <p className="text-xs text-muted-foreground">
                Drops shorter than this are discarded as waste
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Allow Pattern Mismatch</Label>
                <p className="text-xs text-muted-foreground">
                  For closets or hidden areas
                </p>
              </div>
              <Switch
                checked={options.allowPatternMismatch}
                onCheckedChange={(checked) => 
                  setOptions(o => ({ ...o, allowPatternMismatch: checked }))
                }
              />
            </div>

            <Separator />
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{optimizedPlan.totalRollsNeeded}</div>
            <div className="text-xs text-muted-foreground">Rolls Needed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">
              {optimizedPlan.rollUtilization.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Utilization</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">
              {optimizedPlan.drops.filter(d => !d.isUsed).length}
            </div>
            <div className="text-xs text-muted-foreground">Usable Drops</div>
          </div>
        </div>

        {/* Savings Badge */}
        {hasSavings && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm text-green-700 dark:text-green-400">
                {summary.headline}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {optimizedPlan.rollsSaved > 0 && (
                <div className="flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-green-600" />
                  <span className="text-muted-foreground">
                    {optimizedPlan.rollsSaved} roll{optimizedPlan.rollsSaved !== 1 ? 's' : ''} saved
                  </span>
                </div>
              )}
              {optimizedPlan.wasteSavedM2 > 0.1 && (
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-muted-foreground">
                    {optimizedPlan.wasteSavedM2.toFixed(1)} m² less waste
                  </span>
                </div>
              )}
              {optimizedPlan.costSaved > 1 && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="text-muted-foreground">
                    ${optimizedPlan.costSaved.toFixed(0)} saved
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drop Reuse Visualization */}
        {optimizedPlan.reusedPieces.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Drop Reuse</Label>
            <ScrollArea className="h-[120px]">
              <div className="space-y-2 pr-3">
                {optimizedPlan.reusedPieces.map((piece) => (
                  <div
                    key={piece.pieceId}
                    className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm"
                  >
                    <Badge variant="outline" className="text-xs shrink-0">
                      {(piece.lengthUsed / 1000).toFixed(2)}m
                    </Badge>
                    <span className="truncate text-muted-foreground">
                      {piece.fromRoomName}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{piece.toRoomName}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Detailed Drop Inventory */}
        <Collapsible open={showDropDetails} onOpenChange={setShowDropDetails}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-3 h-auto bg-muted/30 border hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Drop Inventory</span>
                <Badge variant="outline" className="text-xs">
                  {categorizedDrops.usable.length} usable
                </Badge>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropDetails ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="bg-muted/30 rounded-lg p-4 border space-y-4">
              {/* Usable Drops */}
              {categorizedDrops.usable.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <Label className="text-xs font-medium text-green-700 dark:text-green-400">
                      Usable Drops ({categorizedDrops.usable.length})
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categorizedDrops.usable.map((drop) => (
                      <div
                        key={drop.id}
                        className={cn(
                          "p-2 rounded border text-center",
                          getDropColor(drop.length)
                        )}
                      >
                        <p className="text-xs text-muted-foreground truncate">
                          From: {drop.sourceRoomName}
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {(drop.length / 1000).toFixed(2)}m
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(drop.width / 1000).toFixed(2)}m wide
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allocated Drops */}
              {categorizedDrops.allocated.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Recycle className="w-3 h-3 text-blue-500" />
                    <Label className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      Allocated ({categorizedDrops.allocated.length})
                    </Label>
                  </div>
                  <div className="space-y-1">
                    {categorizedDrops.allocated.map((drop) => {
                      const reuse = optimizedPlan.reusedPieces.find(r => r.pieceId === drop.id);
                      return (
                        <div
                          key={drop.id}
                          className="flex items-center gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-xs"
                        >
                          <Badge variant="outline" className="shrink-0 bg-blue-500/20">
                            {(drop.length / 1000).toFixed(2)}m
                          </Badge>
                          <span className="truncate text-muted-foreground">
                            {drop.sourceRoomName}
                          </span>
                          <ArrowRight className="w-3 h-3 shrink-0 text-blue-500" />
                          <span className="truncate font-medium">
                            {reuse?.toRoomName || 'Allocated'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Short Drops (waste) */}
              {categorizedDrops.short.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-muted-foreground" />
                    <Label className="text-xs font-medium text-muted-foreground">
                      Too Short ({categorizedDrops.short.length})
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {categorizedDrops.short.slice(0, 6).map((drop) => (
                      <Badge 
                        key={drop.id} 
                        variant="outline" 
                        className="text-[10px] bg-muted"
                      >
                        {(drop.length / 1000).toFixed(2)}m
                      </Badge>
                    ))}
                    {categorizedDrops.short.length > 6 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{categorizedDrops.short.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Info note */}
              <div className="flex items-start gap-2 pt-2 border-t">
                <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground">
                  Drops ≥{(options.minDropLength || 500) / 1000}m are considered usable. 
                  Adjust minimum length in settings above.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Roll Bins Visualization */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Roll Layout</Label>
          <div className="space-y-2">
            {optimizedPlan.rollBins.slice(0, 5).map((bin, index) => (
              <TooltipProvider key={bin.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative h-6 rounded overflow-hidden bg-muted">
                      {/* Used portion */}
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/60 flex items-center"
                        style={{
                          width: `${(bin.usedLengthMm / bin.rollLengthMm) * 100}%`,
                        }}
                      >
                        <span className="text-[10px] text-primary-foreground px-1 truncate">
                          Roll {index + 1}
                        </span>
                      </div>
                      {/* Cut markers */}
                      {bin.cuts.map((cut, i) => {
                        if (i === 0) return null;
                        const pos = (cut.startPosition / bin.rollLengthMm) * 100;
                        return (
                          <div
                            key={cut.id}
                            className="absolute top-0 bottom-0 w-px bg-background"
                            style={{ left: `${pos}%` }}
                          />
                        );
                      })}
                      {/* Drop indicator */}
                      {bin.remainingMm >= (options.minDropLength || 500) && (
                        <div
                          className="absolute inset-y-0 right-0 bg-green-500/30 flex items-center justify-end"
                          style={{
                            width: `${(bin.remainingMm / bin.rollLengthMm) * 100}%`,
                          }}
                        >
                          <span className="text-[9px] text-green-700 dark:text-green-400 px-1">
                            Drop
                          </span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <div className="font-medium">Roll {index + 1}</div>
                      <div>Used: {(bin.usedLengthMm / 1000).toFixed(2)}m</div>
                      <div className={bin.remainingMm >= (options.minDropLength || 500) ? 'text-green-500' : ''}>
                        Remaining: {(bin.remainingMm / 1000).toFixed(2)}m
                        {bin.remainingMm >= (options.minDropLength || 500) && ' (usable drop)'}
                      </div>
                      <div className="pt-1 border-t mt-1">
                        {bin.cuts.map(cut => (
                          <div key={cut.id}>
                            {cut.roomName}: {(cut.lengthMm / 1000).toFixed(2)}m
                          </div>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {optimizedPlan.rollBins.length > 5 && (
              <div className="text-xs text-muted-foreground text-center">
                +{optimizedPlan.rollBins.length - 5} more rolls
              </div>
            )}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Metric</th>
                <th className="px-3 py-2 text-right font-medium">Before</th>
                <th className="px-3 py-2 text-right font-medium">After</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Rolls</td>
                <td className="px-3 py-2 text-right">{optimizedPlan.originalRollsNeeded}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {optimizedPlan.totalRollsNeeded}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Waste</td>
                <td className="px-3 py-2 text-right">
                  {optimizedPlan.originalWasteM2.toFixed(2)} m²
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {optimizedPlan.totalWasteM2.toFixed(2)} m²
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground">Cost</td>
                <td className="px-3 py-2 text-right">
                  ${optimizedPlan.originalTotalCost.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  ${optimizedPlan.totalCost.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Apply Button */}
        {hasSavings && (
          <div className="space-y-2">
            {onApplyOptimization && (
              <Button
                className="w-full"
                onClick={handleAutoAllocate}
              >
                <Scissors className="h-4 w-4 mr-2" />
                Apply Optimized Cut Plan
              </Button>
            )}
            {categorizedDrops.usable.length > 0 && !onApplyOptimization && (
              <p className="text-xs text-center text-muted-foreground">
                {categorizedDrops.usable.length} drop{categorizedDrops.usable.length !== 1 ? 's' : ''} available for reuse
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Export types for use in other components
export type { DropPiece } from '@/lib/rollGoods/cutOptimizer';
