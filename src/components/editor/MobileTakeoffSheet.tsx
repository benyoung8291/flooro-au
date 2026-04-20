import { useMemo, useRef, useState, useEffect } from 'react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { calculateRoomNetArea, pixelAreaToRealArea } from '@/lib/canvas/geometry';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTakeoffSheetProps {
  rooms: Room[];
  selectedRoomId: string | null;
  scale: ScaleCalibration | null;
  materials: Material[];
  onSelectRoom: (id: string) => void;
  onExpand: () => void;
}

/**
 * Peek-then-swipe-up bottom sheet showing aggregate takeoff at the bottom of
 * the screen. Tapping the handle or summary opens the full takeoff drawer.
 * Sits above the MobileNav (bottom-16).
 */
export function MobileTakeoffSheet({
  rooms,
  selectedRoomId,
  scale,
  materials,
  onSelectRoom,
  onExpand,
}: MobileTakeoffSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const startYRef = useRef<number | null>(null);

  // Auto-collapse when room count drops to 0
  useEffect(() => {
    if (rooms.length === 0) setExpanded(false);
  }, [rooms.length]);

  const summary = useMemo(() => {
    if (!scale) return { totalArea: 0, orderArea: 0, unassigned: 0 };
    let totalArea = 0;
    let orderArea = 0;
    let unassigned = 0;
    rooms.forEach(room => {
      const net = pixelAreaToRealArea(calculateRoomNetArea(room), scale) / 1_000_000;
      const waste = (room.wastePercent ?? 10) / 100;
      totalArea += net;
      orderArea += net * (1 + waste);
      if (!room.materialId) unassigned++;
    });
    return { totalArea, orderArea, unassigned };
  }, [rooms, scale]);

  if (rooms.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startYRef.current == null) return;
    const dy = e.changedTouches[0].clientY - startYRef.current;
    startYRef.current = null;
    if (dy < -40) {
      // Swipe up — open full drawer
      setExpanded(false);
      onExpand();
    } else if (dy > 40) {
      setExpanded(false);
    }
  };

  return (
    <div className="fixed left-0 right-0 bottom-16 z-30 pointer-events-none">
      <div
        className={cn(
          'mx-auto max-w-lg rounded-t-2xl border border-b-0 border-border bg-card/95 backdrop-blur-md shadow-xl pointer-events-auto transition-all duration-200',
          expanded ? 'h-[40vh]' : 'h-auto'
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle + summary row */}
        <button
          type="button"
          className="w-full flex flex-col items-center px-3 pt-1.5 pb-2"
          onClick={() => {
            if (expanded) setExpanded(false);
            else onExpand();
          }}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
          <div className="w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</p>
                <p className="text-sm font-mono font-semibold tabular-nums">
                  {summary.totalArea.toFixed(1)} m²
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order</p>
                <p className="text-sm font-mono font-semibold tabular-nums">
                  {summary.orderArea.toFixed(1)} m²
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rooms</p>
                <p className="text-sm font-mono font-semibold tabular-nums">{rooms.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {summary.unassigned > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3 h-3" />
                  {summary.unassigned}
                </Badge>
              )}
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </button>

        {/* Expanded room list */}
        {expanded && (
          <ScrollArea className="h-[calc(40vh-3.5rem)] px-3 pb-3">
            <div className="space-y-1.5">
              {rooms.map(room => {
                const material = room.materialId ? materials.find(m => m.id === room.materialId) : null;
                const net = scale ? pixelAreaToRealArea(calculateRoomNetArea(room), scale) / 1_000_000 : 0;
                const isSelected = room.id === selectedRoomId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors',
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-background active:bg-muted'
                    )}
                    onClick={() => {
                      onSelectRoom(room.id);
                      setExpanded(false);
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: room.color || 'hsl(var(--muted-foreground))' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{room.name || 'Unnamed'}</p>
                      {material ? (
                        <p className="text-[10px] text-muted-foreground truncate">{material.name}</p>
                      ) : (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">No material</p>
                      )}
                    </div>
                    <p className="text-xs font-mono tabular-nums shrink-0">
                      {net.toFixed(1)} m²
                    </p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
