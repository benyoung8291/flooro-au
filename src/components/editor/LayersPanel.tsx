import { Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Room } from '@/lib/canvas/types';
import { calculateRoomNetArea, mmSquaredToMSquared, pixelAreaToRealArea } from '@/lib/canvas/geometry';
import { cn } from '@/lib/utils';

interface LayersPanelProps {
  rooms: Room[];
  selectedRoomId: string | null;
  scale: { pixelLength: number; realWorldLength: number; pixelsPerMm: number } | null;
  onSelectRoom: (roomId: string | null) => void;
  onDeleteRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, name: string) => void;
}

export function LayersPanel({
  rooms,
  selectedRoomId,
  scale,
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
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-1 p-1">
        {rooms.map((room, index) => (
          <div
            key={room.id}
            className={cn(
              'group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
              selectedRoomId === room.id
                ? 'bg-primary/10 border border-primary/20'
                : 'hover:bg-muted/50'
            )}
            onClick={() => onSelectRoom(room.id)}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div
              className="w-4 h-4 rounded-sm border"
              style={{ backgroundColor: room.color }}
            />
            
            <div className="flex-1 min-w-0">
              <Input
                value={room.name}
                onChange={(e) => onRenameRoom(room.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-6 text-sm bg-transparent border-none p-0 focus-visible:ring-0"
              />
              <div className="text-xs text-muted-foreground">
                {formatArea(room)}
                {room.holes.length > 0 && ` • ${room.holes.length} hole${room.holes.length > 1 ? 's' : ''}`}
                {room.doors.length > 0 && ` • ${room.doors.length} door${room.doors.length > 1 ? 's' : ''}`}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRoom(room.id);
              }}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
