import { useMemo } from 'react';
import { Sparkles, ArrowRight, Recycle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Room, ScaleCalibration, ProjectMaterial } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { optimizeCutPlan } from '@/lib/rollGoods/cutOptimizer';
import { extractRollMaterialSpecs } from '@/lib/rollGoods';
import { formatCurrency } from '@/lib/reports/calculations';
import { cn } from '@/lib/utils';

interface MaterialEfficiencyCardProps {
  rooms: Room[];
  scale: ScaleCalibration | null;
  allMaterialsMap: Map<string, Material>;
  projectMaterials: ProjectMaterial[];
  onOpenReport?: () => void;
}

/**
 * Sticky summary card at top of Takeoff panel that runs cross-room cut
 * optimization across every roll material and surfaces total $ saved.
 *
 * Replaces the previously-buried optimizer in the Report tab.
 */
export function MaterialEfficiencyCard({
  rooms,
  scale,
  allMaterialsMap,
  onOpenReport,
}: MaterialEfficiencyCardProps) {
  const summary = useMemo(() => {
    if (!scale || rooms.length === 0) {
      return { costSaved: 0, wasteSavedM2: 0, rollsSaved: 0, dropsReused: 0, materialCount: 0 };
    }

    // Group rooms by roll-material id
    const groups = new Map<string, Room[]>();
    for (const room of rooms) {
      if (!room.materialId) continue;
      const mat = allMaterialsMap.get(room.materialId);
      if (!mat || mat.type !== 'roll') continue;
      const arr = groups.get(room.materialId) || [];
      arr.push(room);
      groups.set(room.materialId, arr);
    }

    let costSaved = 0;
    let wasteSavedM2 = 0;
    let rollsSaved = 0;
    let dropsReused = 0;

    for (const [materialId, groupRooms] of groups) {
      // Need 2+ rooms for cross-room reuse to ever matter
      if (groupRooms.length < 2) continue;
      const material = allMaterialsMap.get(materialId);
      if (!material) continue;
      let specs;
      try {
        specs = extractRollMaterialSpecs(material.specs as Record<string, unknown>);
      } catch {
        continue;
      }
      if (!specs) continue;

      try {
        const plan = optimizeCutPlan(groupRooms, specs, scale);
        costSaved += plan.costSaved;
        wasteSavedM2 += plan.wasteSavedM2;
        rollsSaved += plan.rollsSaved;
        dropsReused += plan.reusedPieces.length;
      } catch {
        // ignore failures from incomplete material data
      }
    }

    return {
      costSaved,
      wasteSavedM2,
      rollsSaved,
      dropsReused,
      materialCount: groups.size,
    };
  }, [rooms, scale, allMaterialsMap]);

  // Hide entirely if there's nothing meaningful to surface
  if (summary.materialCount === 0 || (summary.costSaved < 1 && summary.rollsSaved === 0 && summary.dropsReused === 0)) {
    return null;
  }

  const hasSavings = summary.costSaved >= 1 || summary.rollsSaved > 0;

  return (
    <div
      className={cn(
        'mx-2 mt-2 rounded-lg border p-2.5 text-xs',
        'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent',
        'border-primary/30'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Material Efficiency</span>
        </div>
        {onOpenReport && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-primary hover:text-primary"
            onClick={onOpenReport}
          >
            Open
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-2">
        <div className="bg-background/60 rounded-md px-2 py-1.5 text-center">
          <div className={cn('text-sm font-bold font-mono', hasSavings ? 'text-primary' : 'text-muted-foreground')}>
            {formatCurrency(summary.costSaved)}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Saved</div>
        </div>
        <div className="bg-background/60 rounded-md px-2 py-1.5 text-center">
          <div className="text-sm font-bold font-mono">{summary.rollsSaved}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Rolls</div>
        </div>
        <div className="bg-background/60 rounded-md px-2 py-1.5 text-center">
          <div className="text-sm font-bold font-mono">{summary.wasteSavedM2.toFixed(1)}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">m² waste</div>
        </div>
      </div>

      {summary.dropsReused > 0 && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
          <Recycle className="w-2.5 h-2.5" />
          <span>{summary.dropsReused} drop{summary.dropsReused !== 1 ? 's' : ''} reused across rooms</span>
        </div>
      )}
    </div>
  );
}
