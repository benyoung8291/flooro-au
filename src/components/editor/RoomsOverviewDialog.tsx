import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Check,
  AlertTriangle,
  Trash2,
  Palette,
  ChevronDown,
  Search,
  LayoutGrid,
  List,
  Package,
  Square,
  Circle,
  Minus,
} from 'lucide-react';
import { Room, ScaleCalibration, ProjectMaterial } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { calculateRoomNetArea, mmSquaredToMSquared, pixelAreaToRealArea, calculatePerimeter } from '@/lib/canvas/geometry';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

interface RoomsOverviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
  materials: Material[];
  projectMaterials?: ProjectMaterial[];
  scale: ScaleCalibration | null;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onDeleteRoom: (roomId: string) => void;
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => void;
  onBulkAssignMaterial: (roomIds: string[], materialId: string) => void;
}

export function RoomsOverviewDialog({
  open,
  onOpenChange,
  rooms,
  materials,
  projectMaterials = [],
  scale,
  selectedRoomId,
  onSelectRoom,
  onDeleteRoom,
  onUpdateRoom,
  onBulkAssignMaterial,
}: RoomsOverviewDialogProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [bulkMaterialOpen, setBulkMaterialOpen] = useState(false);

  // Build a lookup from materialId to projectMaterial code
  const projectMaterialMap = useMemo(() => 
    new Map(projectMaterials.map(pm => [pm.id, pm])),
    [projectMaterials]
  );

  // Filter rooms by search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery) return rooms;
    const query = searchQuery.toLowerCase();
    return rooms.filter(room => {
      const pm = room.materialId ? projectMaterialMap.get(room.materialId) : null;
      return room.name.toLowerCase().includes(query) ||
        pm?.materialCode?.toLowerCase().includes(query);
    });
  }, [rooms, searchQuery, projectMaterialMap]);

  // Stats
  const roomsWithMaterial = rooms.filter(r => r.materialId).length;
  const roomsWithAccessories = rooms.filter(r => 
    r.accessories && Object.values(r.accessories).some(a => a && (a as any).enabled)
  ).length;

  const formatArea = (room: Room): string => {
    const pixelArea = calculateRoomNetArea(room);
    if (scale) {
      const realArea = mmSquaredToMSquared(pixelAreaToRealArea(pixelArea, scale));
      return `${realArea.toFixed(2)} m²`;
    }
    return `${(pixelArea / 10000).toFixed(1)} units²`;
  };

  const formatPerimeter = (room: Room): string => {
    const perimeterPixels = calculatePerimeter(room.points);
    if (scale) {
      const perimeterMm = perimeterPixels / scale.pixelsPerMm;
      return `${(perimeterMm / 1000).toFixed(2)} m`;
    }
    return `${(perimeterPixels / 100).toFixed(1)} units`;
  };

  const getMaterial = (room: Room): Material | undefined => {
    return room.materialId ? materials.find(m => m.id === room.materialId) : undefined;
  };

  const toggleRoomSelection = (roomId: string) => {
    const newSelection = new Set(selectedRoomIds);
    if (newSelection.has(roomId)) {
      newSelection.delete(roomId);
    } else {
      newSelection.add(roomId);
    }
    setSelectedRoomIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedRoomIds.size === filteredRooms.length) {
      setSelectedRoomIds(new Set());
    } else {
      setSelectedRoomIds(new Set(filteredRooms.map(r => r.id)));
    }
  };

  const handleBulkAssignMaterial = (materialId: string) => {
    if (selectedRoomIds.size === 0) return;
    onBulkAssignMaterial(Array.from(selectedRoomIds), materialId);
    setSelectedRoomIds(new Set());
    setBulkMaterialOpen(false);
  };

  const handleBulkDelete = () => {
    if (selectedRoomIds.size === 0) return;
    selectedRoomIds.forEach(id => onDeleteRoom(id));
    setSelectedRoomIds(new Set());
  };

  const handleRowClick = (roomId: string) => {
    onSelectRoom(roomId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">All Rooms</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {rooms.length} room{rooms.length !== 1 ? 's' : ''} • 
                <span className="text-primary ml-1">{roomsWithMaterial} with materials</span> • 
                <span className="ml-1">{roomsWithAccessories} with accessories</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border border-border rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Bulk Actions */}
          {selectedRoomIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">
                {selectedRoomIds.size} selected
              </span>
              
              <DropdownMenu open={bulkMaterialOpen} onOpenChange={setBulkMaterialOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Palette className="w-4 h-4 mr-2" />
                    Assign Material
                    <ChevronDown className="w-3 h-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <ScrollArea className="max-h-60">
                    {materials.map(material => {
                      const TypeIcon = typeIcons[material.type] || Square;
                      return (
                        <DropdownMenuItem
                          key={material.id}
                          onClick={() => handleBulkAssignMaterial(material.id)}
                        >
                          <TypeIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span className="flex-1 truncate">{material.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs capitalize">
                            {material.type}
                          </Badge>
                        </DropdownMenuItem>
                      );
                    })}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Square className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">
                {rooms.length === 0 ? 'No rooms yet' : 'No matching rooms'}
              </p>
              <p className="text-xs text-muted-foreground">
                {rooms.length === 0 
                  ? 'Use the Draw tool to create rooms' 
                  : 'Try a different search term'}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-1">
              {/* Header Row */}
              <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
                <Checkbox
                  checked={selectedRoomIds.size === filteredRooms.length && filteredRooms.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="mr-1"
                />
                <span className="w-8"></span>
                <span className="flex-1">Room</span>
                <span className="w-24 text-right">Area</span>
                <span className="w-24 text-right">Perimeter</span>
                <span className="w-32">Material</span>
                <span className="w-20 text-center">Status</span>
                <span className="w-16"></span>
              </div>

              {/* Room Rows */}
              {filteredRooms.map(room => {
                const material = getMaterial(room);
                const TypeIcon = material ? typeIcons[material.type] || Square : null;
                const isSelected = selectedRoomIds.has(room.id);
                const hasAccessories = room.accessories && 
                  Object.values(room.accessories).some(a => a && (a as any).enabled);

                return (
                  <div
                    key={room.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
                      selectedRoomId === room.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50',
                      isSelected && 'bg-primary/5'
                    )}
                    onClick={() => handleRowClick(room.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRoomSelection(room.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mr-1"
                    />
                    <div
                      className="w-6 h-6 rounded border flex-shrink-0"
                      style={{ backgroundColor: room.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{room.name}</span>
                        {(() => {
                          const pm = room.materialId ? projectMaterialMap.get(room.materialId) : null;
                          return pm?.materialCode ? (
                            <Badge variant="outline" className="text-xs font-mono">
                              {pm.materialCode}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <span className="w-24 text-right text-sm tabular-nums">
                      {formatArea(room)}
                    </span>
                    <span className="w-24 text-right text-sm text-muted-foreground tabular-nums">
                      {formatPerimeter(room)}
                    </span>
                    <div className="w-32">
                      {material ? (
                        <div className="flex items-center gap-1.5">
                          {TypeIcon && <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="text-sm truncate">{material.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="w-20 flex justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger>
                          {material ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {material ? 'Material assigned' : 'No material'}
                        </TooltipContent>
                      </Tooltip>
                      {hasAccessories && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Package className="w-4 h-4 text-primary" />
                          </TooltipTrigger>
                          <TooltipContent>Accessories configured</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="w-16 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRoom(room.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredRooms.map(room => {
                const material = getMaterial(room);
                const TypeIcon = material ? typeIcons[material.type] || Square : null;
                const isSelected = selectedRoomIds.has(room.id);

                return (
                  <div
                    key={room.id}
                    className={cn(
                      'relative p-4 rounded-lg border transition-all cursor-pointer',
                      selectedRoomId === room.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30',
                      isSelected && 'ring-2 ring-primary/30'
                    )}
                    onClick={() => handleRowClick(room.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRoomSelection(room.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2"
                    />
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-5 h-5 rounded border"
                        style={{ backgroundColor: room.color }}
                      />
                      <span className="font-medium truncate flex-1">{room.name}</span>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Area</span>
                        <span className="tabular-nums">{formatArea(room)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Perimeter</span>
                        <span className="tabular-nums">{formatPerimeter(room)}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border">
                      {material ? (
                        <div className="flex items-center gap-1.5">
                          {TypeIcon && <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="text-sm truncate">{material.name}</span>
                          <Check className="w-3.5 h-3.5 text-primary ml-auto" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-sm">No material</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
