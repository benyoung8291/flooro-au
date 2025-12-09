import { ChevronLeft, ChevronRight, Package, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { calculateRoomNetArea, mmSquaredToMSquared, pixelAreaToRealArea, calculatePerimeter } from '@/lib/canvas/geometry';
import { Material } from '@/hooks/useMaterials';
import { cn } from '@/lib/utils';

interface RoomContextHeaderProps {
  room: Room | null;
  rooms: Room[];
  materials: Material[];
  scale: ScaleCalibration | null;
  onSelectRoom?: (roomId: string | null) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  compact?: boolean;
}

export function RoomContextHeader({
  room,
  rooms,
  materials,
  scale,
  onSelectRoom,
  onNavigatePrev,
  onNavigateNext,
  compact = false,
}: RoomContextHeaderProps) {
  const material = room?.materialId
    ? materials.find(m => m.id === room.materialId)
    : null;

  const formatArea = (r: Room): string => {
    const pixelArea = calculateRoomNetArea(r);
    if (scale) {
      const realArea = mmSquaredToMSquared(pixelAreaToRealArea(pixelArea, scale));
      return `${realArea.toFixed(2)} m²`;
    }
    return `${(pixelArea / 10000).toFixed(1)} units²`;
  };

  const formatPerimeter = (r: Room): string => {
    const pixelPerimeter = calculatePerimeter(r.points);
    if (scale) {
      const realPerimeter = pixelPerimeter / scale.pixelsPerMm / 1000;
      return `${realPerimeter.toFixed(2)} m`;
    }
    return `${Math.round(pixelPerimeter)} px`;
  };

  // Count rooms with/without materials
  const roomsWithMaterial = rooms.filter(r => r.materialId).length;
  const roomsWithoutMaterial = rooms.length - roomsWithMaterial;

  // When no room is selected
  if (!room) {
    return (
      <div className="p-3 rounded-lg border border-border bg-muted/50">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">No room selected</span>
        </div>
        
        {/* Room status summary */}
        {rooms.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {rooms.length} room{rooms.length !== 1 ? 's' : ''} • 
              {roomsWithMaterial > 0 && <span className="text-primary"> {roomsWithMaterial} with materials</span>}
              {roomsWithoutMaterial > 0 && <span className="text-amber-500"> • {roomsWithoutMaterial} need assignment</span>}
            </p>
            
            {/* Quick room selection */}
            <div className="flex flex-wrap gap-1">
              {rooms.slice(0, 6).map(r => {
                const hasMaterial = !!r.materialId;
                return (
                  <Button
                    key={r.id}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      !hasMaterial && "border-amber-500/50"
                    )}
                    onClick={() => onSelectRoom?.(r.id)}
                  >
                    <div 
                      className="w-2 h-2 rounded-sm mr-1.5 flex-shrink-0"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="truncate max-w-[60px]">{r.name}</span>
                    {hasMaterial ? (
                      <Check className="w-3 h-3 ml-1 text-primary" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 ml-1 text-amber-500" />
                    )}
                  </Button>
                );
              })}
              {rooms.length > 6 && (
                <span className="text-xs text-muted-foreground self-center ml-1">
                  +{rooms.length - 6} more
                </span>
              )}
            </div>
          </>
        )}
        
        {rooms.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Use the Draw tool to create rooms
          </p>
        )}
      </div>
    );
  }

  // When a room is selected
  return (
    <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
      {/* Room header with navigation */}
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-4 h-4 rounded-sm flex-shrink-0 border border-border"
          style={{ backgroundColor: room.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{room.name}</p>
        </div>
        
        {/* Room navigation arrows */}
        {rooms.length > 1 && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onNavigatePrev}
              title="Previous room ([ key)"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onNavigateNext}
              title="Next room (] key)"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Room metrics */}
      {!compact && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span>📐 {formatArea(room)}</span>
          <span>📏 {formatPerimeter(room)} perimeter</span>
        </div>
      )}

      {/* Doors and holes */}
      {!compact && (room.doors.length > 0 || room.holes.length > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          {room.doors.length > 0 && (
            <span>🚪 {room.doors.length} door{room.doors.length > 1 ? 's' : ''}</span>
          )}
          {room.holes.length > 0 && (
            <span>⬜ {room.holes.length} hole{room.holes.length > 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* Material info */}
      <div className="flex items-center gap-2">
        {material ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {material.type}
              </Badge>
              <span className="text-xs font-medium truncate">{material.name}</span>
              {room.materialCode && (
                <Badge variant="outline" className="text-xs font-mono">
                  {room.materialCode}
                </Badge>
              )}
            </div>
            {(material.specs.range || material.specs.colour) && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {material.specs.range}{material.specs.range && material.specs.colour && ' • '}{material.specs.colour}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-500">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium">No material assigned</span>
          </div>
        )}
      </div>

      {/* Action hint */}
      {!material && (
        <p className="text-xs text-primary mt-2">Tap a material below to assign</p>
      )}
    </div>
  );
}
