import { Trash2, GripVertical, Check, AlertTriangle, Square, Circle, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Room } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { calculateRoomNetArea, mmSquaredToMSquared, pixelAreaToRealArea } from '@/lib/canvas/geometry';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

interface LayersPanelProps {
  rooms: Room[];
  selectedRoomId: string | null;
  scale: { pixelLength: number; realWorldLength: number; pixelsPerMm: number } | null;
  materials?: Material[];
  onSelectRoom: (roomId: string | null) => void;
  onDeleteRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, name: string) => void;
}

export function LayersPanel({
  rooms,
  selectedRoomId,
  scale,
  materials = [],
  onSelectRoom,
  onDeleteRoom,
  onRenameRoom,
}: LayersPanelProps) {
  const formatArea = (room: Room): string => {
    const pixelArea = calculateRoomNetArea(room);
    if (scale) {
      const realArea = mmSquaredToMSquared(pixelAreaToRealArea(pixelArea, scale));
      return `${realArea.toFixed(2)} m²`;
    }
    return `${(pixelArea / 10000).toFixed(1)} units²`;
  };

  const getMaterial = (room: Room): Material | undefined => {
    return room.materialId ? materials.find(m => m.id === room.materialId) : undefined;
  };

  // Room status summary
  const roomsWithMaterial = rooms.filter(r => r.materialId).length;
  const roomsWithoutMaterial = rooms.length - roomsWithMaterial;

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <div className="text-muted-foreground text-sm">
          No rooms yet
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Use the Draw tool to create rooms
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Room status summary */}
      <div className="px-2 py-2 text-xs text-muted-foreground border-b border-border">
        <span>{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
        {roomsWithMaterial > 0 && (
          <span className="text-primary ml-1">• {roomsWithMaterial} with materials</span>
        )}
        {roomsWithoutMaterial > 0 && (
          <span className="text-amber-500 ml-1">• {roomsWithoutMaterial} unassigned</span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-1">
          {rooms.map((room) => {
            const material = getMaterial(room);
            const TypeIcon = material ? typeIcons[material.type] || Square : null;
            
            return (
              <div
                key={room.id}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
                  selectedRoomId === room.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50',
                  !room.materialId && 'border-l-2 border-l-amber-500/50'
                )}
                onClick={() => onSelectRoom(room.id)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-grab" />
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Drag to reorder</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="w-4 h-4 rounded-sm border flex-shrink-0"
                      style={{ backgroundColor: room.color }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Room color</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={room.name}
                      onChange={(e) => onRenameRoom(room.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 text-sm bg-transparent border-none p-0 focus-visible:ring-0 flex-1"
                    />
                    {/* Material status indicator */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {material ? (
                          <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{material ? 'Material assigned' : 'No material assigned'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatArea(room)}
                    </span>
                    {material && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 capitalize">
                        {TypeIcon && <TypeIcon className="w-2.5 h-2.5 mr-0.5" />}
                        {material.type}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRoom(room.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Delete room</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
