import { CanvasPoint, Room, EdgeTransition } from '@/lib/canvas/types';
import { Trash2, Pencil, ArrowRight, RotateCw, Palette, Scissors, ArrowRightLeft } from 'lucide-react';

export interface ContextTarget {
  type: 'room' | 'edge' | 'hole' | 'canvas';
  roomId?: string;
  holeId?: string;
  edgeIndex?: number;
  point: CanvasPoint;
}

interface CanvasContextMenuProps {
  target: ContextTarget | null;
  position: { x: number; y: number } | null;
  rooms: Room[];
  onClose: () => void;
  onDeleteRoom?: (roomId: string) => void;
  onDeleteHole?: (roomId: string, holeId: string) => void;
  onEditRoom?: (roomId: string) => void;
  onRotateFillDirection?: (roomId: string) => void;
  onToggleTransition?: (roomId: string, edgeIndex: number) => void;
  onSetTransitionType?: (roomId: string, edgeIndex: number, type: EdgeTransition['transitionType']) => void;
}

export function CanvasContextMenu({
  target,
  position,
  rooms,
  onClose,
  onDeleteRoom,
  onDeleteHole,
  onEditRoom,
  onRotateFillDirection,
  onToggleTransition,
  onSetTransitionType,
}: CanvasContextMenuProps) {
  if (!target || !position) return null;

  const room = target.roomId ? rooms.find(r => r.id === target.roomId) : null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const transitionTypes: { label: string; value: EdgeTransition['transitionType'] }[] = [
    { label: 'Auto', value: 'auto' },
    { label: 'Reducer', value: 'reducer' },
    { label: 'Threshold', value: 'threshold' },
    { label: 'T-Molding', value: 't-molding' },
    { label: 'End Cap', value: 'end-cap' },
    { label: 'Ramp', value: 'ramp' },
  ];

  // Stop pointer events from bubbling to the canvas container,
  // which would close the menu before click handlers fire.
  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onPointerDown={stopPropagation}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      {/* Menu */}
      <div
        className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[200px] animate-in fade-in-0 zoom-in-95"
        style={{ left: position.x, top: position.y }}
        onPointerDown={stopPropagation}
      >
        {/* Room Context Menu */}
        {target.type === 'room' && room && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {room.name}
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-default"
              onClick={() => handleAction(() => onEditRoom?.(target.roomId!))}
            >
              <Pencil className="w-4 h-4" />
              Edit Details
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-default"
              onClick={() => handleAction(() => onRotateFillDirection?.(target.roomId!))}
            >
              <RotateCw className="w-4 h-4" />
              Rotate Fill Direction
            </button>
            <div className="h-px bg-border my-1" />
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 cursor-default"
              onClick={() => handleAction(() => onDeleteRoom?.(target.roomId!))}
            >
              <Trash2 className="w-4 h-4" />
              Delete Room
            </button>
          </>
        )}

        {/* Edge Context Menu */}
        {target.type === 'edge' && room && target.edgeIndex !== undefined && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {room.name} — Edge {target.edgeIndex + 1}
            </div>
            {(() => {
              const hasTransition = room.edgeTransitions?.some(t => t.edgeIndex === target.edgeIndex);
              return (
                <>
                  <button
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-default"
                    onClick={() => handleAction(() => onToggleTransition?.(target.roomId!, target.edgeIndex!))}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    {hasTransition ? 'Remove Transition' : 'Set as Transition'}
                  </button>
                  {hasTransition && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                        Transition Type
                      </div>
                      {transitionTypes.map(({ label, value }) => {
                        const currentType = room.edgeTransitions?.find(t => t.edgeIndex === target.edgeIndex)?.transitionType;
                        return (
                          <button
                            key={value}
                            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-default ${currentType === value ? 'bg-accent/50 font-medium' : ''}`}
                            onClick={() => handleAction(() => onSetTransitionType?.(target.roomId!, target.edgeIndex!, value))}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            {label}
                          </button>
                        );
                      })}
                    </>
                  )}
                </>
              );
            })()}
          </>
        )}

        {/* Hole Context Menu */}
        {target.type === 'hole' && room && target.holeId && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Cutout in {room.name}
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 cursor-default"
              onClick={() => handleAction(() => onDeleteHole?.(target.roomId!, target.holeId!))}
            >
              <Trash2 className="w-4 h-4" />
              Delete Cutout
            </button>
          </>
        )}
      </div>
    </>
  );
}
