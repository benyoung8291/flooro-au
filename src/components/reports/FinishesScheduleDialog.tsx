import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinishesSchedule } from './FinishesSchedule';
import { ProjectMaterialsManager } from './ProjectMaterialsManager';
import { RoomCalculation } from '@/lib/reports/calculations';
import { Material } from '@/hooks/useMaterials';
import { Room, ScaleCalibration, ProjectMaterial } from '@/lib/canvas/types';
import { ClipboardList, Library } from 'lucide-react';

interface FinishesScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomCalculations: RoomCalculation[];
  materials: Material[];
  // Project materials management props
  projectMaterials?: ProjectMaterial[];
  onProjectMaterialsChange?: (materials: ProjectMaterial[]) => void;
  libraryMaterials?: Material[];
  rooms?: Room[];
  scale?: ScaleCalibration | null;
  onSaveToLibrary?: (material: ProjectMaterial) => Promise<void>;
}

export function FinishesScheduleDialog({
  open,
  onOpenChange,
  roomCalculations,
  materials,
  projectMaterials = [],
  onProjectMaterialsChange,
  libraryMaterials = [],
  rooms = [],
  scale,
  onSaveToLibrary,
}: FinishesScheduleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Project Materials & Schedule</DialogTitle>
          <DialogDescription>
            Manage materials for this project and view the finishes schedule
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="materials" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              Project Materials
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Finishes Schedule
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="materials" className="flex-1 overflow-auto mt-4">
            <ProjectMaterialsManager
              projectMaterials={projectMaterials}
              onProjectMaterialsChange={onProjectMaterialsChange}
              libraryMaterials={libraryMaterials}
              rooms={rooms}
              scale={scale}
              onSaveToLibrary={onSaveToLibrary}
            />
          </TabsContent>
          
          <TabsContent value="schedule" className="flex-1 overflow-auto mt-4">
            <FinishesSchedule 
              roomCalculations={roomCalculations}
              materials={materials}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
