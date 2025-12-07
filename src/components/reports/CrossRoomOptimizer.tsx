import React, { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { RollMaterialSpecs } from '@/lib/rollGoods/types';
import {
  optimizeCutPlan,
  getOptimizationSummary,
  OptimizedCutPlan,
  OptimizationOptions,
} from '@/lib/rollGoods/cutOptimizer';
import { cn } from '@/lib/utils';

interface CrossRoomOptimizerProps {
  rooms: Room[];
  material: RollMaterialSpecs;
  scale: ScaleCalibration | null;
  onApplyOptimization?: (plan: OptimizedCutPlan) => void;
}

export const CrossRoomOptimizer: React.FC<CrossRoomOptimizerProps> = ({
  rooms,
  material,
  scale,
  onApplyOptimization,
}) => {
  const [showSettings, setShowSettings] = useState(false);
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
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <div className="font-medium">Roll {index + 1}</div>
                      <div>Used: {(bin.usedLengthMm / 1000).toFixed(2)}m</div>
                      <div>Remaining: {(bin.remainingMm / 1000).toFixed(2)}m</div>
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
        {onApplyOptimization && hasSavings && (
          <Button
            className="w-full"
            onClick={() => onApplyOptimization(optimizedPlan)}
          >
            <Scissors className="h-4 w-4 mr-2" />
            Apply Optimized Cut Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
