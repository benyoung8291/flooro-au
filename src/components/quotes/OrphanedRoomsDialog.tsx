import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, AlertTriangle } from 'lucide-react';

export interface OrphanedRoom {
  parentId: string;
  description: string;
  childIds: string[];
}

interface OrphanedRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orphanedRooms: OrphanedRoom[];
  onRemoveSelected: (parentIds: string[]) => void;
  isRemoving?: boolean;
}

export function OrphanedRoomsDialog({
  open,
  onOpenChange,
  orphanedRooms,
  onRemoveSelected,
  isRemoving,
}: OrphanedRoomsDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(orphanedRooms.map((r) => r.parentId))
  );

  const toggleRoom = (parentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === orphanedRooms.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orphanedRooms.map((r) => r.parentId)));
    }
  };

  const handleRemove = () => {
    onRemoveSelected(Array.from(selected));
  };

  const totalItems = orphanedRooms
    .filter((r) => selected.has(r.parentId))
    .reduce((sum, r) => sum + 1 + r.childIds.length, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Rooms No Longer in Takeoff
          </AlertDialogTitle>
          <AlertDialogDescription>
            The following rooms exist in the quote but were removed from the takeoff.
            Select which ones to remove from the quote.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          {orphanedRooms.length > 1 && (
            <label className="flex items-center gap-2 pb-2 border-b border-border cursor-pointer">
              <Checkbox
                checked={selected.size === orphanedRooms.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">Select all</span>
            </label>
          )}
          {orphanedRooms.map((room) => (
            <label
              key={room.parentId}
              className="flex items-center gap-2 py-1.5 cursor-pointer"
            >
              <Checkbox
                checked={selected.has(room.parentId)}
                onCheckedChange={() => toggleRoom(room.parentId)}
              />
              <div className="min-w-0">
                <span className="text-sm font-medium">{room.description}</span>
                <span className="text-xs text-muted-foreground ml-1.5">
                  ({room.childIds.length} sub-item{room.childIds.length !== 1 ? 's' : ''})
                </span>
              </div>
            </label>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Keep All</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={selected.size === 0 || isRemoving}
            className="gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove {selected.size > 0 ? `${selected.size} Room${selected.size !== 1 ? 's' : ''}` : ''}
            {totalItems > 0 && ` (${totalItems} items)`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
