import { useState } from 'react';
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
  Image
} from 'lucide-react';
import { useMaterials, Material } from '@/hooks/useMaterials';
import { LayersPanel } from './LayersPanel';
import { ReportTab } from '@/components/reports/ReportTab';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Separator } from '@/components/ui/separator';

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
}: MobileSidebarDrawerProps) {
  const [selectedTab, setSelectedTab] = useState('materials');
  const { data: materials, isLoading } = useMaterials();
  const navigate = useNavigate();

  // Get selected room info
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedRoomMaterial = selectedRoom?.materialId 
    ? materials?.find(m => m.id === selectedRoom.materialId) 
    : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
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
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="materials" className="text-xs">
                <Package className="w-3 h-3 mr-1" />
                Materials
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
                {/* Selected Room Indicator */}
                {selectedRoom ? (
                  <div className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: selectedRoom.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedRoom.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedRoomMaterial ? selectedRoomMaterial.name : 'No material'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-primary mt-2">Tap a material below to assign</p>
                  </div>
                ) : (
                  <div className="mb-3 p-3 rounded-lg border border-border bg-muted/50">
                    <p className="text-sm text-muted-foreground text-center">
                      No room selected
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Close drawer, tap a room, then return here
                    </p>
                    {/* Quick room selection */}
                    {rooms.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1 justify-center">
                        {rooms.slice(0, 4).map(room => (
                          <Button
                            key={room.id}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onSelectRoom?.(room.id)}
                          >
                            <div 
                              className="w-2 h-2 rounded-sm mr-1.5"
                              style={{ backgroundColor: room.color }}
                            />
                            {room.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
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

          <TabsContent value="layers" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[40vh]">
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-3">
                  {rooms.length} room{rooms.length !== 1 ? 's' : ''} • Tap to select
                </p>
                <LayersPanel
                  rooms={rooms}
                  selectedRoomId={selectedRoomId}
                  scale={scale}
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