import { CanvasPoint, Room, EdgeTransition, ALU_ANGLE_SIZES } from '@/lib/canvas/types';
import { Trash2, Pencil, ArrowRight, RotateCw, ArrowRightLeft, DoorOpen, Plus } from 'lucide-react';

export interface ContextTarget {
  type: 'room' | 'edge' | 'hole' | 'canvas' | 'door';
  roomId?: string;
  holeId?: string;
  doorId?: string;
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
  onDeleteDoor?: (roomId: string, doorId: string) => void;
  onEditRoom?: (roomId: string) => void;
  onRotateFillDirection?: (roomId: string) => void;
  onToggleTransition?: (roomId: string, edgeIndex: number) => void;
  onAddTransitionSegment?: (roomId: string, edgeIndex: number) => void;
  onDeleteTransitionSegment?: (roomId: string, transitionId: string) => void;
  onSetTransitionType?: (roomId: string, edgeIndex: number, type: EdgeTransition['transitionType'], aluAngleSizeMm?: number) => void;
}

export function CanvasContextMenu({
  target,
  position,
  rooms,
  onClose,
  onDeleteRoom,
  onDeleteHole,
  onDeleteDoor,
  onEditRoom,
  onRotateFillDirection,
  onToggleTransition,
  onAddTransitionSegment,
  onDeleteTransitionSegment,
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
        className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[200px] max-h-[400px] overflow-y-auto animate-in fade-in-0 zoom-in-95"
        style={{ left: position.x, top: position.y }}
        onPointerDown={stopPropagation}
        onWheel={(e) => e.stopPropagation()}
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

        {/* Door Context Menu */}
        {target.type === 'door' && room && target.doorId && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Door in {room.name}
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 cursor-default"
              onClick={() => handleAction(() => onDeleteDoor?.(target.roomId!, target.doorId!))}
            >
              <Trash2 className="w-4 h-4" />
              Delete Door
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
              const edgeTransitions = room.edgeTransitions?.filter(t => t.edgeIndex === target.edgeIndex) || [];
              const hasTransitions = edgeTransitions.length > 0;
              return (
                <>
                  {/* Add transition segment */}
                  <button
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-default"
                    onClick={() => handleAction(() => {
                      if (hasTransitions) {
                        onAddTransitionSegment?.(target.roomId!, target.edgeIndex!);
                      } else {
                        onToggleTransition?.(target.roomId!, target.edgeIndex!);
                      }
                    })}
                  >
                    <Plus className="w-4 h-4" />
                    Add Transition
                  </button>

                  {/* Existing transition segments */}
                  {hasTransitions && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                        Transitions ({edgeTransitions.length})
                      </div>
                      {edgeTransitions.map((t, idx) => {
                        const startPct = Math.round((t.startPercent ?? 0) * 100);
                        const endPct = Math.round((t.endPercent ?? 1) * 100);
                        const label = t.transitionType === 'alu-angle'
                          ? `Alu ${t.aluAngleSizeMm || '?'}mm`
                          : t.transitionType === 'auto' ? 'Auto'
                          : t.transitionType === 't-molding' ? 'T-Mold'
                          : t.transitionType === 'reducer' ? 'Reducer'
                          : t.transitionType === 'threshold' ? 'Threshold'
                          : t.transitionType === 'ramp' ? 'Ramp'
                          : t.transitionType === 'end-cap' ? 'End Cap'
                          : t.transitionType;
                        return (
                          <div key={t.id || idx} className="flex items-center justify-between px-2 py-1 text-xs">
                            <span className="text-amber-600">
                              {label} ({startPct}%-{endPct}%)
                            </span>
                            {t.id && (
                              <button
                                className="text-destructive hover:bg-destructive/10 rounded p-0.5"
                                onClick={() => handleAction(() => onDeleteTransitionSegment?.(target.roomId!, t.id!))}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Remove all transitions from edge */}
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 cursor-default"
                        onClick={() => handleAction(() => onToggleTransition?.(target.roomId!, target.edgeIndex!))}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove All Transitions
                      </button>
                    </>
                  )}

                  {/* Transition type submenu */}
                  {hasTransitions && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                        Set Type (last segment)
                      </div>
                      {transitionTypes.map(({ label, value }) => {
                        const lastTransition = edgeTransitions[edgeTransitions.length - 1];
                        const currentType = lastTransition?.transitionType;
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
                      {/* Alu Angle submenu */}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">
                        Alu Angle
                      </div>
                      {ALU_ANGLE_SIZES.map(size => {
                        const lastTransition = edgeTransitions[edgeTransitions.length - 1];
                        const isActive = lastTransition?.transitionType === 'alu-angle' && lastTransition?.aluAngleSizeMm === size;
                        return (
                          <button
                            key={size}
                            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-default ${isActive ? 'bg-accent/50 font-medium' : ''}`}
                            onClick={() => handleAction(() => onSetTransitionType?.(target.roomId!, target.edgeIndex!, 'alu-angle', size))}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            {size}mm
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
