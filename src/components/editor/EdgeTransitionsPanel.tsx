import { useState, useMemo } from 'react';
import { Room, ScaleCalibration, EdgeTransition } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { SharedEdge, getSharedEdgeForEdge } from '@/lib/canvas/sharedEdgeDetector';
import { useSharedEdges } from '@/hooks/useSharedEdges';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeftRight,
  ChevronDown,
  AlertTriangle,
  Link2,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  calculateRoomStackHeight,
  calculateHeightDifference,
  recommendTransitionType,
  getTransitionLabel,
  formatHeight,
  RoomStackHeight,
} from '@/lib/transitions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EdgeTransitionsPanelProps {
  room: Room;
  allRooms: Room[];
  scale: ScaleCalibration | null;
  materials: Material[];
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => void;
}

export function EdgeTransitionsPanel({
  room,
  allRooms,
  scale,
  materials,
  onUpdateRoom,
}: EdgeTransitionsPanelProps) {
  const [expandedEdge, setExpandedEdge] = useState<number | null>(null);

  // Shared edge detection
  const { sharedEdges, autoLinkSharedEdges, getSharedEdge } = useSharedEdges(allRooms);

  // Calculate this room's stack height
  const roomMaterial = materials.find((m) => m.id === room.materialId);
  const roomHeight = useMemo(
    () => calculateRoomStackHeight(room, roomMaterial, materials),
    [room, roomMaterial, materials]
  );

  // Calculate edge lengths
  const edgeLengths = useMemo(() => {
    if (!scale) return room.points.map(() => 0);
    return room.points.map((p1, i) => {
      const p2 = room.points[(i + 1) % room.points.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthPx = Math.sqrt(dx * dx + dy * dy);
      return lengthPx / scale.pixelsPerMm / 1000; // meters
    });
  }, [room.points, scale]);

  // Count unlinked shared edges
  const unlinkedSharedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < room.points.length; i++) {
      const sharedEdge = getSharedEdge(room.id, i);
      const transition = room.edgeTransitions?.find(t => t.edgeIndex === i);
      if (sharedEdge && !transition) {
        count++;
      }
    }
    return count;
  }, [room, getSharedEdge]);

  // Handle auto-link all shared edges
  const handleAutoLinkAll = () => {
    const linkedCount = autoLinkSharedEdges(room, allRooms, onUpdateRoom);
    if (linkedCount > 0) {
      toast.success(`Linked ${linkedCount} adjacent room${linkedCount !== 1 ? 's' : ''}`);
    } else {
      toast.info('No new rooms to link');
    }
  };

  // Get transition for an edge
  const getEdgeTransition = (edgeIndex: number): EdgeTransition | undefined => {
    return room.edgeTransitions?.find((t) => t.edgeIndex === edgeIndex);
  };

  // Auto-link a single shared edge
  const autoLinkEdge = (edgeIndex: number) => {
    const sharedEdge = getSharedEdge(room.id, edgeIndex);
    if (!sharedEdge) return;

    const otherRoom = allRooms.find(r => r.id === sharedEdge.otherRoomId);
    const existing = room.edgeTransitions || [];
    
    const newTransition: EdgeTransition = {
      edgeIndex,
      adjacentRoomId: sharedEdge.otherRoomId,
      adjacentRoomName: otherRoom?.name,
      transitionType: 'auto',
    };

    onUpdateRoom(room.id, {
      edgeTransitions: [...existing, newTransition],
    });
    
    toast.success(`Linked to ${otherRoom?.name || 'adjacent room'}`);
  };

  // Toggle edge between wall and transition
  const toggleEdgeType = (edgeIndex: number) => {
    const existing = room.edgeTransitions || [];
    const hasTransition = existing.some((t) => t.edgeIndex === edgeIndex);

    if (hasTransition) {
      // Remove transition
      onUpdateRoom(room.id, {
        edgeTransitions: existing.filter((t) => t.edgeIndex !== edgeIndex),
      });
    } else {
      // Add transition
      const newTransition: EdgeTransition = {
        edgeIndex,
        transitionType: 'auto',
      };
      onUpdateRoom(room.id, {
        edgeTransitions: [...existing, newTransition],
      });
    }
  };

  // Update a specific transition
  const updateTransition = (
    edgeIndex: number,
    updates: Partial<EdgeTransition>
  ) => {
    const existing = room.edgeTransitions || [];
    const updated = existing.map((t) =>
      t.edgeIndex === edgeIndex ? { ...t, ...updates } : t
    );
    onUpdateRoom(room.id, { edgeTransitions: updated });
  };

  // Get adjacent room height if linked
  const getAdjacentRoomHeight = (
    transition: EdgeTransition
  ): RoomStackHeight | null => {
    if (!transition.adjacentRoomId) return null;
    const adjacentRoom = allRooms.find((r) => r.id === transition.adjacentRoomId);
    if (!adjacentRoom) return null;
    const adjacentMaterial = materials.find(
      (m) => m.id === adjacentRoom.materialId
    );
    return calculateRoomStackHeight(adjacentRoom, adjacentMaterial, materials);
  };

  // Get other rooms for linking
  const otherRooms = allRooms.filter((r) => r.id !== room.id);

  // Count transitions
  const transitionCount = room.edgeTransitions?.length || 0;

  return (
    <div className="p-3 space-y-4">
      {/* Room Height Summary */}
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Floor Stack Height</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Material</span>
            <span className="font-mono">
              {roomHeight.materialName || 'None'} ({formatHeight(roomHeight.materialThicknessMm)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Underlayment</span>
            <span className="font-mono">
              {roomHeight.underlaymentType || 'None'} ({formatHeight(roomHeight.underlaymentThicknessMm)})
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-border">
            <span className="font-medium">Total Height</span>
            <span className="font-mono font-medium">
              {formatHeight(roomHeight.totalHeightMm)}
            </span>
          </div>
        </div>
      </div>

      {/* Edge List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Edges ({room.points.length})</Label>
          <div className="flex items-center gap-2">
            {unlinkedSharedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                onClick={handleAutoLinkAll}
              >
                <Link2 className="w-3 h-3" />
                Link All ({unlinkedSharedCount})
              </Button>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {transitionCount} transition{transitionCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1">
            {room.points.map((_, edgeIndex) => {
              const transition = getEdgeTransition(edgeIndex);
              const isTransition = !!transition;
              const lengthM = edgeLengths[edgeIndex];
              const adjacentHeight = transition
                ? getAdjacentRoomHeight(transition)
                : null;
              const heightDiff = adjacentHeight
                ? calculateHeightDifference(roomHeight, adjacentHeight)
                : transition?.heightDifferenceMm || 0;
              const recommendedType =
                isTransition && heightDiff > 0
                  ? recommendTransitionType(heightDiff)
                  : null;
              
              // Check for shared edge (adjacent room detected)
              const sharedEdge = getSharedEdge(room.id, edgeIndex);
              const hasUnlinkedSharedEdge = sharedEdge && !isTransition;
              const sharedRoomName = sharedEdge 
                ? allRooms.find(r => r.id === sharedEdge.otherRoomId)?.name 
                : null;

              return (
                <Collapsible
                  key={edgeIndex}
                  open={expandedEdge === edgeIndex && isTransition}
                  onOpenChange={(open) =>
                    setExpandedEdge(open ? edgeIndex : null)
                  }
                >
                  <div
                    className={cn(
                      'rounded-lg border transition-colors',
                      isTransition
                        ? 'border-amber-500/50 bg-amber-500/5'
                        : hasUnlinkedSharedEdge
                        ? 'border-blue-400/50 bg-blue-500/5'
                        : 'border-border bg-background'
                    )}
                  >
                    <div className="flex items-center gap-2 p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-7 w-7 p-0',
                          isTransition &&
                            'text-amber-600 hover:text-amber-700 hover:bg-amber-500/10',
                          hasUnlinkedSharedEdge &&
                            'text-blue-600 hover:text-blue-700 hover:bg-blue-500/10'
                        )}
                        onClick={() => toggleEdgeType(edgeIndex)}
                        title={
                          isTransition
                            ? 'Convert to wall'
                            : 'Mark as transition'
                        }
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </Button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            Edge {edgeIndex + 1}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {lengthM.toFixed(2)}m
                          </span>
                          {isTransition && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-600 border-amber-500/50"
                            >
                              Transition
                            </Badge>
                          )}
                          {hasUnlinkedSharedEdge && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-blue-600 border-blue-400/50 gap-0.5"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              Adjacent
                            </Badge>
                          )}
                        </div>
                        {isTransition && transition.adjacentRoomName && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            → {transition.adjacentRoomName}
                          </div>
                        )}
                        {hasUnlinkedSharedEdge && sharedRoomName && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-blue-600">
                              Shares edge with {sharedRoomName}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                autoLinkEdge(edgeIndex);
                              }}
                            >
                              <Link2 className="w-3 h-3 mr-0.5" />
                              Link
                            </Button>
                          </div>
                        )}
                      </div>

                      {isTransition && (
                        <>
                          {heightDiff > 6 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                          </CollapsibleTrigger>
                        </>
                      )}
                    </div>

                    <CollapsibleContent>
                      {isTransition && (
                        <div className="px-2 pb-2 pt-1 space-y-3 border-t border-border/50">
                          {/* Adjacent Room */}
                          <div className="space-y-1">
                            <Label className="text-[10px]">Adjacent Room</Label>
                            <Select
                              value={transition.adjacentRoomId || '__other__'}
                              onValueChange={(val) => {
                                if (val === '__other__') {
                                  updateTransition(edgeIndex, {
                                    adjacentRoomId: undefined,
                                  });
                                } else {
                                  const linkedRoom = allRooms.find(
                                    (r) => r.id === val
                                  );
                                  updateTransition(edgeIndex, {
                                    adjacentRoomId: val,
                                    adjacentRoomName: linkedRoom?.name,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select room..." />
                              </SelectTrigger>
                              <SelectContent>
                                {otherRooms.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {r.name}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__other__">
                                  Other (manual)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Manual Room Name (if not linked) */}
                          {!transition.adjacentRoomId && (
                            <div className="space-y-1">
                              <Label className="text-[10px]">Room Name</Label>
                              <Input
                                value={transition.adjacentRoomName || ''}
                                onChange={(e) =>
                                  updateTransition(edgeIndex, {
                                    adjacentRoomName: e.target.value,
                                  })
                                }
                                placeholder="e.g. Hallway"
                                className="h-8 text-xs"
                              />
                            </div>
                          )}

                          {/* Height Difference */}
                          <div className="space-y-1">
                            <Label className="text-[10px]">
                              Height Difference
                            </Label>
                            {adjacentHeight ? (
                              <div className="text-xs p-2 rounded bg-muted/50">
                                <div className="flex justify-between">
                                  <span>This room</span>
                                  <span className="font-mono">
                                    {formatHeight(roomHeight.totalHeightMm)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{transition.adjacentRoomName}</span>
                                  <span className="font-mono">
                                    {formatHeight(adjacentHeight.totalHeightMm)}
                                  </span>
                                </div>
                                <div className="flex justify-between pt-1 mt-1 border-t font-medium">
                                  <span>Difference</span>
                                  <span className="font-mono">
                                    {formatHeight(heightDiff)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <Input
                                type="number"
                                value={transition.heightDifferenceMm || ''}
                                onChange={(e) =>
                                  updateTransition(edgeIndex, {
                                    heightDifferenceMm: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="mm"
                                className="h-8 text-xs font-mono"
                              />
                            )}
                          </div>

                          {/* Transition Type */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px]">
                                Transition Type
                              </Label>
                              {recommendedType && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4"
                                >
                                  Recommended: {getTransitionLabel(recommendedType).split(' ')[0]}
                                </Badge>
                              )}
                            </div>
                            <Select
                              value={transition.transitionType}
                              onValueChange={(val) =>
                                updateTransition(edgeIndex, {
                                  transitionType: val as EdgeTransition['transitionType'],
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">
                                  Auto-select
                                </SelectItem>
                                <SelectItem value="t-molding">
                                  T-Molding (same height)
                                </SelectItem>
                                <SelectItem value="reducer">
                                  Reducer Strip
                                </SelectItem>
                                <SelectItem value="threshold">
                                  Threshold
                                </SelectItem>
                                <SelectItem value="ramp">
                                  Ramp System
                                </SelectItem>
                                <SelectItem value="end-cap">
                                  End Cap
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Transition Material */}
                          <div className="space-y-1">
                            <Label className="text-[10px]">
                              Transition Material
                            </Label>
                            <Select
                              value={transition.materialId || '__none__'}
                              onValueChange={(val) =>
                                updateTransition(edgeIndex, {
                                  materialId: val === '__none__' ? undefined : val,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  Not specified
                                </SelectItem>
                                {materials
                                  .filter((m) => m.type === 'linear')
                                  .map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Notes */}
                          <div className="space-y-1">
                            <Label className="text-[10px]">
                              Installer Notes
                            </Label>
                            <Input
                              value={transition.notes || ''}
                              onChange={(e) =>
                                updateTransition(edgeIndex, {
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Optional notes..."
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Help Text */}
      <div className="text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
        <p>
          Mark edges as <strong>transitions</strong> where this room meets
          another flooring material. Transitions are excluded from coving and
          smooth edge calculations.
        </p>
      </div>
    </div>
  );
}
