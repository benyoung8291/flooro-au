import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FinishesSchedule } from './FinishesSchedule';
import { RoomCalculation } from '@/lib/reports/calculations';
import { Material } from '@/hooks/useMaterials';

interface FinishesScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomCalculations: RoomCalculation[];
  materials: Material[];
}

export function FinishesScheduleDialog({
  open,
  onOpenChange,
  roomCalculations,
  materials,
}: FinishesScheduleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Finishes Schedule</DialogTitle>
        </DialogHeader>
        <FinishesSchedule 
          roomCalculations={roomCalculations}
          materials={materials}
        />
      </DialogContent>
    </Dialog>
  );
}
