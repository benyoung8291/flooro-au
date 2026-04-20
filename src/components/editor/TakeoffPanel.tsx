import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  Percent,
  DollarSign,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useMaterials, Material } from '@/hooks/useMaterials';
import { Room, ScaleCalibration, RoomAccessories, ProjectMaterial } from '@/lib/canvas/types';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { calculatePolygonArea, calculateRoomNetArea } from '@/lib/canvas/geometry';
import { formatCurrency } from '@/lib/reports/calculations';
import { RoomDetailView } from './RoomDetailView';
import { projectMaterialToMaterial } from '@/hooks/useProjectMaterials';
import { useGenerateQuoteFromProject, useProjectQuote } from '@/hooks/useGenerateQuoteFromProject';
import { cn } from '@/lib/utils';
import { MaterialEfficiencyCard } from './MaterialEfficiencyCard';
import { suggestWastePercent } from '@/lib/reports/wasteCalculator';

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
  projectId?: string;
  projectName?: string;
  projectAddress?: string;
  stripPlans?: Map<string, StripPlanResult>;
  onOpenFinishesSchedule?: () => void;
  onOpenReport?: () => void;
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
  projectId,
  projectName,
  projectAddress,
  stripPlans,
  onOpenFinishesSchedule,
  onOpenReport,
  projectMaterials = [],
}: TakeoffPanelProps) {
  const navigate = useNavigate();
  const { data: materials, isLoading } = useMaterials();
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const { generateAndNavigate, isGenerating } = useGenerateQuoteFromProject();
  const { checkExistingQuote } = useProjectQuote(projectId);
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);
  const [checkingQuote, setCheckingQuote] = useState(false);

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

  const getNetAreaM2 = (room: Room): number => {
    if (!scale) return 0;
    const netPx = calculateRoomNetArea(room);
    return netPx / (scale.pixelsPerMm * scale.pixelsPerMm) / 1_000_000;
  };

  const getOrderAreaM2 = (room: Room): number | null => {
    if (!scale || !room.materialId) return null;
    const material = allMaterialsMap.get(room.materialId);
    if (!material) return null;
    
    // For roll goods, use strip plan result
    const stripPlan = stripPlans?.get(room.id);
    if (material.type === 'roll' && stripPlan) {
      return stripPlan.totalMaterialAreaM2;
    }
    
    // For tiles/other, apply waste factor to net area
    const netM2 = getNetAreaM2(room);
    const wastePercent = room.wastePercent ?? (material.specs as any).wastePercent ?? 10;
    return netM2 * (1 + wastePercent / 100);
  };

  const getRoomCost = (room: Room): number | null => {
    if (!scale || !room.materialId) return null;
    const material = allMaterialsMap.get(room.materialId);
    if (!material) return null;
    
    const netPx = calculateRoomNetArea(room);
    const netM2 = netPx / (scale.pixelsPerMm * scale.pixelsPerMm) / 1_000_000;
    const pricePerM2 = (material.specs as any).pricePerM2 || (material.specs as any).price || 0;
    const wastePercent = (material.specs as any).wastePercent || 10;
    return netM2 * (1 + wastePercent / 100) * pricePerM2;
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
                <div className="text-lg font-bold font-mono">{totals.area.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">m² Total</div>
              </div>
              <div className="bg-background rounded-md p-2">
                <div className="text-lg font-bold">{rooms.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Rooms</div>
              </div>
              <div className="bg-background rounded-md p-2">
                <div className="text-lg font-bold font-mono">{formatCurrency(totals.cost)}</div>
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
                        {/* Top row: Color, Name, Code Badge, Area */}
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
                          {/* Material code badge */}
                          {room.materialId && (() => {
                            const pm = projectMaterials.find(pm => pm.id === room.materialId);
                            return pm?.materialCode ? (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono shrink-0">
                                {pm.materialCode}
                              </Badge>
                            ) : null;
                          })()}
                          {/* Area display: net m² and order m² */}
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-xs text-muted-foreground font-mono leading-tight">
                              {scale ? `${getNetAreaM2(room).toFixed(2)} m²` : '—'}
                            </span>
                            {(() => {
                              const orderM2 = getOrderAreaM2(room);
                              return orderM2 !== null ? (
                                <span className="text-[10px] text-primary font-mono font-medium leading-tight">
                                  {orderM2.toFixed(2)} m² order
                                </span>
                              ) : null;
                            })()}
                          </div>
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
                                            {formatCurrency(specs.pricePerM2 || specs.price || 0)}
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
                                        {formatCurrency((m.specs as any).pricePerM2 || (m.specs as any).price || 0)}
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          
                          
                          {cost !== null && (
                            <span className="text-xs font-mono text-muted-foreground shrink-0 w-14 text-right">
                              {formatCurrency(cost)}
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
                            {/* Waste % badge */}
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                              <Percent className="w-2.5 h-2.5 mr-0.5" />
                              {room.wastePercent ?? (material.specs as any).wastePercent ?? 10}%
                            </Badge>
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
                            {/* Install cost badge */}
                            {room.installCost && room.installCost.rate > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                                <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                                {room.installCost.type === 'per_m2' 
                                  ? `${room.installCost.rate.toFixed(0)}/m²` 
                                  : `${room.installCost.rate.toFixed(0)} fixed`}
                                {room.installCost.oohAllowance && (
                                  <Clock className="w-2.5 h-2.5 ml-0.5 text-amber-500" />
                                )}
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
                            
                            {/* Waste % editor */}
                            {material && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Waste %</span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={room.wastePercent ?? (material.specs as any).wastePercent ?? 10}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val) && val >= 0 && val <= 100) {
                                        onUpdateRoom?.(room.id, { wastePercent: val });
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-14 h-6 text-xs font-mono px-1.5"
                                    min={0}
                                    max={100}
                                    step={1}
                                  />
                                  <span className="text-muted-foreground">%</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const wasteVal = room.wastePercent ?? (material.specs as any).wastePercent ?? 10;
                                          // Apply to all rooms with same material
                                          rooms.forEach(r => {
                                            if (r.materialId === room.materialId && r.id !== room.id) {
                                              onUpdateRoom?.(r.id, { wastePercent: wasteVal });
                                            }
                                          });
                                        }}
                                      >
                                        <LayoutGrid className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Apply to all rooms with this material</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            )}
                            
                            {/* Installation Cost editor */}
                            {material && (
                              <div className="space-y-2 pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground font-medium">Installation Cost</span>
                                  <Select
                                    value={room.installCost?.type || 'per_m2'}
                                    onValueChange={(value) => {
                                      onUpdateRoom?.(room.id, { 
                                        installCost: { 
                                          ...room.installCost, 
                                          type: value as 'per_m2' | 'fixed',
                                          rate: room.installCost?.rate || 0,
                                        } 
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-6 w-20 text-[10px]" onClick={(e) => e.stopPropagation()}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border border-border shadow-lg z-50">
                                      <SelectItem value="per_m2">$/m²</SelectItem>
                                      <SelectItem value="fixed">Fixed $</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-muted-foreground">Cost</span>
                                    <Input
                                      type="number"
                                      value={room.installCost?.rate || ''}
                                      placeholder="0.00"
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        onUpdateRoom?.(room.id, { 
                                          installCost: { 
                                            ...room.installCost,
                                            type: room.installCost?.type || 'per_m2',
                                            rate: isNaN(val) ? 0 : val,
                                          } 
                                        });
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-6 text-xs font-mono px-1.5"
                                      step="0.01"
                                      min={0}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-muted-foreground">Sell</span>
                                    <Input
                                      type="number"
                                      value={room.installCost?.sellRate || ''}
                                      placeholder="0.00"
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        onUpdateRoom?.(room.id, { 
                                          installCost: { 
                                            ...room.installCost,
                                            type: room.installCost?.type || 'per_m2',
                                            rate: room.installCost?.rate || 0,
                                            sellRate: isNaN(val) ? undefined : val,
                                          } 
                                        });
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-6 text-xs font-mono px-1.5"
                                      step="0.01"
                                      min={0}
                                    />
                                  </div>
                                </div>
                                
                                {/* OOH Allowance */}
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`ooh-${room.id}`}
                                      checked={room.installCost?.oohAllowance || false}
                                      onCheckedChange={(checked) => {
                                        onUpdateRoom?.(room.id, { 
                                          installCost: { 
                                            ...room.installCost,
                                            type: room.installCost?.type || 'per_m2',
                                            rate: room.installCost?.rate || 0,
                                            oohAllowance: checked === true,
                                            oohMultiplier: checked ? (room.installCost?.oohMultiplier || 1.5) : undefined,
                                          } 
                                        });
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-3.5 w-3.5"
                                    />
                                    <label 
                                      htmlFor={`ooh-${room.id}`} 
                                      className="text-muted-foreground cursor-pointer flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Clock className="w-3 h-3" />
                                      Out of Hours
                                    </label>
                                  </div>
                                  {room.installCost?.oohAllowance && (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={room.installCost?.oohMultiplier || 1.5}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          onUpdateRoom?.(room.id, { 
                                            installCost: { 
                                              ...room.installCost!,
                                              oohMultiplier: isNaN(val) ? 1.5 : val,
                                            } 
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-14 h-6 text-xs font-mono px-1.5"
                                        step="0.1"
                                        min={1}
                                        max={5}
                                      />
                                      <span className="text-muted-foreground">×</span>
                                    </div>
                                  )}
                                </div>
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
            {existingQuoteId ? (
              <Button 
                variant="default" 
                size="sm" 
                className="w-full"
                onClick={() => navigate(`/quotes/${existingQuoteId}`)}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                View Quote
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                className="w-full"
                disabled={isGenerating || rooms.filter(r => r.materialId).length === 0}
                onClick={async () => {
                  // Check for existing quote first
                  setCheckingQuote(true);
                  const existing = await checkExistingQuote();
                  setCheckingQuote(false);
                  
                  if (existing) {
                    setExistingQuoteId(existing);
                    navigate(`/quotes/${existing}`);
                    return;
                  }

                  await generateAndNavigate({
                    projectId: projectId || '',
                    projectName: projectName || 'Untitled Project',
                    projectAddress,
                    rooms,
                    scale,
                    materials: materials || [],
                    projectMaterials,
                    stripPlans,
                  });
                }}
              >
                {isGenerating || checkingQuote ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                )}
                Generate Quote
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
