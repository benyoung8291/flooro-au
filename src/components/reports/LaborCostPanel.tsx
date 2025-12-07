import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HardHat,
  DollarSign,
  Settings2,
  ChevronDown,
  ChevronUp,
  Calculator,
  Percent,
  TrendingUp,
  Hammer,
  Trash2,
  Package,
  Info,
} from 'lucide-react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import {
  ProjectLaborConfig,
  ProjectCostBreakdown,
  DEFAULT_LABOR_RATES,
  calculateProjectCosts,
  formatCurrency,
} from '@/lib/labor';
import { cn } from '@/lib/utils';

interface LaborCostPanelProps {
  rooms: Room[];
  materials: Material[];
  materialCosts: Map<string, number>;
  accessoryCosts?: Map<string, number>;
  scale: ScaleCalibration | null;
  onConfigChange?: (config: ProjectLaborConfig) => void;
  className?: string;
}

export const LaborCostPanel: React.FC<LaborCostPanelProps> = ({
  rooms,
  materials,
  materialCosts,
  accessoryCosts = new Map(),
  scale,
  onConfigChange,
  className,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showRoomBreakdown, setShowRoomBreakdown] = useState(false);
  const [config, setConfig] = useState<ProjectLaborConfig>(DEFAULT_LABOR_RATES);
  const [taxRate, setTaxRate] = useState(0);

  const updateConfig = (updates: Partial<ProjectLaborConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const costBreakdown = useMemo(() => {
    return calculateProjectCosts(
      rooms,
      materials,
      materialCosts,
      accessoryCosts,
      scale,
      config,
      taxRate
    );
  }, [rooms, materials, materialCosts, accessoryCosts, scale, config, taxRate]);

  if (rooms.length === 0) {
    return null;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            Labor & Total Cost
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
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleContent>
            <div className="p-3 rounded-lg bg-muted/50 space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Installation Rates */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Hammer className="h-3 w-3" />
                    Installation Rates ($/m²)
                  </Label>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16">Roll:</span>
                      <Input
                        type="number"
                        value={config.rollInstallRate}
                        onChange={(e) => updateConfig({ rollInstallRate: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16">Tile:</span>
                      <Input
                        type="number"
                        value={config.tileInstallRate}
                        onChange={(e) => updateConfig({ tileInstallRate: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16">Plank:</span>
                      <Input
                        type="number"
                        value={config.plankInstallRate}
                        onChange={(e) => updateConfig({ plankInstallRate: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Prep Rates */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Preparation ($/m²)
                  </Label>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16">Prep:</span>
                      <Input
                        type="number"
                        value={config.floorPrepRate}
                        onChange={(e) => updateConfig({ floorPrepRate: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16">Removal:</span>
                      <Input
                        type="number"
                        value={config.removalRate}
                        onChange={(e) => updateConfig({ removalRate: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Toggles */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="includePrep"
                    checked={config.includeFloorPrep}
                    onCheckedChange={(checked) => updateConfig({ includeFloorPrep: checked })}
                  />
                  <Label htmlFor="includePrep" className="text-xs">Floor Prep</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="includeRemoval"
                    checked={config.includeRemoval}
                    onCheckedChange={(checked) => updateConfig({ includeRemoval: checked })}
                  />
                  <Label htmlFor="includeRemoval" className="text-xs">Removal</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="includeFurniture"
                    checked={config.includeFurnitureMove}
                    onCheckedChange={(checked) => updateConfig({ includeFurnitureMove: checked })}
                  />
                  <Label htmlFor="includeFurniture" className="text-xs">Furniture</Label>
                </div>
              </div>

              <Separator />

              {/* Business Settings */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Overhead %</Label>
                  <Input
                    type="number"
                    value={config.overheadPercent}
                    onChange={(e) => updateConfig({ overheadPercent: parseFloat(e.target.value) || 0 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Margin %</Label>
                  <Input
                    type="number"
                    value={config.marginPercent}
                    onChange={(e) => updateConfig({ marginPercent: parseFloat(e.target.value) || 0 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax %</Label>
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Cost Summary */}
        <div className="space-y-3">
          {/* Materials */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Materials
              </span>
              <span className="font-medium">{formatCurrency(costBreakdown.materials.subtotal)}</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Flooring</span>
                <span>{formatCurrency(costBreakdown.materials.flooring)}</span>
              </div>
              {costBreakdown.materials.accessories > 0 && (
                <div className="flex justify-between">
                  <span>Accessories</span>
                  <span>{formatCurrency(costBreakdown.materials.accessories)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Labor */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Hammer className="h-4 w-4 text-muted-foreground" />
                Labor
              </span>
              <span className="font-medium">{formatCurrency(costBreakdown.labor.subtotal)}</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Installation</span>
                <span>{formatCurrency(costBreakdown.labor.installation)}</span>
              </div>
              {costBreakdown.labor.preparation > 0 && (
                <div className="flex justify-between">
                  <span>Floor Prep</span>
                  <span>{formatCurrency(costBreakdown.labor.preparation)}</span>
                </div>
              )}
              {costBreakdown.labor.removal > 0 && (
                <div className="flex justify-between">
                  <span>Removal</span>
                  <span>{formatCurrency(costBreakdown.labor.removal)}</span>
                </div>
              )}
              {costBreakdown.labor.accessories > 0 && (
                <div className="flex justify-between">
                  <span>Accessories</span>
                  <span>{formatCurrency(costBreakdown.labor.accessories)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Subtotals */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(costBreakdown.subtotal)}</span>
            </div>
            {costBreakdown.overheadAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Overhead ({costBreakdown.overheadPercent}%)
                </span>
                <span>{formatCurrency(costBreakdown.overheadAmount)}</span>
              </div>
            )}
            {costBreakdown.marginAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Margin ({costBreakdown.marginPercent}%)
                </span>
                <span>{formatCurrency(costBreakdown.marginAmount)}</span>
              </div>
            )}
            {costBreakdown.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({costBreakdown.taxRate}%)
                </span>
                <span>{formatCurrency(costBreakdown.taxAmount)}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total
              </span>
              <span className="text-xl font-bold">{formatCurrency(costBreakdown.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{costBreakdown.totalAreaM2.toFixed(1)} m²</span>
              <span>{formatCurrency(costBreakdown.costPerM2)}/m²</span>
            </div>
          </div>
        </div>

        {/* Room Breakdown Toggle */}
        <Collapsible open={showRoomBreakdown} onOpenChange={setShowRoomBreakdown}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <Calculator className="h-4 w-4 mr-2" />
              Room Breakdown
              {showRoomBreakdown ? (
                <ChevronUp className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-auto" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[200px] mt-2">
              <div className="space-y-2 pr-3">
                {costBreakdown.roomBreakdowns.map((room) => (
                  <div
                    key={room.roomId}
                    className="p-2 rounded-lg border bg-card text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{room.roomName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {room.areaM2.toFixed(1)} m²
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Install:</span>
                        <span>{formatCurrency(room.adjustedInstallationCost)}</span>
                      </div>
                      {room.prepCost > 0 && (
                        <div className="flex justify-between">
                          <span>Prep:</span>
                          <span>{formatCurrency(room.prepCost)}</span>
                        </div>
                      )}
                      {room.covingLaborCost > 0 && (
                        <div className="flex justify-between">
                          <span>Coving:</span>
                          <span>{formatCurrency(room.covingLaborCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium text-foreground">
                        <span>Total:</span>
                        <span>{formatCurrency(room.totalLaborCost)}</span>
                      </div>
                    </div>
                    {room.complexityFactor !== 1 && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                        <Info className="h-2.5 w-2.5" />
                        Complexity factor: {room.complexityFactor}x
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
