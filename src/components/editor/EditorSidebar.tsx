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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Layers, 
  Package, 
  FileText,
  ChevronRight,
  Square,
  Circle,
  Minus,
  Settings2,
  Tag,
  Wrench,
  Scissors,
  LayoutGrid
} from 'lucide-react';
import { useMaterials, Material } from '@/hooks/useMaterials';
import { LayersPanel } from './LayersPanel';
import { AccessoriesPanel } from './AccessoriesPanel';
import { SeamEditor } from './SeamEditor';
import { TilePatternViewer } from './TilePatternViewer';
import { RoomContextHeader } from './RoomContextHeader';
import { ReportTab, DropAllocationsMap } from '@/components/reports/ReportTab';
import { Room, ScaleCalibration, RoomAccessories } from '@/lib/canvas/types';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { TileSpecs, TilePattern } from '@/lib/tiles/types';
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
  onNavigatePrevRoom?: () => void;
  onNavigateNextRoom?: () => void;
  projectName?: string;
  projectAddress?: string;
  stripPlans?: Map<string, StripPlanResult>;
  onRecalculateStripPlan?: (roomId: string) => void;
  dropAllocations?: DropAllocationsMap;
  onDropAllocationsChange?: (allocations: DropAllocationsMap) => void;
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
  onNavigatePrevRoom,
  onNavigateNextRoom,
  projectName,
  projectAddress,
  stripPlans,
  onRecalculateStripPlan,
  dropAllocations = {},
  onDropAllocationsChange,
}: EditorSidebarProps) {
  const [selectedTab, setSelectedTab] = useState('materials');
  const { data: materials, isLoading } = useMaterials();
  const navigate = useNavigate();
  
  // Get selected room for material code editing
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedRoomMaterial = selectedRoom?.materialId 
    ? materials?.find(m => m.id === selectedRoom.materialId) 
    : null;
  
  // Check if selected room has roll material (for seam editor)
  const hasRollMaterial = selectedRoomMaterial?.type === 'roll';
  const hasTileMaterial = selectedRoomMaterial?.type === 'tile';
  const selectedRoomStripPlan = selectedRoom ? stripPlans?.get(selectedRoom.id) : undefined;
  
  // Extract tile specs for tile pattern viewer
  const tileSpecs: TileSpecs | null = hasTileMaterial && selectedRoomMaterial?.specs ? {
    widthMm: (selectedRoomMaterial.specs.widthMm as number) || (selectedRoomMaterial.specs.width as number) || 300,
    lengthMm: (selectedRoomMaterial.specs.lengthMm as number) || (selectedRoomMaterial.specs.length as number) || 300,
    groutWidthMm: (selectedRoomMaterial.specs.groutWidthMm as number) || 3,
    pricePerM2: (selectedRoomMaterial.specs.pricePerM2 as number) || (selectedRoomMaterial.specs.price as number),
    tilesPerBox: selectedRoomMaterial.specs.tilesPerBox as number | undefined,
    pricePerBox: selectedRoomMaterial.specs.pricePerBox as number | undefined,
  } : null;

  return (
    <div 
      className={cn(
        "h-full border-l border-border bg-card flex flex-col z-20 shrink-0 transition-all duration-200 overflow-hidden",
        collapsed ? "w-12" : "w-72"
      )}
    >
      {collapsed ? (
        // Collapsed state - icons only with tooltips
        <div className="flex flex-col items-center py-2 gap-1 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggle}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Expand sidebar</p>
            </TooltipContent>
          </Tooltip>
          <Separator className="my-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={selectedTab === 'materials' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => { setSelectedTab('materials'); onToggle?.(); }}
              >
                <Package className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Materials</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={selectedTab === 'accessories' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => { setSelectedTab('accessories'); onToggle?.(); }}
              >
                <Wrench className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Accessories</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={selectedTab === 'seams' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => { setSelectedTab('seams'); onToggle?.(); }}
              >
                <Scissors className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Seam Editor</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={selectedTab === 'tiles' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => { setSelectedTab('tiles'); onToggle?.(); }}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Tile Patterns</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={selectedTab === 'layers' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => { setSelectedTab('layers'); onToggle?.(); }}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Layers</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={selectedTab === 'report' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => { setSelectedTab('report'); onToggle?.(); }}
              >
                <FileText className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Report</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        // Expanded state - full sidebar with tabs
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex flex-col h-full">
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <TabsList className="flex-1 grid grid-cols-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="materials" className="text-xs px-1">
                      <Package className="w-3 h-3" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Materials</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="accessories" className="text-xs px-1">
                      <Wrench className="w-3 h-3" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Accessories</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="seams" className="text-xs px-1">
                      <Scissors className="w-3 h-3" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Seam Editor</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="tiles" className="text-xs px-1">
                      <LayoutGrid className="w-3 h-3" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tile Patterns</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="layers" className="text-xs px-1">
                      <Layers className="w-3 h-3" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Layers</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="report" className="text-xs px-1">
                      <FileText className="w-3 h-3" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Report</p>
                  </TooltipContent>
                </Tooltip>
              </TabsList>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggle}>
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Collapse sidebar</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <TabsContent value="materials" className="flex-1 m-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {/* Room Context Header */}
                <RoomContextHeader
                  room={selectedRoom || null}
                  rooms={rooms}
                  materials={materials || []}
                  scale={scale}
                  onSelectRoom={onSelectRoom}
                  onNavigatePrev={onNavigatePrevRoom}
                  onNavigateNext={onNavigateNextRoom}
                />

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

          <TabsContent value="accessories" className="flex-1 m-0">
            {selectedRoom ? (
              <AccessoriesPanel
                room={selectedRoom}
                scale={scale}
                materials={materials || []}
                onUpdateAccessories={(accessories: RoomAccessories) => {
                  onUpdateRoom?.(selectedRoom.id, { accessories });
                }}
                stripPlan={selectedRoomStripPlan}
              />
            ) : (
              <ScrollArea className="h-full">
                <div className="p-3">
                  <RoomContextHeader
                    room={null}
                    rooms={rooms}
                    materials={materials || []}
                    scale={scale}
                    onSelectRoom={onSelectRoom}
                  />
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="seams" className="flex-1 m-0">
            {selectedRoom && hasRollMaterial ? (
              <SeamEditor
                room={selectedRoom}
                scale={scale}
                stripPlan={selectedRoomStripPlan || null}
                fillDirection={selectedRoom.fillDirection || 0}
                onFillDirectionChange={(direction) => {
                  onUpdateRoom?.(selectedRoom.id, { fillDirection: direction });
                }}
                manualSeams={selectedRoom.seamOptions?.manualSeams || []}
                onManualSeamsChange={(seams) => {
                  onUpdateRoom?.(selectedRoom.id, { 
                    seamOptions: { 
                      ...selectedRoom.seamOptions, 
                      manualSeams: seams 
                    } 
                  });
                }}
                avoidZones={selectedRoom.seamOptions?.avoidZones || []}
                onAvoidZonesChange={(zones) => {
                  onUpdateRoom?.(selectedRoom.id, { 
                    seamOptions: { 
                      ...selectedRoom.seamOptions, 
                      avoidZones: zones 
                    } 
                  });
                }}
                firstSeamOffset={selectedRoom.seamOptions?.firstSeamOffset || 0}
                onFirstSeamOffsetChange={(offset) => {
                  onUpdateRoom?.(selectedRoom.id, { 
                    seamOptions: { 
                      ...selectedRoom.seamOptions, 
                      firstSeamOffset: offset 
                    } 
                  });
                }}
                materialWidth={selectedRoomMaterial?.specs?.rollWidthMm || 3660}
                onRecalculate={() => {
                  if (selectedRoom) {
                    onRecalculateStripPlan?.(selectedRoom.id);
                  }
                }}
              />
            ) : selectedRoom ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                <p>Seam editing is for roll materials only.</p>
                <p className="text-xs mt-1">Assign a carpet or vinyl material to this room.</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-3">
                  <RoomContextHeader
                    room={null}
                    rooms={rooms}
                    materials={materials || []}
                    scale={scale}
                    onSelectRoom={onSelectRoom}
                  />
                  {selectedRoom && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Seam editing is for roll materials. Assign a carpet or vinyl to this room.
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="tiles" className="flex-1 m-0 overflow-auto">
            {selectedRoom && hasTileMaterial && tileSpecs ? (
              <div className="p-3">
                <TilePatternViewer
                  room={selectedRoom}
                  tileSpecs={tileSpecs}
                  scale={scale}
                  onPatternChange={(pattern: TilePattern) => {
                    onUpdateRoom?.(selectedRoom.id, { 
                      tilePattern: pattern 
                    } as Partial<Room>);
                  }}
                />
              </div>
            ) : selectedRoom ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                <p>Tile patterns are for tile materials only.</p>
                <p className="text-xs mt-1">Assign a tile material to this room.</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-3">
                  <RoomContextHeader
                    room={null}
                    rooms={rooms}
                    materials={materials || []}
                    scale={scale}
                    onSelectRoom={onSelectRoom}
                  />
                  {selectedRoom && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Tile patterns are for tile materials. Assign a tile to this room.
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="layers" className="flex-1 m-0 overflow-hidden">
            <LayersPanel
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              scale={scale}
              materials={materials || []}
              onSelectRoom={onSelectRoom || (() => {})}
              onDeleteRoom={onDeleteRoom || (() => {})}
              onRenameRoom={onRenameRoom || (() => {})}
            />
          </TabsContent>

          <TabsContent value="report" className="flex-1 m-0 overflow-hidden">
            <ReportTab
              rooms={rooms}
              materials={materials || []}
              scale={scale}
              projectName={projectName}
              projectAddress={projectAddress}
              dropAllocations={dropAllocations}
              onDropAllocationsChange={onDropAllocationsChange}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
