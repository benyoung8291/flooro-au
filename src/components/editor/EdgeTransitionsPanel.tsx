import { useState, useMemo } from 'react';
import { Room, ScaleCalibration, EdgeTransition, ALU_ANGLE_SIZES } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { SharedEdge, getSharedEdgeForEdge } from '@/lib/canvas/sharedEdgeDetector';
import { useSharedEdges } from '@/hooks/useSharedEdges';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
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
  Plus,
  Trash2,
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

  // Get transitions for an edge (multiple supported)
  const getEdgeTransitions = (edgeIndex: number): EdgeTransition[] => {
    return (room.edgeTransitions || []).filter((t) => t.edgeIndex === edgeIndex);
  };

  // Auto-link a single shared edge
  const autoLinkEdge = (edgeIndex: number) => {
    const sharedEdge = getSharedEdge(room.id, edgeIndex);
    if (!sharedEdge) return;

    const otherRoom = allRooms.find(r => r.id === sharedEdge.otherRoomId);
    const existing = room.edgeTransitions || [];
    
    const newTransition: EdgeTransition = {
      id: crypto.randomUUID(),
      edgeIndex,
      startPercent: 0,
      endPercent: 1,
      adjacentRoomId: sharedEdge.otherRoomId,
      adjacentRoomName: otherRoom?.name,
      transitionType: 'auto',
    };

    onUpdateRoom(room.id, {
      edgeTransitions: [...existing, newTransition],
    });
    
    toast.success(`Linked to ${otherRoom?.name || 'adjacent room'}`);
  };

  // Add a new transition segment to an edge
  const addTransitionSegment = (edgeIndex: number) => {
    const existing = room.edgeTransitions || [];
    const edgeSegments = existing.filter(t => t.edgeIndex === edgeIndex).sort((a, b) => (a.startPercent ?? 0) - (b.startPercent ?? 0));
    
    // Find first uncovered gap
    let start = 0;
    for (const seg of edgeSegments) {
      const segStart = seg.startPercent ?? 0;
      const segEnd = seg.endPercent ?? 1;
      if (segStart > start) break;
      start = Math.max(start, segEnd);
    }
    
    if (start >= 1) {
      toast.error('Edge is fully covered');
      return;
    }

    const newTransition: EdgeTransition = {
      id: crypto.randomUUID(),
      edgeIndex,
      startPercent: start,
      endPercent: 1,
      transitionType: 'auto',
    };

    onUpdateRoom(room.id, {
      edgeTransitions: [...existing, newTransition],
    });
  };

  // Delete a single transition segment
  const deleteTransitionSegment = (transitionId: string) => {
    const existing = room.edgeTransitions || [];
    onUpdateRoom(room.id, {
      edgeTransitions: existing.filter(t => t.id !== transitionId),
    });
  };

  // Remove all transitions from an edge
  const removeAllEdgeTransitions = (edgeIndex: number) => {
    const existing = room.edgeTransitions || [];
    onUpdateRoom(room.id, {
      edgeTransitions: existing.filter((t) => t.edgeIndex !== edgeIndex),
    });
  };

  // Update a specific transition by ID
  const updateTransitionById = (
    transitionId: string,
    updates: Partial<EdgeTransition>
  ) => {
    const existing = room.edgeTransitions || [];
    const updated = existing.map((t) =>
      t.id === transitionId ? { ...t, ...updates } : t
    );
    onUpdateRoom(room.id, { edgeTransitions: updated });
  };

  // Legacy: update first transition on an edge (backward compat)
  const updateTransitionByEdge = (
    edgeIndex: number,
    updates: Partial<EdgeTransition>
  ) => {
    const existing = room.edgeTransitions || [];
    let found = false;
    const updated = existing.map((t) => {
      if (t.edgeIndex === edgeIndex && !found) {
        found = true;
        return { ...t, ...updates };
      }
      return t;
    });
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
              const transitions = getEdgeTransitions(edgeIndex);
              const hasTransitions = transitions.length > 0;
              const lengthM = edgeLengths[edgeIndex];
              
              // Check for shared edge (adjacent room detected)
              const sharedEdge = getSharedEdge(room.id, edgeIndex);
              const hasUnlinkedSharedEdge = sharedEdge && !hasTransitions;
              const sharedRoomName = sharedEdge 
                ? allRooms.find(r => r.id === sharedEdge.otherRoomId)?.name 
                : null;

              return (
                <Collapsible
                  key={edgeIndex}
                  open={expandedEdge === edgeIndex}
                  onOpenChange={(open) =>
                    setExpandedEdge(open ? edgeIndex : null)
                  }
                >
                  <div
                    className={cn(
                      'rounded-lg border transition-colors',
                      hasTransitions
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
                          hasTransitions &&
                            'text-amber-600 hover:text-amber-700 hover:bg-amber-500/10',
                          hasUnlinkedSharedEdge &&
                            'text-blue-600 hover:text-blue-700 hover:bg-blue-500/10'
                        )}
                        onClick={() => {
                          if (hasTransitions) {
                            removeAllEdgeTransitions(edgeIndex);
                          } else {
                            addTransitionSegment(edgeIndex);
                          }
                        }}
                        title={
                          hasTransitions
                            ? 'Remove all transitions'
                            : 'Add transition'
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
                          {hasTransitions && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-600 border-amber-500/50"
                            >
                              {transitions.length} Transition{transitions.length !== 1 ? 's' : ''}
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

                      {(hasTransitions || hasUnlinkedSharedEdge) && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>

                    <CollapsibleContent>
                      <div className="px-2 pb-2 pt-1 space-y-3 border-t border-border/50">
                        {/* Transition segments */}
                        {transitions.map((transition, tIdx) => {
                          const adjacentHeight = getAdjacentRoomHeight(transition);
                          const heightDiff = adjacentHeight
                            ? calculateHeightDifference(roomHeight, adjacentHeight)
                            : transition.heightDifferenceMm || 0;
                          const recommendedType =
                            heightDiff > 0
                              ? recommendTransitionType(heightDiff)
                              : null;

                          return (
                            <div key={transition.id || tIdx} className="p-2 rounded border border-amber-500/30 bg-amber-500/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-medium text-amber-700">
                                  Segment {tIdx + 1}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => transition.id && deleteTransitionSegment(transition.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>

                              {/* Range sliders */}
                              <div className="space-y-1">
                                <Label className="text-[10px]">
                                  Range: {Math.round((transition.startPercent ?? 0) * 100)}% — {Math.round((transition.endPercent ?? 1) * 100)}%
                                </Label>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={Math.round((transition.endPercent ?? 1) * 100) - 1}
                                    value={Math.round((transition.startPercent ?? 0) * 100)}
                                    onChange={(e) => transition.id && updateTransitionById(transition.id, { startPercent: Math.max(0, Math.min(1, parseInt(e.target.value) / 100)) })}
                                    className="h-6 w-16 text-[10px] font-mono"
                                  />
                                  <span className="text-[10px] text-muted-foreground">to</span>
                                  <Input
                                    type="number"
                                    min={Math.round((transition.startPercent ?? 0) * 100) + 1}
                                    max={100}
                                    value={Math.round((transition.endPercent ?? 1) * 100)}
                                    onChange={(e) => transition.id && updateTransitionById(transition.id, { endPercent: Math.max(0, Math.min(1, parseInt(e.target.value) / 100)) })}
                                    className="h-6 w-16 text-[10px] font-mono"
                                  />
                                  <span className="text-[10px] text-muted-foreground">%</span>
                                </div>
                              </div>

                              {/* Adjacent Room */}
                              <div className="space-y-1">
                                <Label className="text-[10px]">Adjacent Room</Label>
                                <Select
                                  value={transition.adjacentRoomId || '__other__'}
                                  onValueChange={(val) => {
                                    if (!transition.id) return;
                                    if (val === '__other__') {
                                      updateTransitionById(transition.id, { adjacentRoomId: undefined });
                                    } else {
                                      const linkedRoom = allRooms.find(r => r.id === val);
                                      updateTransitionById(transition.id, {
                                        adjacentRoomId: val,
                                        adjacentRoomName: linkedRoom?.name,
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs">
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

                              {/* Manual Room Name */}
                              {!transition.adjacentRoomId && (
                                <div className="space-y-1">
                                  <Label className="text-[10px]">Room Name</Label>
                                  <Input
                                    value={transition.adjacentRoomName || ''}
                                    onChange={(e) =>
                                      transition.id && updateTransitionById(transition.id, {
                                        adjacentRoomName: e.target.value,
                                      })
                                    }
                                    placeholder="e.g. Hallway"
                                    className="h-7 text-xs"
                                  />
                                </div>
                              )}

                              {/* Height Difference */}
                              <div className="space-y-1">
                                <Label className="text-[10px]">Height Difference</Label>
                                {adjacentHeight ? (
                                  <div className="text-xs p-2 rounded bg-muted/50">
                                    <div className="flex justify-between">
                                      <span>This room</span>
                                      <span className="font-mono">{formatHeight(roomHeight.totalHeightMm)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>{transition.adjacentRoomName}</span>
                                      <span className="font-mono">{formatHeight(adjacentHeight.totalHeightMm)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 mt-1 border-t font-medium">
                                      <span>Difference</span>
                                      <span className="font-mono">{formatHeight(heightDiff)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <Input
                                    type="number"
                                    value={transition.heightDifferenceMm || ''}
                                    onChange={(e) =>
                                      transition.id && updateTransitionById(transition.id, {
                                        heightDifferenceMm: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="mm"
                                    className="h-7 text-xs font-mono"
                                  />
                                )}
                              </div>

                              {/* Transition Type */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[10px]">Transition Type</Label>
                                  {recommendedType && (
                                    <Badge variant="outline" className="text-[9px] h-4">
                                      Rec: {getTransitionLabel(recommendedType).split(' ')[0]}
                                    </Badge>
                                  )}
                                </div>
                                <Select
                                  value={transition.transitionType}
                                  onValueChange={(val) => {
                                    if (!transition.id) return;
                                    updateTransitionById(transition.id, {
                                      transitionType: val as EdgeTransition['transitionType'],
                                      aluAngleSizeMm: val === 'alu-angle' ? (transition.aluAngleSizeMm || 6) : undefined,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">Auto-select</SelectItem>
                                    <SelectItem value="t-molding">T-Molding</SelectItem>
                                    <SelectItem value="reducer">Reducer Strip</SelectItem>
                                    <SelectItem value="threshold">Threshold</SelectItem>
                                    <SelectItem value="ramp">Ramp System</SelectItem>
                                    <SelectItem value="end-cap">End Cap</SelectItem>
                                    <SelectItem value="alu-angle">Alu Angle</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Alu Angle Size Picker */}
                              {transition.transitionType === 'alu-angle' && (
                                <div className="space-y-1">
                                  <Label className="text-[10px]">Alu Angle Size</Label>
                                  <Select
                                    value={String(transition.aluAngleSizeMm || 6)}
                                    onValueChange={(val) =>
                                      transition.id && updateTransitionById(transition.id, {
                                        aluAngleSizeMm: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ALU_ANGLE_SIZES.map(size => (
                                        <SelectItem key={size} value={String(size)}>
                                          {size}mm
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Transition Material */}
                              <div className="space-y-1">
                                <Label className="text-[10px]">Transition Material</Label>
                                <Select
                                  value={transition.materialId || '__none__'}
                                  onValueChange={(val) =>
                                    transition.id && updateTransitionById(transition.id, {
                                      materialId: val === '__none__' ? undefined : val,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Not specified</SelectItem>
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
                                <Label className="text-[10px]">Notes</Label>
                                <Input
                                  value={transition.notes || ''}
                                  onChange={(e) =>
                                    transition.id && updateTransitionById(transition.id, {
                                      notes: e.target.value,
                                    })
                                  }
                                  placeholder="Optional notes..."
                                  className="h-7 text-xs"
                                />
                              </div>
                            </div>
                          );
                        })}

                        {/* Add another segment button */}
                        {hasTransitions && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs gap-1"
                            onClick={() => addTransitionSegment(edgeIndex)}
                          >
                            <Plus className="w-3 h-3" />
                            Add Segment
                          </Button>
                        )}

                        {/* Link button for unlinked shared edges */}
                        {hasUnlinkedSharedEdge && !hasTransitions && sharedRoomName && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs gap-1 text-blue-600 border-blue-300"
                            onClick={() => autoLinkEdge(edgeIndex)}
                          >
                            <Link2 className="w-3 h-3" />
                            Link to {sharedRoomName}
                          </Button>
                        )}
                      </div>
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
          another flooring material. Each edge can have multiple transition segments
          covering different portions. Transitions are excluded from coving and
          smooth edge calculations.
        </p>
      </div>
    </div>
  );
}
