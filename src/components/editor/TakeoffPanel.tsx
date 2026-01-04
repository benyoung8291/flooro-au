import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ChevronDown,
  ChevronRight,
  Square,
  Circle,
  Minus,
  Trash2,
  RotateCw,
  FileText,
  ClipboardList,
  AlertCircle,
  Wrench,
  Scissors,
  LayoutGrid,
  ArrowRight,
  Pencil,
  Library,
} from 'lucide-react';
import { useMaterials, Material } from '@/hooks/useMaterials';
import { Room, ScaleCalibration, RoomAccessories, ProjectMaterial } from '@/lib/canvas/types';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { calculatePolygonArea } from '@/lib/canvas/geometry';
import { RoomDetailView } from './RoomDetailView';
import { projectMaterialToMaterial } from '@/hooks/useProjectMaterials';
import { cn } from '@/lib/utils';

interface TakeoffPanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
  rooms?: Room[];
  selectedRoomId?: string | null;
  scale?: ScaleCalibration | null;
  onSelectRoom?: (roomId: string | null) => void;
  onDeleteRoom?: (roomId: string) => void;
  onRenameRoom?: (roomId: string, name: string) => void;
  onUpdateRoom?: (roomId: string, updates: Partial<Room>) => void;
  onMaterialSelect?: (material: Material, roomId: string) => void;
  projectName?: string;
  stripPlans?: Map<string, StripPlanResult>;
  onOpenFinishesSchedule?: () => void;
  onOpenQuoteSummary?: () => void;
  // Project materials support
  projectMaterials?: ProjectMaterial[];
}

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

