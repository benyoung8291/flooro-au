import { useState, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, AlertCircle, Scissors, Maximize2, ArrowUpCircle, ArrowDownCircle, Circle } from 'lucide-react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Material, QuantityRoundingMode } from '@/hooks/useMaterials';
import { generateReport, WasteOverrides } from '@/lib/reports/calculations';
import { CostSummaryCard } from './CostSummaryCard';
import { RoomBreakdownList } from './RoomBreakdownList';
import { ReportPreviewDialog } from './ReportPreviewDialog';
import { SeamDiagram } from './SeamDiagram';
import { CutPlanModal } from './CutPlanModal';
import { FinishesSchedule } from './FinishesSchedule';
import { WasteSuggestionCard } from './WasteSuggestionCard';
import { CrossRoomOptimizer } from './CrossRoomOptimizer';
import { LaborCostPanel } from './LaborCostPanel';
import { StripPlanResult, extractRollMaterialSpecs } from '@/lib/rollGoods';

interface ReportTabProps {
  rooms: Room[];
  materials: Material[];
  scale: ScaleCalibration | null;
  projectName?: string;
  projectAddress?: string;
  wasteOverrides?: WasteOverrides;
  onWasteOverridesChange?: (overrides: WasteOverrides) => void;
}

export function ReportTab({
  rooms,
  materials,
  scale,
  projectName = 'Untitled Project',
  projectAddress,
  wasteOverrides = {},
  onWasteOverridesChange,
}: ReportTabProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [roundingMode, setRoundingMode] = useState<QuantityRoundingMode>('up');
  const [localWasteOverrides, setLocalWasteOverrides] = useState<WasteOverrides>(wasteOverrides);
  const [cutPlanModal, setCutPlanModal] = useState<{
    open: boolean;
    stripPlan: StripPlanResult | null;
    materialName?: string;
    rollWidth?: number;
    patternRepeat?: number;
    wastePercent?: number;
    room?: Room;
  }>({ open: false, stripPlan: null });

  // Use provided overrides or local state
  const effectiveOverrides = onWasteOverridesChange ? wasteOverrides : localWasteOverrides;

  const report = useMemo(
    () => generateReport(rooms, materials, scale, roundingMode, effectiveOverrides),
    [rooms, materials, scale, roundingMode, effectiveOverrides]
  );

  const handleWasteOverrideChange = useCallback((materialId: string, value: number | undefined) => {
    const newOverrides = { ...effectiveOverrides };
    if (value === undefined) {
      delete newOverrides[materialId];
    } else {
      newOverrides[materialId] = value;
    }
    
    if (onWasteOverridesChange) {
      onWasteOverridesChange(newOverrides);
    } else {
      setLocalWasteOverrides(newOverrides);
    }
  }, [effectiveOverrides, onWasteOverridesChange]);

  // Check if any materials have box quantities
  const hasBoxQuantities = useMemo(
    () => report.roomCalculations.some(r => r.boxesNeeded !== undefined),
    [report.roomCalculations]
  );

  const hasRooms = rooms.length > 0;
  const hasMaterialsAssigned = report.roomCalculations.some(r => r.materialId);
  const isCalibrated = scale !== null;

  if (!hasRooms) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">No rooms yet</p>
        <p className="text-xs text-muted-foreground">
          Draw some rooms on the canvas to see cost estimates
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-3 space-y-4">
          {/* Warnings */}
          {(!isCalibrated || !hasMaterialsAssigned) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs space-y-1">
              {!isCalibrated && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400">
                    Scale not calibrated. Areas are in pixel units.
                  </span>
                </div>
              )}
              {!hasMaterialsAssigned && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400">
                    No materials assigned. Drag materials onto rooms.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cost Summary */}
          <CostSummaryCard
            totalCost={report.totalCost}
            totalNetArea={report.totalNetArea}
            totalGrossArea={report.totalGrossArea}
            totalPerimeter={report.totalPerimeter}
          />

          <Separator />

          {/* Wastage Suggestions */}
          {report.wasteSuggestions.size > 0 && (
            <WasteSuggestionCard
              materials={materials}
              wasteSuggestions={report.wasteSuggestions}
              wasteOverrides={effectiveOverrides}
              onOverrideChange={handleWasteOverrideChange}
            />
          )}

          <Separator />
          {hasBoxQuantities && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Box Rounding
                </div>
                <Select value={roundingMode} onValueChange={(v) => setRoundingMode(v as QuantityRoundingMode)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="w-3 h-3" />
                        Round Up
                      </div>
                    </SelectItem>
                    <SelectItem value="down">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="w-3 h-3" />
                        Round Down
                      </div>
                    </SelectItem>
                    <SelectItem value="nearest">
                      <div className="flex items-center gap-2">
                        <Circle className="w-3 h-3" />
                        Nearest
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {roundingMode === 'up' && 'Always enough material (recommended)'}
                {roundingMode === 'down' && 'Economical, may need extra'}
                {roundingMode === 'nearest' && 'Balanced approach'}
              </p>
            </div>
          )}

          {/* Room Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Room Breakdown
              </h3>
              <span className="text-xs text-muted-foreground">
                {rooms.length} room{rooms.length !== 1 ? 's' : ''}
              </span>
            </div>
            <RoomBreakdownList roomCalculations={report.roomCalculations} />
          </div>

          {/* Finishes Schedule */}
          {report.roomCalculations.some(r => r.materialCode) && (
            <>
              <Separator />
              <FinishesSchedule 
                roomCalculations={report.roomCalculations}
                materials={materials}
              />
            </>
          )}

          {/* Cross-Room Optimization for Roll Goods */}
          {(() => {
            // Group rooms by material for cross-room optimization
            const rollMaterialRooms = new Map<string, { rooms: Room[]; material: Material }>();
            
            report.roomCalculations
              .filter(r => r.stripPlan && r.materialId)
              .forEach(r => {
                const material = materials.find(m => m.id === r.materialId);
                const room = rooms.find(rm => rm.id === r.roomId);
                if (material && room) {
                  const existing = rollMaterialRooms.get(material.id);
                  if (existing) {
                    existing.rooms.push(room);
                  } else {
                    rollMaterialRooms.set(material.id, { rooms: [room], material });
                  }
                }
              });

            // Render optimizer for each material with 2+ rooms
            const optimizers = Array.from(rollMaterialRooms.entries())
              .filter(([, { rooms }]) => rooms.length >= 2)
              .map(([materialId, { rooms: materialRooms, material }]) => (
                <CrossRoomOptimizer
                  key={materialId}
                  rooms={materialRooms}
                  material={extractRollMaterialSpecs(material.specs as Record<string, unknown>)}
                  scale={scale}
                />
              ));

            return optimizers.length > 0 ? (
              <>
                <Separator />
                <div className="space-y-3">
                  {optimizers}
                </div>
              </>
            ) : null;
          })()}

          {/* Seam Diagrams for Roll Goods */}
          {report.roomCalculations.some(r => r.stripPlan) && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Cut Plans
                  </h3>
                </div>
                <div className="space-y-3">
                  {report.roomCalculations
                    .filter(r => r.stripPlan)
                    .map(r => {
                      const material = materials.find(m => m.id === r.materialId);
                      const room = rooms.find(room => room.id === r.roomId);
                      const rollWidth = material?.specs?.width as number || 4000;
                      const patternRepeat = material?.specs?.patternRepeat as number || material?.specs?.pattern_repeat as number || 0;
                      const wastePercent = material?.specs?.wastePercent as number || material?.specs?.waste_percent as number || 10;
                      return (
                        <div key={r.roomId} className="relative group">
                          <SeamDiagram 
                            stripPlan={r.stripPlan!}
                            width={320}
                            height={200}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setCutPlanModal({
                              open: true,
                              stripPlan: r.stripPlan!,
                              materialName: material?.name,
                              rollWidth,
                              patternRepeat,
                              wastePercent,
                              room,
                            })}
                          >
                            <Maximize2 className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* Labor & Total Cost */}
          {hasMaterialsAssigned && (
            <>
              <Separator />
              <LaborCostPanel
                rooms={rooms}
                materials={materials}
                materialCosts={new Map(
                  report.roomCalculations.map(r => [r.roomId, r.totalCost])
                )}
                accessoryCosts={new Map()}
                scale={scale}
              />
            </>
          )}

          <Separator />

          {/* Export Button */}
          <Button 
            className="w-full" 
            onClick={() => setPreviewOpen(true)}
            disabled={!hasRooms}
          >
            <Download className="w-4 h-4 mr-2" />
            Preview & Export PDF
          </Button>
        </div>
      </ScrollArea>

      <ReportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        projectName={projectName}
        projectAddress={projectAddress}
        report={report}
      />

      {cutPlanModal.stripPlan && (
        <CutPlanModal
          open={cutPlanModal.open}
          onOpenChange={(open) => setCutPlanModal(prev => ({ ...prev, open }))}
          stripPlan={cutPlanModal.stripPlan}
          materialName={cutPlanModal.materialName}
          rollWidth={cutPlanModal.rollWidth}
          patternRepeat={cutPlanModal.patternRepeat}
          room={cutPlanModal.room}
          scale={scale}
          wastePercent={cutPlanModal.wastePercent}
        />
      )}
    </>
  );
}
