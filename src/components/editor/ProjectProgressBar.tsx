import { Check, Image, Ruler, Box, Palette, Package, FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Room, ScaleCalibration, BackgroundImage } from '@/lib/canvas/types';

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ElementType;
  completed: boolean;
  active: boolean;
}

interface ProjectProgressBarProps {
  rooms: Room[];
  scale: ScaleCalibration | null;
  backgroundImage: BackgroundImage | null;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function ProjectProgressBar({
  rooms,
  scale,
  backgroundImage,
  onStepClick,
  className,
}: ProjectProgressBarProps) {
  // Calculate completion status for each step
  const hasFloorPlan = !!backgroundImage;
  const hasScale = !!scale;
  const hasRooms = rooms.length > 0;
  const roomsWithMaterials = rooms.filter(r => r.materialId);
  const hasMaterials = roomsWithMaterials.length > 0;
  const allRoomsHaveMaterials = hasRooms && roomsWithMaterials.length === rooms.length;
  const roomsWithAccessories = rooms.filter(r => r.accessories && Object.values(r.accessories).some(a => a && (a as any).enabled));
  const hasAccessories = roomsWithAccessories.length > 0;
  
  // A room is "quote ready" if it has materials
  const isQuoteReady = hasRooms && hasMaterials;

  const steps: ProgressStep[] = [
    {
      id: 'floorplan',
      label: 'Floor Plan',
      icon: Image,
      completed: hasFloorPlan,
      active: !hasFloorPlan,
    },
    {
      id: 'scale',
      label: 'Set Scale',
      icon: Ruler,
      completed: hasScale,
      active: hasFloorPlan && !hasScale,
    },
    {
      id: 'rooms',
      label: 'Draw Rooms',
      icon: Box,
      completed: hasRooms,
      active: hasScale && !hasRooms,
    },
    {
      id: 'materials',
      label: 'Materials',
      icon: Palette,
      completed: allRoomsHaveMaterials,
      active: hasRooms && !allRoomsHaveMaterials,
    },
    {
      id: 'accessories',
      label: 'Accessories',
      icon: Package,
      completed: hasAccessories,
      active: allRoomsHaveMaterials && !hasAccessories,
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: FileText,
      completed: false, // Quote is always available to view
      active: isQuoteReady,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / (steps.length - 1)) * 100; // -1 because Quote is always the end state

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isLast = index === steps.length - 1;
        
        return (
          <div key={step.id} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onStepClick?.(step.id)}
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-full transition-all',
                    step.completed
                      ? 'bg-primary text-primary-foreground'
                      : step.active
                        ? 'bg-primary/20 text-primary ring-2 ring-primary/30 animate-pulse'
                        : 'bg-muted text-muted-foreground',
                    onStepClick && 'cursor-pointer hover:scale-110'
                  )}
                >
                  {step.completed ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{step.label}</p>
                <p className="text-muted-foreground">
                  {step.completed 
                    ? '✓ Complete' 
                    : step.active 
                      ? 'Next step' 
                      : 'Not started'}
                </p>
              </TooltipContent>
            </Tooltip>
            
            {!isLast && (
              <div 
                className={cn(
                  'w-4 h-0.5 mx-0.5 transition-colors',
                  step.completed ? 'bg-primary' : 'bg-muted'
                )} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
