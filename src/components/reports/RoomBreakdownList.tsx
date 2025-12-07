import { RoomCalculation, formatCurrency, formatArea } from '@/lib/reports/calculations';
import { Badge } from '@/components/ui/badge';
import { Square, Circle, Minus } from 'lucide-react';

interface RoomBreakdownListProps {
  roomCalculations: RoomCalculation[];
}

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

export function RoomBreakdownList({ roomCalculations }: RoomBreakdownListProps) {
  if (roomCalculations.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No rooms to display
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {roomCalculations.map((room) => {
        const Icon = room.materialType ? typeIcons[room.materialType] || Square : Square;
        
        return (
          <div
            key={room.roomId}
            className="p-3 rounded-lg border border-border bg-background hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{room.roomName}</span>
              </div>
              {room.totalCost > 0 && (
                <span className="font-mono text-sm font-semibold text-primary">
                  {formatCurrency(room.totalCost)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {formatArea(room.netAreaM2)}
              </Badge>
              
              {room.materialName ? (
                <Badge variant="outline" className="text-xs capitalize">
                  <Icon className="w-3 h-3 mr-1" />
                  {room.materialName}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  No material
                </Badge>
              )}
              
              {room.wastePercent > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{room.wastePercent}% waste
                </span>
              )}
            </div>

            {room.materialType === 'linear' && room.doorDeductionM > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Door deductions: {room.doorDeductionM.toFixed(2)}m
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
