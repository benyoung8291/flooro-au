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
import { Trash2, Ungroup } from 'lucide-react';

interface DeleteParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  childCount: number;
  onDeleteAll: () => void;
  onKeepChildren: () => void;
}

export function DeleteParentDialog({
  open,
  onOpenChange,
  description,
  childCount,
  onDeleteAll,
  onKeepChildren,
}: DeleteParentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{description}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This group has {childCount} sub-item{childCount !== 1 ? 's' : ''}. 
            What would you like to do with them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={onKeepChildren}
            className="gap-1.5"
          >
            <Ungroup className="w-3.5 h-3.5" />
            Keep Sub-items
          </Button>
          <Button
            variant="destructive"
            onClick={onDeleteAll}
            className="gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete All
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
