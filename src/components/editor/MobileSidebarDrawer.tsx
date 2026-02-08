import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Layers,
  Package,
  FileText,
  Square,
  Circle,
  Minus,
  Settings2,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { useMaterials, Material } from '@/hooks/useMaterials';
import { LayersPanel } from './LayersPanel';
import { RoomContextHeader } from './RoomContextHeader';
import { ReportTab } from '@/components/reports/ReportTab';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Separator } from '@/components/ui/separator';
import { calculatePolygonArea, calculateRoomNetArea } from '@/lib/canvas/geometry';
import { cn } from '@/lib/utils';

interface MobileSidebarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMaterialSelect?: (material: Material) => void;
  rooms?: Room[];
  selectedRoomId?: string | null;
  scale?: ScaleCalibration | null;
  onSelectRoom?: (roomId: string | null) => void;
  onDeleteRoom?: (roomId: string) => void;
  onRenameRoom?: (roomId: string, name: string) => void;
  onUpdateRoom?: (roomId: string, updates: Partial<Room>) => void;
  projectName?: string;
  projectAddress?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onUploadFloorPlan?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  initialTab?: string;
}

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

export function MobileSidebarDrawer({
  open,
  onOpenChange,
  onMaterialSelect,
  rooms = [],
  selectedRoomId = null,
  scale = null,
  onSelectRoom,
  onDeleteRoom,
  onRenameRoom,
  onUpdateRoom,
  projectName,
  projectAddress,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onUploadFloorPlan,
  canUndo = false,
  canRedo = false,
  initialTab,
}: MobileSidebarDrawerProps) {
  const [selectedTab, setSelectedTab] = useState(initialTab || 'materials');
  const { data: materials, isLoading } = useMaterials();
  const navigate = useNavigate();

  // Reset tab when opened with initialTab
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && initialTab) {
      setSelectedTab(initialTab);
    }
    onOpenChange(isOpen);
  };

  // Get selected room info
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Calculate takeoff summary
  const takeoffSummary = useMemo(() => {
    if (!scale) return { totalArea: 0, roomCount: rooms.length, estimatedCost: 0, unassignedCount: 0 };

    let totalArea = 0;
    let estimatedCost = 0;
    let unassignedCount = 0;

    rooms.forEach(room => {
      const grossArea = calculatePolygonArea(room.points) * Math.pow(scale.pixelsPerMeter, -2);
      const netArea = calculateRoomNetArea(room, scale);
      totalArea += netArea;

      if (!room.materialId) {
        unassignedCount++;
      } else {
        const material = materials?.find(m => m.id === room.materialId);
        if (material) {
          const specs = material.specs as Record<string, unknown> | undefined;
          const costPerUnit = (specs?.costPerSqm as number) || (specs?.costPerUnit as number) || 0;
          const waste = (room.wastePercent ?? 10) / 100;
          estimatedCost += netArea * (1 + waste) * costPerUnit;
        }
      }
    });

    return { totalArea, roomCount: rooms.length, estimatedCost, unassignedCount };
  }, [rooms, scale, materials]);

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>Project Tools</DrawerTitle>
        </DrawerHeader>

        {/* Quick Actions */}
        <div className="px-4 pb-3 flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={onUndo} disabled={!canUndo}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onRedo} disabled={!canRedo}>
            <Redo className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-8 mx-1" />
          <Button variant="outline" size="icon" onClick={onZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onFitView}>
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-8 mx-1" />
          <Button variant="outline" size="icon" onClick={onUploadFloorPlan}>
            <Image className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="materials" className="text-xs">
                <Package className="w-3 h-3 mr-1" />
                Materials
              </TabsTrigger>
              <TabsTrigger value="takeoff" className="text-xs">
                <ClipboardList className="w-3 h-3 mr-1" />
                Takeoff
              </TabsTrigger>
              <TabsTrigger value="layers" className="text-xs">
                <Layers className="w-3 h-3 mr-1" />
                Layers
              </TabsTrigger>
              <TabsTrigger value="report" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Report
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="materials" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[40vh]">
              <div className="p-4 space-y-2">
                {/* Room Context Header */}
                <RoomContextHeader
                  room={selectedRoom || null}
                  rooms={rooms}
                  materials={materials || []}
                  scale={scale}
                  onSelectRoom={onSelectRoom}
                  compact
                />

                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    Available materials
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/materials');
                    }}
                  >
                    <Settings2 className="w-3 h-3" />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : materials && materials.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {materials.map(material => {
                      const Icon = typeIcons[material.type] || Square;
                      return (
                        <div
                          key={material.id}
                          className="p-3 rounded-lg border border-border bg-background hover:bg-accent/50 active:scale-95 transition-all cursor-pointer"
                          onClick={() => {
                            onMaterialSelect?.(material);
                            onOpenChange(false);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{material.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                  {material.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-2">No materials available</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        navigate('/materials');
                      }}
                    >
                      Add Materials
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Takeoff Tab — room list with areas, materials, costs */}
          <TabsContent value="takeoff" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[40vh]">
              <div className="p-4 space-y-3">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                    <p className="text-lg font-bold font-mono">{takeoffSummary.totalArea.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total m²</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                    <p className="text-lg font-bold font-mono">{takeoffSummary.roomCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rooms</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                    <p className="text-lg font-bold font-mono">${takeoffSummary.estimatedCost.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Cost</p>
                  </div>
                </div>

                {/* Warning for unassigned rooms */}
                {takeoffSummary.unassignedCount > 0 && (
                  <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {takeoffSummary.unassignedCount} room{takeoffSummary.unassignedCount !== 1 ? 's' : ''} without material
                    </p>
                  </div>
                )}

                {/* Room List */}
                {rooms.length > 0 ? (
                  <div className="space-y-1.5">
                    {rooms.map(room => {
                      const material = room.materialId ? materials?.find(m => m.id === room.materialId) : null;
                      const netArea = scale ? calculateRoomNetArea(room, scale) : 0;
                      const waste = room.wastePercent ?? 10;
                      const orderArea = netArea * (1 + waste / 100);
                      const Icon = material ? (typeIcons[material.type] || Square) : Square;
                      const isSelected = room.id === selectedRoomId;

                      return (
                        <div
                          key={room.id}
                          className={cn(
                            'flex items-center gap-2.5 p-2.5 rounded-lg border transition-all active:scale-[0.98] cursor-pointer',
                            isSelected
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border bg-background hover:bg-muted/50'
                          )}
                          onClick={() => {
                            onSelectRoom?.(room.id);
                            onOpenChange(false);
                          }}
                        >
                          {/* Color dot */}
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: room.color || '#888' }}
                          />

                          {/* Room info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{room.name || 'Unnamed'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {material ? (
                                <Badge variant="secondary" className="text-[10px] truncate max-w-[120px]">
                                  {material.name}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                                  No material
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Area */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-mono font-medium">{netArea.toFixed(1)} m²</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {orderArea.toFixed(1)} order
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-1">No rooms yet</p>
                    <p className="text-xs text-muted-foreground">Draw rooms on the canvas to get started</p>
                  </div>
                )}

                {/* Actions */}
                {rooms.length > 0 && (
                  <div className="pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onOpenChange(false);
                        navigate('/quotes');
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Quotes
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="layers" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[40vh]">
              <div className="p-4">
                <LayersPanel
                  rooms={rooms}
                  selectedRoomId={selectedRoomId}
                  scale={scale}
                  materials={materials || []}
                  onSelectRoom={(id) => {
                    onSelectRoom?.(id);
                    onOpenChange(false);
                  }}
                  onDeleteRoom={onDeleteRoom || (() => {})}
                  onRenameRoom={onRenameRoom || (() => {})}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="report" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[40vh]">
              <ReportTab
                rooms={rooms}
                materials={materials || []}
                scale={scale}
                projectName={projectName}
                projectAddress={projectAddress}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
