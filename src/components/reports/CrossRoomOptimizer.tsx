import React, { useMemo, useState, useCallback, DragEvent } from 'react';
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
  GripVertical,
  Target,
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
  const [showManualAllocation, setShowManualAllocation] = useState(false);
  const [draggedDrop, setDraggedDrop] = useState<DropPiece | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const [manualAllocations, setManualAllocations] = useState<Map<string, { drop: DropPiece; targetRoomId: string; targetRoomName: string }>>(new Map());
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

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, drop: DropPiece) => {
    setDraggedDrop(drop);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', drop.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedDrop(null);
    setDragOverRoomId(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoomId(roomId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverRoomId(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, targetRoom: Room) => {
    e.preventDefault();
    setDragOverRoomId(null);

    if (!draggedDrop) return;
    
    // Don't allow dropping on source room
    if (draggedDrop.sourceRoomId === targetRoom.id) {
      toast.error('Cannot allocate drop to its source room');
      return;
    }

    // Add to manual allocations
    setManualAllocations(prev => {
      const newMap = new Map(prev);
      newMap.set(draggedDrop.id, {
        drop: draggedDrop,
        targetRoomId: targetRoom.id,
        targetRoomName: targetRoom.name,
      });
      return newMap;
    });

    // Notify parent if callback provided
    if (onAllocateDrop) {
      onAllocateDrop(draggedDrop, targetRoom.id);
    }

    toast.success('Drop allocated', {
      description: `${(draggedDrop.length / 1000).toFixed(2)}m drop → ${targetRoom.name}`,
    });

    setDraggedDrop(null);
  }, [draggedDrop, onAllocateDrop]);

  const handleRemoveAllocation = useCallback((dropId: string) => {
    setManualAllocations(prev => {
      const newMap = new Map(prev);
      newMap.delete(dropId);
      return newMap;
    });
    toast.info('Allocation removed');
  }, []);

  // Get unallocated usable drops (excluding manual allocations)
  const unallocatedDrops = useMemo(() => {
    return categorizedDrops.usable.filter(drop => !manualAllocations.has(drop.id));
  }, [categorizedDrops.usable, manualAllocations]);

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

        {/* Manual Drop Allocation */}
        {categorizedDrops.usable.length > 0 && (
          <Collapsible open={showManualAllocation} onOpenChange={setShowManualAllocation}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto bg-primary/5 border border-primary/20 hover:bg-primary/10"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Manual Drop Allocation</span>
                  <Badge variant="secondary" className="text-xs">
                    Drag & Drop
                  </Badge>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showManualAllocation ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="bg-muted/30 rounded-lg p-4 border space-y-4">
                {/* Instructions */}
                <div className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Drag drops from the left panel and drop them onto target rooms on the right to manually allocate material.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Draggable Drops */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Package className="w-3 h-3" />
                      Available Drops ({unallocatedDrops.length})
                    </Label>
                    <ScrollArea className="h-[180px]">
                      <div className="space-y-2 pr-2">
                        {unallocatedDrops.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            All drops have been allocated
                          </p>
                        ) : (
                          unallocatedDrops.map((drop) => (
                            <div
                              key={drop.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, drop)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                "p-2 rounded border cursor-grab active:cursor-grabbing transition-all",
                                getDropColor(drop.length),
                                draggedDrop?.id === drop.id && "opacity-50 ring-2 ring-primary"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground truncate">
                                    From: {drop.sourceRoomName}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-sm">
                                      {(drop.length / 1000).toFixed(2)}m
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      × {(drop.width / 1000).toFixed(2)}m
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Droppable Room Targets */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Target className="w-3 h-3" />
                      Target Rooms ({rooms.length})
                    </Label>
                    <ScrollArea className="h-[180px]">
                      <div className="space-y-2 pr-2">
                        {rooms.map((room) => {
                          const isDropTarget = dragOverRoomId === room.id;
                          const roomAllocations = Array.from(manualAllocations.values()).filter(
                            a => a.targetRoomId === room.id
                          );
                          
                          return (
                            <div
                              key={room.id}
                              onDragOver={(e) => handleDragOver(e, room.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, room)}
                              className={cn(
                                "p-2 rounded border transition-all",
                                isDropTarget 
                                  ? "bg-primary/20 border-primary border-dashed ring-2 ring-primary/50" 
                                  : "bg-muted/50 border-border hover:bg-muted",
                                draggedDrop && draggedDrop.sourceRoomId === room.id && "opacity-40"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">{room.name}</span>
                                {isDropTarget && (
                                  <Badge variant="secondary" className="text-[10px] shrink-0">
                                    Drop here
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Show allocations for this room */}
                              {roomAllocations.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {roomAllocations.map(allocation => (
                                    <div 
                                      key={allocation.drop.id}
                                      className="flex items-center justify-between gap-1 p-1.5 rounded bg-green-500/10 border border-green-500/20"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Recycle className="w-3 h-3 text-green-500 shrink-0" />
                                        <span className="text-[10px] font-mono truncate">
                                          {(allocation.drop.length / 1000).toFixed(2)}m from {allocation.drop.sourceRoomName}
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 shrink-0"
                                        onClick={() => handleRemoveAllocation(allocation.drop.id)}
                                      >
                                        <XCircle className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Manual Allocation Summary */}
                {manualAllocations.size > 0 && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          {manualAllocations.size} drop{manualAllocations.size !== 1 ? 's' : ''} manually allocated
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManualAllocations(new Map())}
                        className="text-xs h-7"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
                    {categorizedDrops.usable.map((drop) => {
                      const isAllocated = manualAllocations.has(drop.id);
                      const allocation = manualAllocations.get(drop.id);
                      
                      return (
                        <div
                          key={drop.id}
                          className={cn(
                            "p-2 rounded border text-center relative",
                            isAllocated 
                              ? "bg-green-500/10 border-green-500/30" 
                              : getDropColor(drop.length)
                          )}
                        >
                          {isAllocated && (
                            <Badge 
                              variant="secondary" 
                              className="absolute -top-2 -right-2 text-[9px] bg-green-500 text-white"
                            >
                              → {allocation?.targetRoomName}
                            </Badge>
                          )}
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
                      );
                    })}
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