export function TakeoffPanel({ 
  collapsed, 
  onToggle, 
  rooms = [],
  selectedRoomId = null,
  scale = null,
  onSelectRoom,
  onDeleteRoom,
  onRenameRoom,
  onUpdateRoom,
  onMaterialSelect,
  projectName,
  stripPlans,
  onOpenFinishesSchedule,
  onOpenQuoteSummary,
  projectMaterials = [],
}: TakeoffPanelProps) {
  const { data: materials, isLoading } = useMaterials();
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Combine project materials (priority) with library materials for lookup
  const allMaterialsMap = useMemo(() => {
    const map = new Map<string, Material>();
    // Add library materials first
    materials?.forEach(m => map.set(m.id, m));
    // Add project materials (will override if same ID)
    projectMaterials.forEach(pm => map.set(pm.id, projectMaterialToMaterial(pm)));
    return map;
  }, [materials, projectMaterials]);

  // Get the room being edited
  const editingRoom = editingRoomId ? rooms.find(r => r.id === editingRoomId) : null;
  // Calculate totals
  const totals = useMemo(() => {
    if (!scale) return { area: 0, cost: 0, roomsWithMaterial: 0 };
    
    let totalArea = 0;
    let totalCost = 0;
    let roomsWithMaterial = 0;
    
    rooms.forEach(room => {
      const areaPx = calculatePolygonArea(room.points);
      const areaM2 = areaPx / (scale.pixelsPerMm * scale.pixelsPerMm) / 1_000_000;
      totalArea += areaM2;
      
      if (room.materialId) {
        roomsWithMaterial++;
        const material = materials?.find(m => m.id === room.materialId);
        if (material) {
          const pricePerM2 = (material.specs as any).pricePerM2 || (material.specs as any).price || 0;
          const wastePercent = (material.specs as any).wastePercent || 10;
          const grossArea = areaM2 * (1 + wastePercent / 100);
          totalCost += grossArea * pricePerM2;
        }
      }
    });
    
    return { area: totalArea, cost: totalCost, roomsWithMaterial };
  }, [rooms, materials, scale]);

  const formatArea = (room: Room): string => {
    if (!scale) return '—';
    const areaPx = calculatePolygonArea(room.points);
    const areaM2 = areaPx / (scale.pixelsPerMm * scale.pixelsPerMm) / 1_000_000;
    return `${areaM2.toFixed(1)} m²`;
  };

  const getRoomCost = (room: Room): number | null => {
    if (!scale || !room.materialId) return null;
    const material = allMaterialsMap.get(room.materialId);
    if (!material) return null;
    
    const areaPx = calculatePolygonArea(room.points);
    const areaM2 = areaPx / (scale.pixelsPerMm * scale.pixelsPerMm) / 1_000_000;
    const pricePerM2 = (material.specs as any).pricePerM2 || (material.specs as any).price || 0;
    const wastePercent = (material.specs as any).wastePercent || 10;
    return areaM2 * (1 + wastePercent / 100) * pricePerM2;
  };

  const getMaterial = (room: Room): Material | undefined => {
    return room.materialId ? allMaterialsMap.get(room.materialId) : undefined;
  };

  const toggleRoomExpanded = (roomId: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const handleMaterialChange = (roomId: string, materialId: string) => {
    // Check project materials first, then library materials
    const projectMaterial = projectMaterials.find(pm => pm.id === materialId);
    if (projectMaterial) {
      onMaterialSelect?.(projectMaterialToMaterial(projectMaterial), roomId);
      return;
    }
    const material = materials?.find(m => m.id === materialId);
    if (material && onMaterialSelect) {
      onMaterialSelect(material, roomId);
    }
  };

  const rotateFillDirection = (room: Room) => {
    const current = room.fillDirection || 0;
    const next = (current + 45) % 360;
    onUpdateRoom?.(room.id, { fillDirection: next });
  };

  const countAccessories = (room: Room): number => {
    if (!room.accessories) return 0;
    let count = 0;
    if (room.accessories.coving?.enabled) count++;
    if (room.accessories.weldRod?.enabled) count++;
    if (room.accessories.smoothEdge?.enabled) count++;
    if (room.accessories.underlayment?.enabled) count++;
    if (room.accessories.adhesive?.enabled) count++;
    if (room.accessories.transitions?.length) count += room.accessories.transitions.length;
    return count;
  };

  // Handler for editing a room
  const handleEditRoom = (roomId: string) => {
    setEditingRoomId(roomId);
    onSelectRoom?.(roomId);
  };

  const handleBackFromDetail = () => {
    setEditingRoomId(null);
  };

  return (
    <div 
      className={cn(
        "h-full border-l border-border bg-card flex flex-col z-20 shrink-0 transition-all duration-200 overflow-hidden",
        collapsed ? "w-12" : "w-80"
      )}
    >
      {collapsed ? (
        // Collapsed state
        <div className="flex flex-col items-center py-3 gap-2 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggle}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Expand panel</TooltipContent>
          </Tooltip>
          <div className="text-xs text-muted-foreground font-mono mt-2 [writing-mode:vertical-rl] rotate-180">
            TAKEOFF
          </div>
        </div>
      ) : editingRoom ? (
        // Room Detail View
        <RoomDetailView
          room={editingRoom}
          allRooms={rooms || []}
          scale={scale}
          materials={materials || []}
          stripPlan={stripPlans?.get(editingRoom.id) || null}
          onBack={handleBackFromDetail}
          onUpdateRoom={(roomId, updates) => onUpdateRoom?.(roomId, updates)}
          onDeleteRoom={(roomId) => {
            onDeleteRoom?.(roomId);
            setEditingRoomId(null);
          }}
          onMaterialSelect={(material, roomId) => onMaterialSelect?.(material, roomId)}
        />
      ) : (
        <>
          {/* Header with Summary */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">Takeoff</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Collapse panel</TooltipContent>
              </Tooltip>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background rounded-md p-2">
                <div className="text-lg font-bold font-mono">{totals.area.toFixed(0)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">m² Total</div>
              </div>
              <div className="bg-background rounded-md p-2">
                <div className="text-lg font-bold">{rooms.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Rooms</div>
              </div>
              <div className="bg-background rounded-md p-2">
                <div className="text-lg font-bold font-mono">${totals.cost.toFixed(0)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Est. Cost</div>
              </div>
            </div>
            
            {/* Status indicator */}
            {rooms.length > 0 && totals.roomsWithMaterial < rooms.length && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{rooms.length - totals.roomsWithMaterial} room{rooms.length - totals.roomsWithMaterial !== 1 ? 's' : ''} need materials</span>
              </div>
            )}
          </div>

          {/* Room List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {rooms.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="text-muted-foreground text-sm mb-2">No rooms yet</div>
                  <p className="text-xs text-muted-foreground">Use the Draw tool to create rooms</p>
                </div>
              ) : (
                rooms.map(room => {
                  const material = getMaterial(room);
                  const cost = getRoomCost(room);
                  const isExpanded = expandedRooms.has(room.id);
                  const isSelected = room.id === selectedRoomId;
                  const Icon = material ? typeIcons[material.type] || Square : null;
                  const stripPlan = stripPlans?.get(room.id);
                  const accessoryCount = countAccessories(room);
                  
                  return (
                    <div 
                      key={room.id} 
                      className={cn(
                        "rounded-lg border transition-colors",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border bg-background hover:bg-muted/50"
                      )}
                    >
                      {/* Room Row */}
                      <div 
                        className="p-2.5 cursor-pointer"
                        onClick={() => onSelectRoom?.(room.id)}
                      >
                        {/* Top row: Color, Name, Area */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div 
                            className="w-3 h-3 rounded-sm shrink-0" 
                            style={{ backgroundColor: room.color?.replace('0.15', '0.6') || 'hsl(var(--primary))' }}
                          />
                          <input
                            value={room.name}
                            onChange={(e) => {
                              e.stopPropagation();
                              onRenameRoom?.(room.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                          />
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {formatArea(room)}
                          </span>
                        </div>
                        
                        {/* Material row */}
                        <div className="flex items-center gap-2">
                          <Select
                            value={room.materialId || ''}
                            onValueChange={(value) => handleMaterialChange(room.id, value)}
                          >
                            <SelectTrigger 
                              className={cn(
                                "h-7 text-xs flex-1",
                                !room.materialId && "text-muted-foreground"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue placeholder="Assign material...">
                                {material ? (
                                  <div className="flex items-center gap-1.5">
                                    {Icon && <Icon className="w-3 h-3" />}
                                    <span className="truncate">{material.name}</span>
                                  </div>
                                ) : null}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border shadow-lg z-50">
                              {/* Project Materials (if any) */}
                              {projectMaterials.length > 0 && (
                                <>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <ClipboardList className="w-3 h-3" />
                                    Project Materials
                                  </div>
                                  {projectMaterials.map(pm => {
                                    const MIcon = typeIcons[pm.type] || Square;
                                    const specs = pm.specs as any;
                                    return (
                                      <SelectItem key={pm.id} value={pm.id}>
                                        <div className="flex items-center gap-2">
                                          <MIcon className="w-3 h-3" />
                                          <span className="font-mono text-xs text-primary">{pm.materialCode}</span>
                                          <span>{pm.name}</span>
                                          <span className="text-muted-foreground text-xs">
                                            ${(specs.pricePerM2 || specs.price || 0).toFixed(2)}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mt-1 border-t">
                                    <Library className="w-3 h-3" />
                                    Library
                                  </div>
                                </>
                              )}
                              {materials?.map(m => {
                                const MIcon = typeIcons[m.type] || Square;
                                return (
                                  <SelectItem key={m.id} value={m.id}>
                                    <div className="flex items-center gap-2">
                                      <MIcon className="w-3 h-3" />
                                      <span>{m.name}</span>
                                      <span className="text-muted-foreground text-xs">
                                        ${((m.specs as any).pricePerM2 || (m.specs as any).price || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          
                          {/* Show material code from project material (read-only) */}
                          {room.materialId && (() => {
                            const pm = projectMaterials.find(pm => pm.id === room.materialId);
                            return pm?.materialCode ? (
                              <Badge variant="outline" className="h-7 px-2 text-xs font-mono">
                                {pm.materialCode}
                              </Badge>
                            ) : null;
                          })()}
                          
                          {cost !== null && (
                            <span className="text-xs font-mono text-muted-foreground shrink-0 w-14 text-right">
                              ${cost.toFixed(0)}
                            </span>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRoomExpanded(room.id);
                            }}
                          >
                            <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                          </Button>
                        </div>
                        
                        {/* Quick info badges */}
                        {material && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {accessoryCount > 0 && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                <Wrench className="w-2.5 h-2.5 mr-0.5" />
                                {accessoryCount}
                              </Badge>
                            )}
                            {material.type === 'roll' && stripPlan && stripPlan.seamLines.length > 0 && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                <Scissors className="w-2.5 h-2.5 mr-0.5" />
                                {stripPlan.seamLines.length} seams
                              </Badge>
                            )}
                            {material.type === 'roll' && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                                <ArrowRight 
                                  className="w-2.5 h-2.5 mr-0.5" 
                                  style={{ transform: `rotate(${room.fillDirection || 0}deg)` }}
                                />
                                {room.fillDirection || 0}°
                              </Badge>
                            )}
                            {material.type === 'tile' && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">
                                <LayoutGrid className="w-2.5 h-2.5 mr-0.5" />
                                {room.tilePattern || 'grid'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Expanded Details */}
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <div className="border-t border-border p-2.5 space-y-2 bg-muted/20">
                            {/* Fill Direction for roll materials */}
                            {material?.type === 'roll' && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Fill Direction</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono">{room.fillDirection || 0}°</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      rotateFillDirection(room);
                                    }}
                                  >
                                    <RotateCw className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            {/* First Seam Offset for roll materials */}
                            {material?.type === 'roll' && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">First Seam Offset</span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={room.seamOptions?.firstSeamOffset || 0}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      onUpdateRoom?.(room.id, { 
                                        seamOptions: { 
                                          ...room.seamOptions, 
                                          firstSeamOffset: val 
                                        } 
                                      });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-16 h-6 text-xs font-mono px-1.5"
                                    min={0}
                                  />
                                  <span className="text-muted-foreground">mm</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Tile Pattern for tile materials */}
                            {material?.type === 'tile' && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Pattern</span>
                                <Select
                                  value={room.tilePattern || 'grid'}
                                  onValueChange={(value) => onUpdateRoom?.(room.id, { tilePattern: value as any })}
                                >
                                  <SelectTrigger className="h-6 w-24 text-xs" onClick={(e) => e.stopPropagation()}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border border-border shadow-lg z-50">
                                    <SelectItem value="grid">Grid</SelectItem>
                                    <SelectItem value="brick">Brick</SelectItem>
                                    <SelectItem value="thirds">Thirds</SelectItem>
                                    <SelectItem value="herringbone">Herringbone</SelectItem>
                                    <SelectItem value="diagonal">Diagonal</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            {/* Accessory summary */}
                            {material && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Accessories</span>
                                <span className={accessoryCount > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                                  {accessoryCount > 0 ? `${accessoryCount} enabled` : 'None'}
                                </span>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-3 pt-2 border-t border-border">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRoom(room.id);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                Edit Details
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRoom?.(room.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-3 border-t border-border bg-muted/30 space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={onOpenFinishesSchedule}
            >
              <Library className="w-3.5 h-3.5 mr-1.5" />
              Project Materials
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="w-full"
              onClick={onOpenQuoteSummary}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Generate Quote
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
