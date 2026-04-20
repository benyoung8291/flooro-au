import { useMemo, useState } from 'react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { calculateRoomNetArea, pixelAreaToRealArea } from '@/lib/canvas/geometry';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package, Pencil, Trash2, Percent, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileRoomActionBarProps {
  room: Room;
  scale: ScaleCalibration | null;
  materials: Material[];
  onRename: (name: string) => void;
  onChangeWaste: (pct: number) => void;
  onPickMaterial: () => void;
  onDelete: () => void;
}

/**
 * Floating contextual chip bar that appears above the bottom nav when a room
 * is selected on mobile. Provides one-tap access to the most common per-room
 * actions: rename, material assign, waste %, delete.
 */
export function MobileRoomActionBar({
  room,
  scale,
  materials,
  onRename,
  onChangeWaste,
  onPickMaterial,
  onDelete,
}: MobileRoomActionBarProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingWaste, setEditingWaste] = useState(false);
  const [nameValue, setNameValue] = useState(room.name || '');
  const [wasteValue, setWasteValue] = useState(String(room.wastePercent ?? 10));

  const material = room.materialId ? materials.find(m => m.id === room.materialId) : null;

  const netArea = useMemo(() => {
    if (!scale) return 0;
    return pixelAreaToRealArea(calculateRoomNetArea(room), scale) / 1_000_000;
  }, [room, scale]);

  const commitName = () => {
    const v = nameValue.trim();
    if (v) onRename(v);
    setEditingName(false);
  };

  const commitWaste = () => {
    const n = parseFloat(wasteValue);
    if (!isNaN(n) && n >= 0 && n <= 100) onChangeWaste(n);
    else setWasteValue(String(room.wastePercent ?? 10));
    setEditingWaste(false);
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-40 max-w-[calc(100vw-1rem)] pointer-events-auto">
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 backdrop-blur-md shadow-lg px-2 py-1.5">
        {/* Color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 ml-1"
          style={{ backgroundColor: room.color || 'hsl(var(--primary))' }}
        />

        {/* Name (tap to rename) */}
        {editingName ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="h-7 w-24 text-xs px-2"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameValue(room.name || '');
              setEditingName(true);
            }}
            className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded hover:bg-muted active:bg-muted/70 max-w-[100px] truncate"
          >
            <Pencil className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate">{room.name || 'Unnamed'}</span>
          </button>
        )}

        {/* Area badge */}
        <Badge variant="secondary" className="text-[10px] font-mono tabular-nums shrink-0">
          {netArea.toFixed(1)} m²
        </Badge>

        {/* Material chip */}
        <Button
          variant={material ? 'secondary' : 'outline'}
          size="sm"
          className={cn(
            'h-7 px-2 text-xs gap-1 shrink-0 max-w-[120px]',
            !material && 'border-amber-500/50 text-amber-600 dark:text-amber-400'
          )}
          onClick={onPickMaterial}
        >
          <Package className="w-3 h-3" />
          <span className="truncate">{material ? material.name : 'Add material'}</span>
        </Button>

        {/* Waste */}
        {editingWaste ? (
          <div className="flex items-center gap-0.5">
            <Input
              autoFocus
              type="number"
              inputMode="decimal"
              value={wasteValue}
              onChange={(e) => setWasteValue(e.target.value)}
              onBlur={commitWaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitWaste();
                if (e.key === 'Escape') setEditingWaste(false);
              }}
              className="h-7 w-14 text-xs px-2"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={commitWaste}>
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setWasteValue(String(room.wastePercent ?? 10));
              setEditingWaste(true);
            }}
            className="flex items-center gap-0.5 text-xs font-mono tabular-nums px-1.5 py-0.5 rounded hover:bg-muted active:bg-muted/70 shrink-0"
          >
            <Percent className="w-3 h-3 text-muted-foreground" />
            {(room.wastePercent ?? 10).toFixed(0)}%
          </button>
        )}

        {/* Delete */}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
