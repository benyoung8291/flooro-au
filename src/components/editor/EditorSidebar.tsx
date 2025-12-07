import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Layers, 
  Package, 
  FileText,
  ChevronRight,
  Square,
  Circle,
  Minus,
  Settings2,
  Tag
} from 'lucide-react';
import { useMaterials, Material } from '@/hooks/useMaterials';
import { LayersPanel } from './LayersPanel';
import { ReportTab } from '@/components/reports/ReportTab';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { cn } from '@/lib/utils';

interface EditorSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
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
}

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

export function EditorSidebar({ 
  collapsed, 
  onToggle, 
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
}: EditorSidebarProps) {
  const [selectedTab, setSelectedTab] = useState('materials');
  const { data: materials, isLoading } = useMaterials();
  const navigate = useNavigate();
  
  // Get selected room for material code editing
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedRoomMaterial = selectedRoom?.materialId 
    ? materials?.find(m => m.id === selectedRoom.materialId) 
    : null;

  return (
    <div 
      className={cn(
        "h-full border-l border-border bg-card flex flex-col z-20 shrink-0 transition-all duration-200 overflow-hidden",
        collapsed ? "w-12" : "w-72"
      )}
    >
      {collapsed ? (
        // Collapsed state - icons only
        <div className="flex flex-col items-center py-2 gap-1 w-full">
          <Button variant="ghost" size="icon" onClick={onToggle} title="Expand sidebar">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Separator className="my-2" />
          <Button 
            variant={selectedTab === 'materials' ? 'secondary' : 'ghost'} 
            size="icon"
            onClick={() => { setSelectedTab('materials'); onToggle?.(); }}
          >
            <Package className="w-4 h-4" />
          </Button>
          <Button 
            variant={selectedTab === 'layers' ? 'secondary' : 'ghost'} 
            size="icon"
            onClick={() => { setSelectedTab('layers'); onToggle?.(); }}
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button 
            variant={selectedTab === 'report' ? 'secondary' : 'ghost'} 
            size="icon"
            onClick={() => { setSelectedTab('report'); onToggle?.(); }}
          >
            <FileText className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        // Expanded state - full sidebar with tabs
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex flex-col h-full">
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <TabsList className="flex-1 grid grid-cols-3">
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
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggle} title="Collapse sidebar">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </div>

          <TabsContent value="materials" className="flex-1 m-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
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
                          {selectedRoomMaterial ? selectedRoomMaterial.name : 'No material assigned'}
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
                      Select a room on canvas or from Layers tab
                    </p>
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
                    onClick={() => navigate('/materials')}
                  >
                    <Settings2 className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Selected Room Material Code */}
                {selectedRoom && selectedRoomMaterial && (
                  <div className="mb-4 p-3 rounded-lg border border-border bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-xs">Finishes Schedule Code</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={selectedRoom.materialCode || ''}
                        onChange={(e) => onUpdateRoom?.(selectedRoom.id, { materialCode: e.target.value.toUpperCase() })}
                        placeholder="e.g., CP01"
                        className="h-8 text-xs font-mono uppercase"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {selectedRoom.name}: {selectedRoomMaterial.name}
                    </p>
                  </div>
                )}
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : materials && materials.length > 0 ? (
                  materials.map(material => {
                    const Icon = typeIcons[material.type] || Square;
                    return (
                      <div
                        key={material.id}
                        className="p-3 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors"
                        onClick={() => onMaterialSelect?.(material)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('materialId', material.id);
                          e.dataTransfer.setData('materialType', material.type);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{material.name}</p>
                            {(material.specs.range || material.specs.colour) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {material.specs.range}{material.specs.range && material.specs.colour && ' • '}{material.specs.colour}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {material.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                ${(material.specs.pricePerM2 || material.specs.price || 0).toFixed(2)}/m²
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-2">No materials available</p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/materials')}>
                      Add Materials
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="layers" className="flex-1 m-0">
            <div className="p-3">
              <p className="text-xs text-muted-foreground mb-3">
                {rooms.length} room{rooms.length !== 1 ? 's' : ''} • Click to select
              </p>
              <LayersPanel
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                scale={scale}
                onSelectRoom={onSelectRoom || (() => {})}
                onDeleteRoom={onDeleteRoom || (() => {})}
                onRenameRoom={onRenameRoom || (() => {})}
              />
            </div>
          </TabsContent>

          <TabsContent value="report" className="flex-1 m-0 overflow-hidden">
            <ReportTab
              rooms={rooms}
              materials={materials || []}
              scale={scale}
              projectName={projectName}
              projectAddress={projectAddress}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
