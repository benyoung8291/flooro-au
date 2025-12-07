import { useMemo, useState } from 'react';
import { StripPlanResult, RollMaterialSpecs, calculateStripPlan } from '@/lib/rollGoods';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { formatArea, formatLength } from '@/lib/reports/calculations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  ArrowRight, 
  RotateCw,
  Maximize2,
  Minimize2 
} from 'lucide-react';

interface LayoutComparisonProps {
  room: Room;
  materialSpecs: RollMaterialSpecs;
  scale: ScaleCalibration | null;
  currentPlan: StripPlanResult;
  onSelectLayout?: (direction: 'horizontal' | 'vertical') => void;
}

interface ComparisonMetric {
  label: string;
  horizontal: string | number;
  vertical: string | number;
  better: 'horizontal' | 'vertical' | 'equal';
  unit?: string;
}

/**
 * Side-by-side comparison of horizontal vs vertical layout directions
 */
export function LayoutComparison({
  room,
  materialSpecs,
  scale,
  currentPlan,
  onSelectLayout,
}: LayoutComparisonProps) {
  const [expanded, setExpanded] = useState(false);

  // Calculate both layout directions
  const { horizontalPlan, verticalPlan, metrics, recommendation } = useMemo(() => {
    const horizontalPlan = calculateStripPlan(room, materialSpecs, scale, {
      forcedDirection: 'horizontal',
    });

    const verticalPlan = calculateStripPlan(room, materialSpecs, scale, {
      forcedDirection: 'vertical',
    });

    // Compare metrics
    const metrics: ComparisonMetric[] = [
      {
        label: 'Strips',
        horizontal: horizontalPlan.strips.length,
        vertical: verticalPlan.strips.length,
        better: horizontalPlan.strips.length < verticalPlan.strips.length 
          ? 'horizontal' 
          : horizontalPlan.strips.length > verticalPlan.strips.length 
            ? 'vertical' 
            : 'equal',
      },
      {
        label: 'Seams',
        horizontal: horizontalPlan.seamLines.length,
        vertical: verticalPlan.seamLines.length,
        better: horizontalPlan.seamLines.length < verticalPlan.seamLines.length 
          ? 'horizontal' 
          : horizontalPlan.seamLines.length > verticalPlan.seamLines.length 
            ? 'vertical' 
            : 'equal',
      },
      {
        label: 'Utilization',
        horizontal: `${horizontalPlan.utilizationPercent.toFixed(1)}%`,
        vertical: `${verticalPlan.utilizationPercent.toFixed(1)}%`,
        better: horizontalPlan.utilizationPercent > verticalPlan.utilizationPercent 
          ? 'horizontal' 
          : horizontalPlan.utilizationPercent < verticalPlan.utilizationPercent 
            ? 'vertical' 
            : 'equal',
      },
      {
        label: 'Material',
        horizontal: formatArea(horizontalPlan.totalMaterialAreaM2),
        vertical: formatArea(verticalPlan.totalMaterialAreaM2),
        better: horizontalPlan.totalMaterialAreaM2 < verticalPlan.totalMaterialAreaM2 
          ? 'horizontal' 
          : horizontalPlan.totalMaterialAreaM2 > verticalPlan.totalMaterialAreaM2 
            ? 'vertical' 
            : 'equal',
      },
      {
        label: 'Waste',
        horizontal: formatArea(horizontalPlan.wasteAreaM2),
        vertical: formatArea(verticalPlan.wasteAreaM2),
        better: horizontalPlan.wasteAreaM2 < verticalPlan.wasteAreaM2 
          ? 'horizontal' 
          : horizontalPlan.wasteAreaM2 > verticalPlan.wasteAreaM2 
            ? 'vertical' 
            : 'equal',
      },
      {
        label: 'Roll Length',
        horizontal: formatLength(horizontalPlan.totalRollLengthM),
        vertical: formatLength(verticalPlan.totalRollLengthM),
        better: horizontalPlan.totalRollLengthM < verticalPlan.totalRollLengthM 
          ? 'horizontal' 
          : horizontalPlan.totalRollLengthM > verticalPlan.totalRollLengthM 
            ? 'vertical' 
            : 'equal',
      },
      {
        label: 'Cost',
        horizontal: `$${horizontalPlan.materialCost.toFixed(2)}`,
        vertical: `$${verticalPlan.materialCost.toFixed(2)}`,
        better: horizontalPlan.materialCost < verticalPlan.materialCost 
          ? 'horizontal' 
          : horizontalPlan.materialCost > verticalPlan.materialCost 
            ? 'vertical' 
            : 'equal',
      },
    ];

    // Calculate recommendation score
    let horizontalScore = 0;
    let verticalScore = 0;
    
    metrics.forEach(m => {
      if (m.better === 'horizontal') horizontalScore++;
      if (m.better === 'vertical') verticalScore++;
    });

    // Weight utilization and waste more heavily
    if (horizontalPlan.utilizationPercent > verticalPlan.utilizationPercent) {
      horizontalScore += 2;
    } else if (verticalPlan.utilizationPercent > horizontalPlan.utilizationPercent) {
      verticalScore += 2;
    }

    const recommendation: 'horizontal' | 'vertical' | 'equal' = 
      horizontalScore > verticalScore ? 'horizontal' :
      verticalScore > horizontalScore ? 'vertical' : 'equal';

    return { horizontalPlan, verticalPlan, metrics, recommendation };
  }, [room, materialSpecs, scale]);

  const currentDirection = currentPlan.layoutDirection;
  const savingsPercent = Math.abs(
    horizontalPlan.wastePercent - verticalPlan.wastePercent
  ).toFixed(1);

  return (
    <div className="bg-muted/30 rounded-lg border overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Layout Direction Comparison</h3>
          {recommendation !== 'equal' && recommendation !== currentDirection && (
            <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
              {savingsPercent}% less waste possible
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Visual Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Horizontal Layout */}
            <LayoutCard 
              plan={horizontalPlan}
              direction="horizontal"
              isRecommended={recommendation === 'horizontal'}
              isCurrent={currentDirection === 'horizontal'}
              onSelect={onSelectLayout}
            />

            {/* Vertical Layout */}
            <LayoutCard 
              plan={verticalPlan}
              direction="vertical"
              isRecommended={recommendation === 'vertical'}
              isCurrent={currentDirection === 'vertical'}
              onSelect={onSelectLayout}
            />
          </div>

          {/* Metrics Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Metric</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <RotateCw className="w-3 h-3" style={{ transform: 'rotate(0deg)' }} />
                      Horizontal
                    </span>
                  </th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <RotateCw className="w-3 h-3" style={{ transform: 'rotate(90deg)' }} />
                      Vertical
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, index) => (
                  <tr key={metric.label} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-3 py-2 font-medium">{metric.label}</td>
                    <td className={`px-3 py-2 text-center font-mono ${
                      metric.better === 'horizontal' ? 'text-green-600 font-semibold' : ''
                    }`}>
                      <span className="inline-flex items-center gap-1">
                        {metric.horizontal}
                        {metric.better === 'horizontal' && (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-center font-mono ${
                      metric.better === 'vertical' ? 'text-green-600 font-semibold' : ''
                    }`}>
                      <span className="inline-flex items-center gap-1">
                        {metric.vertical}
                        {metric.better === 'vertical' && (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommendation */}
          {recommendation !== 'equal' && (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              recommendation === currentDirection 
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              {recommendation === currentDirection ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Optimal Layout Selected
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      Current {currentDirection} layout is the most efficient for this room.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Consider {recommendation} layout
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">
                      Could save {savingsPercent}% material waste compared to current layout.
                    </p>
                  </div>
                  {onSelectLayout && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10"
                      onClick={() => onSelectLayout(recommendation)}
                    >
                      Switch Layout
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LayoutCard({
  plan,
  direction,
  isRecommended,
  isCurrent,
  onSelect,
}: {
  plan: StripPlanResult;
  direction: 'horizontal' | 'vertical';
  isRecommended: boolean;
  isCurrent: boolean;
  onSelect?: (direction: 'horizontal' | 'vertical') => void;
}) {
  const bbox = plan.roomBoundingBox;
  const width = 150;
  const height = 100;
  const padding = 10;

  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scaleX = availableWidth / Math.max(bbox.width, 1);
  const scaleY = availableHeight / Math.max(bbox.height, 1);
  const uniformScale = Math.min(scaleX, scaleY);

  const toSvgWidth = (mm: number) => mm * uniformScale;
  const toSvgHeight = (mm: number) => mm * uniformScale;

  // Center the room in the diagram
  const roomWidth = toSvgWidth(bbox.width);
  const roomHeight = toSvgHeight(bbox.height);
  const offsetX = padding + (availableWidth - roomWidth) / 2;
  const offsetY = padding + (availableHeight - roomHeight) / 2;

  return (
    <div className={`rounded-lg border p-3 ${
      isRecommended && !isCurrent 
        ? 'border-green-500/50 bg-green-500/5' 
        : isCurrent 
          ? 'border-primary/50 bg-primary/5'
          : 'border-border bg-background'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium capitalize">{direction}</span>
        <div className="flex items-center gap-1">
          {isCurrent && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">Current</Badge>
          )}
          {isRecommended && (
            <Badge className="text-[9px] px-1.5 py-0 bg-green-500">Best</Badge>
          )}
        </div>
      </div>

      {/* Mini Diagram */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto mb-2 bg-muted/30 rounded">
        {/* Room outline */}
        <rect
          x={offsetX}
          y={offsetY}
          width={roomWidth}
          height={roomHeight}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
        />

        {/* Strips */}
        {plan.strips.map((strip, index) => {
          const isHorizontal = strip.rotation === 0;
          const x = offsetX + (strip.x - bbox.minX) * uniformScale;
          const y = offsetY + (strip.y - bbox.minY) * uniformScale;
          const w = isHorizontal ? toSvgWidth(strip.length) : toSvgWidth(strip.width);
          const h = isHorizontal ? toSvgHeight(strip.width) : toSvgHeight(strip.length);

          return (
            <rect
              key={strip.id}
              x={x}
              y={y}
              width={Math.max(w, 1)}
              height={Math.max(h, 1)}
              fill={index % 2 === 0 ? 'hsl(217 91% 60% / 0.4)' : 'hsl(217 91% 50% / 0.4)'}
              stroke="hsl(217 91% 50%)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Seam lines */}
        {plan.seamLines.map((seam) => (
          <line
            key={seam.id}
            x1={offsetX + (seam.x1 - bbox.minX) * uniformScale}
            y1={offsetY + (seam.y1 - bbox.minY) * uniformScale}
            x2={offsetX + (seam.x2 - bbox.minX) * uniformScale}
            y2={offsetY + (seam.y2 - bbox.minY) * uniformScale}
            stroke="hsl(0 84% 60%)"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Strips:</span>
          <span className="font-mono font-medium">{plan.strips.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Seams:</span>
          <span className="font-mono font-medium">{plan.seamLines.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Util:</span>
          <span className="font-mono font-medium">{plan.utilizationPercent.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Waste:</span>
          <span className="font-mono font-medium">{plan.wastePercent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
