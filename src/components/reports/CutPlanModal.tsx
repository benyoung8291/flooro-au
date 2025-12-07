import { useRef, useMemo } from 'react';
import { StripPlanResult, RollMaterialSpecs } from '@/lib/rollGoods';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { formatArea, formatLength } from '@/lib/reports/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Printer, Download, Ruler, Scissors, Package, Repeat, Lightbulb, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { LayoutComparison } from './LayoutComparison';

interface CutPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stripPlan: StripPlanResult;
  materialName?: string;
  rollWidth?: number;
  patternRepeat?: number;
  room?: Room;
  scale?: ScaleCalibration | null;
  wastePercent?: number;
}

interface OptimizationSuggestion {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  savings?: string;
}

/**
 * Detailed cut plan modal showing roll layout with measurements
 * Optimized for print/export
 */
export function CutPlanModal({
  open,
  onOpenChange,
  stripPlan,
  materialName = 'Roll Material',
  rollWidth = 4000,
  patternRepeat = 0,
  room,
  scale,
  wastePercent = 10,
}: CutPlanModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Build material specs for comparison
  const materialSpecs: RollMaterialSpecs = useMemo(() => ({
    width: rollWidth,
    patternRepeat,
    price: stripPlan.materialCost / stripPlan.totalMaterialAreaM2 || 0,
    wastePercent,
  }), [rollWidth, patternRepeat, stripPlan, wastePercent]);

  // Analyze pattern matching and generate optimization suggestions
  const { hasPattern, patternInfo, suggestions } = useMemo(() => {
    const hasPattern = patternRepeat > 0;
    const patternRepeats = hasPattern 
      ? Math.ceil(stripPlan.roomBoundingBox.height / patternRepeat)
      : 0;
    
    const suggestions: OptimizationSuggestion[] = [];

    // Check utilization efficiency
    if (stripPlan.utilizationPercent >= 90) {
      suggestions.push({
        type: 'success',
        title: 'Excellent Utilization',
        description: 'This layout achieves optimal material usage with minimal waste.',
      });
    } else if (stripPlan.utilizationPercent >= 80) {
      suggestions.push({
        type: 'info',
        title: 'Good Utilization',
        description: 'Material usage is within acceptable range.',
      });
    } else {
      suggestions.push({
        type: 'warning',
        title: 'High Waste',
        description: 'Consider rotating the layout direction to reduce waste.',
        savings: `${(stripPlan.wastePercent - 10).toFixed(1)}% potential savings`,
      });
    }

    // Pattern matching suggestions
    if (hasPattern) {
      const allStripsAligned = stripPlan.strips.every((strip, i) => {
        if (i === 0) return true;
        return strip.patternOffset % patternRepeat === 0;
      });

      if (allStripsAligned) {
        suggestions.push({
          type: 'success',
          title: 'Pattern Aligned',
          description: 'All strips are properly aligned for pattern matching.',
        });
      } else {
        suggestions.push({
          type: 'warning',
          title: 'Pattern Offset Required',
          description: 'Some strips require offset cuts for pattern alignment.',
        });
      }

      // Check if pattern repeat causes extra waste
      const roomLength = stripPlan.layoutDirection === 'horizontal' 
        ? stripPlan.roomBoundingBox.width 
        : stripPlan.roomBoundingBox.height;
      const patternWaste = (Math.ceil(roomLength / patternRepeat) * patternRepeat) - roomLength;
      if (patternWaste > patternRepeat * 0.5) {
        suggestions.push({
          type: 'info',
          title: 'Pattern Repeat Impact',
          description: `Room dimensions cause ${(patternWaste / 1000).toFixed(2)}m extra per strip for pattern matching.`,
        });
      }
    }

    // Seam placement suggestions
    if (stripPlan.seamLines.length > 3) {
      suggestions.push({
        type: 'warning',
        title: 'Multiple Seams',
        description: 'Consider a wider roll material to reduce seam count.',
      });
    } else if (stripPlan.seamLines.length === 0) {
      suggestions.push({
        type: 'success',
        title: 'Seamless Installation',
        description: 'Room can be covered with a single strip - no seams required!',
      });
    }

    // Layout direction suggestion
    const altDirection = stripPlan.layoutDirection === 'horizontal' ? 'vertical' : 'horizontal';
    const currentDimension = stripPlan.layoutDirection === 'horizontal' 
      ? stripPlan.roomBoundingBox.height 
      : stripPlan.roomBoundingBox.width;
    const altDimension = stripPlan.layoutDirection === 'horizontal' 
      ? stripPlan.roomBoundingBox.width 
      : stripPlan.roomBoundingBox.height;
    
    if (altDimension < currentDimension && altDimension <= rollWidth) {
      suggestions.push({
        type: 'info',
        title: 'Alternative Layout',
        description: `Try ${altDirection} layout for potentially fewer strips.`,
      });
    }

    return {
      hasPattern,
      patternInfo: {
        repeat: patternRepeat,
        repeatsNeeded: patternRepeats,
      },
      suggestions,
    };
  }, [stripPlan, patternRepeat, rollWidth]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cut Plan - ${stripPlan.roomName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 20px;
              color: #1a1a1a;
            }
            .header { margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
            .subtitle { font-size: 14px; color: #666; }
            .roll-diagram { 
              border: 2px solid #333; 
              margin: 20px 0;
              background: #f8f8f8;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin: 20px 0;
            }
            .stat-box {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: center;
            }
            .stat-label { font-size: 11px; color: #666; text-transform: uppercase; }
            .stat-value { font-size: 18px; font-weight: 600; margin-top: 4px; }
            .strips-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .strips-table th, .strips-table td {
              border: 1px solid #ddd;
              padding: 8px 12px;
              text-align: left;
            }
            .strips-table th {
              background: #f0f0f0;
              font-size: 11px;
              text-transform: uppercase;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Calculate roll diagram dimensions
  const rollDiagramWidth = 600;
  const rollDiagramHeight = 120;
  const padding = 20;
  
  // Scale strips to fit in roll diagram
  const totalRollLength = stripPlan.totalRollLengthMm;
  const scaleX = (rollDiagramWidth - padding * 2) / Math.max(totalRollLength, 1);
  const scaleY = (rollDiagramHeight - padding * 2) / Math.max(rollWidth, 1);

  // Position strips sequentially on the roll
  let currentX = padding;
  const stripPositions = stripPlan.strips.map((strip, index) => {
    const x = currentX;
    const width = strip.length * scaleX;
    currentX += width + 2; // 2px gap between strips
    return { ...strip, diagramX: x, diagramWidth: width, index };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Cut Plan - {stripPlan.roomName}
          </DialogTitle>
        </DialogHeader>

        {/* Print/Export Actions */}
        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="space-y-6">
          {/* Header */}
          <div className="header">
            <h1 className="title text-xl font-semibold">{stripPlan.roomName} - Cut Plan</h1>
            <p className="subtitle text-sm text-muted-foreground">
              Material: {materialName} • Roll Width: {(rollWidth / 1000).toFixed(2)}m
              {hasPattern && ` • Pattern Repeat: ${(patternRepeat / 1000).toFixed(2)}m`}
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox
              icon={<Ruler className="w-4 h-4" />}
              label="Room Area"
              value={formatArea(stripPlan.roomAreaM2)}
            />
            <StatBox
              icon={<Package className="w-4 h-4" />}
              label="Material Needed"
              value={formatArea(stripPlan.totalMaterialAreaM2)}
            />
            <StatBox
              icon={<Scissors className="w-4 h-4" />}
              label="Roll Length"
              value={formatLength(stripPlan.totalRollLengthM)}
            />
            <StatBox
              label="Utilization"
              value={`${stripPlan.utilizationPercent.toFixed(1)}%`}
              highlight={stripPlan.utilizationPercent >= 85}
            />
          </div>

          {/* Optimization Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4 border">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Optimization Analysis
              </h3>
              <div className="grid gap-2">
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard key={index} suggestion={suggestion} />
                ))}
              </div>
            </div>
          )}

          {/* Layout Direction Comparison */}
          {room && (
            <LayoutComparison
              room={room}
              materialSpecs={materialSpecs}
              scale={scale || null}
              currentPlan={stripPlan}
            />
          )}

          <Separator />

          {/* Roll Layout Diagram */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Roll Layout
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 border">
              <svg
                viewBox={`0 0 ${rollDiagramWidth} ${rollDiagramHeight + 40}`}
                className="w-full h-auto"
              >
                {/* Roll background */}
                <rect
                  x={padding}
                  y={padding}
                  width={rollDiagramWidth - padding * 2}
                  height={rollDiagramHeight - padding * 2}
                  fill="hsl(var(--muted))"
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  rx="2"
                />

                {/* Strips on roll */}
                {stripPositions.map((strip, index) => (
                  <g key={strip.id}>
                    {/* Strip rectangle */}
                    <rect
                      x={strip.diagramX}
                      y={padding}
                      width={Math.max(strip.diagramWidth, 4)}
                      height={rollDiagramHeight - padding * 2}
                      fill={index % 2 === 0 ? 'hsl(217 91% 60% / 0.4)' : 'hsl(217 91% 50% / 0.4)'}
                      stroke="hsl(217 91% 50%)"
                      strokeWidth="1"
                      rx="1"
                    />
                    
                    {/* Strip number */}
                    <text
                      x={strip.diagramX + strip.diagramWidth / 2}
                      y={padding + (rollDiagramHeight - padding * 2) / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[10px] font-medium"
                      fill="hsl(var(--foreground))"
                    >
                      #{index + 1}
                    </text>

                    {/* Cut line */}
                    {index < stripPositions.length - 1 && (
                      <line
                        x1={strip.diagramX + strip.diagramWidth + 1}
                        y1={padding - 5}
                        x2={strip.diagramX + strip.diagramWidth + 1}
                        y2={rollDiagramHeight - padding + 5}
                        stroke="hsl(0 84% 60%)"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Length label below */}
                    <text
                      x={strip.diagramX + strip.diagramWidth / 2}
                      y={rollDiagramHeight + 8}
                      textAnchor="middle"
                      className="text-[9px]"
                      fill="hsl(var(--muted-foreground))"
                    >
                      {(strip.length / 1000).toFixed(2)}m
                    </text>
                  </g>
                ))}

                {/* Total length label */}
                <text
                  x={rollDiagramWidth / 2}
                  y={rollDiagramHeight + 28}
                  textAnchor="middle"
                  className="text-[11px] font-medium"
                  fill="hsl(var(--foreground))"
                >
                  Total Roll Length: {formatLength(stripPlan.totalRollLengthM)}
                </text>

                {/* Roll width indicator */}
                <text
                  x={8}
                  y={rollDiagramHeight / 2}
                  textAnchor="middle"
                  transform={`rotate(-90, 8, ${rollDiagramHeight / 2})`}
                  className="text-[9px]"
                  fill="hsl(var(--muted-foreground))"
                >
                  {(rollWidth / 1000).toFixed(1)}m
                </text>
              </svg>
            </div>
          </div>

          <Separator />

          {/* Room Layout with Seam Lines */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Room Layout with Seams
            </h3>
            <RoomLayoutDiagram stripPlan={stripPlan} />
          </div>

          <Separator />

          {/* Pattern Matching Info */}
          {hasPattern && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Pattern Matching Guide
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase">Pattern Repeat</p>
                      <p className="text-lg font-mono font-semibold">{(patternRepeat / 1000).toFixed(2)}m</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase">Repeats/Strip</p>
                      <p className="text-lg font-mono font-semibold">{patternInfo.repeatsNeeded}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase">Total Strips</p>
                      <p className="text-lg font-mono font-semibold">{stripPlan.strips.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase">Seam Count</p>
                      <p className="text-lg font-mono font-semibold">{stripPlan.seamLines.length}</p>
                    </div>
                  </div>

                  {/* Pattern Alignment Diagram */}
                  <PatternAlignmentDiagram 
                    strips={stripPlan.strips} 
                    patternRepeat={patternRepeat}
                    rollWidth={rollWidth}
                  />
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Cut List Table */}
          <div>
            <h3 className="text-sm font-medium mb-3">Cut List {hasPattern && '& Pattern Offsets'}</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Strip</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Length</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Width</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Area</th>
                    {hasPattern && (
                      <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Pattern Offset</th>
                    )}
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase text-muted-foreground">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {stripPlan.strips.map((strip, index) => {
                    const areaM2 = (strip.length * strip.width) / 1_000_000;
                    return (
                      <tr key={strip.id} className="border-t border-border/50">
                        <td className="px-3 py-2 font-medium">
                          <div className="flex items-center gap-2">
                            Strip #{index + 1}
                            {index === 0 && hasPattern && (
                              <Badge variant="secondary" className="text-[10px]">Reference</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono">{(strip.length / 1000).toFixed(3)}m</td>
                        <td className="px-3 py-2 font-mono">{(strip.width / 1000).toFixed(3)}m</td>
                        <td className="px-3 py-2 font-mono">{areaM2.toFixed(2)} m²</td>
                        {hasPattern && (
                          <td className="px-3 py-2">
                            {index === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="font-mono">{(strip.patternOffset / 1000).toFixed(3)}m</span>
                                {strip.patternOffset > 0 && (
                                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                                    Offset
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2 text-muted-foreground">
                          X: {(strip.x / 1000).toFixed(2)}m, Y: {(strip.y / 1000).toFixed(2)}m
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t-2">
                    <td className="px-3 py-2 font-medium">Total</td>
                    <td className="px-3 py-2 font-mono font-medium">{formatLength(stripPlan.totalRollLengthM)}</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2 font-mono font-medium">{formatArea(stripPlan.totalMaterialAreaM2)}</td>
                    {hasPattern && <td className="px-3 py-2">—</td>}
                    <td className="px-3 py-2">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Waste Summary */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Material Waste</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Difference between material used and room area
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                  {formatArea(stripPlan.wasteAreaM2)}
                </p>
                <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                  {stripPlan.wastePercent.toFixed(1)}% waste
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ 
  icon, 
  label, 
  value, 
  highlight = false 
}: { 
  icon?: React.ReactNode; 
  label: string; 
  value: string; 
  highlight?: boolean;
}) {
  return (
    <div className={`border rounded-lg p-3 text-center ${highlight ? 'bg-primary/10 border-primary/30' : 'bg-muted/30'}`}>
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-semibold font-mono ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: OptimizationSuggestion }) {
  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    info: <ArrowRight className="w-4 h-4 text-blue-500" />,
  };

  const bgMap = {
    success: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgMap[suggestion.type]}`}>
      <div className="mt-0.5">{iconMap[suggestion.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{suggestion.title}</p>
        <p className="text-xs text-muted-foreground">{suggestion.description}</p>
        {suggestion.savings && (
          <Badge variant="outline" className="mt-1 text-[10px]">
            {suggestion.savings}
          </Badge>
        )}
      </div>
    </div>
  );
}

function PatternAlignmentDiagram({ 
  strips, 
  patternRepeat,
  rollWidth,
}: { 
  strips: StripPlanResult['strips']; 
  patternRepeat: number;
  rollWidth: number;
}) {
  const diagramWidth = 500;
  const stripHeight = 50;
  const padding = 20;
  const totalHeight = padding * 2 + strips.length * (stripHeight + 10) + 30;

  // Find max length for scaling
  const maxLength = Math.max(...strips.map(s => s.length));
  const scaleX = (diagramWidth - padding * 2) / Math.max(maxLength, 1);

  // Calculate pattern repeat width in diagram
  const patternWidth = patternRepeat * scaleX;

  return (
    <div className="mt-4">
      <p className="text-xs text-muted-foreground mb-2">Pattern Alignment View</p>
      <svg 
        viewBox={`0 0 ${diagramWidth} ${totalHeight}`}
        className="w-full h-auto bg-background rounded border"
      >
        {/* Pattern repeat markers */}
        {patternWidth > 20 && Array.from({ length: Math.ceil((diagramWidth - padding * 2) / patternWidth) + 1 }).map((_, i) => (
          <g key={`pattern-${i}`}>
            <line
              x1={padding + i * patternWidth}
              y1={padding - 10}
              x2={padding + i * patternWidth}
              y2={totalHeight - 30}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {i > 0 && (
              <text
                x={padding + i * patternWidth}
                y={padding - 14}
                textAnchor="middle"
                className="text-[8px]"
                fill="hsl(var(--muted-foreground))"
              >
                {i}×
              </text>
            )}
          </g>
        ))}

        {/* Strips */}
        {strips.map((strip, index) => {
          const y = padding + index * (stripHeight + 10);
          const width = strip.length * scaleX;
          const offsetX = strip.patternOffset * scaleX;

          return (
            <g key={strip.id}>
              {/* Strip background */}
              <rect
                x={padding}
                y={y}
                width={width}
                height={stripHeight}
                fill={index % 2 === 0 ? 'hsl(217 91% 60% / 0.2)' : 'hsl(217 91% 50% / 0.2)'}
                stroke="hsl(217 91% 50%)"
                strokeWidth="1"
                rx="2"
              />

              {/* Pattern offset indicator */}
              {index > 0 && strip.patternOffset > 0 && (
                <>
                  <rect
                    x={padding}
                    y={y}
                    width={offsetX}
                    height={stripHeight}
                    fill="hsl(0 84% 60% / 0.3)"
                    stroke="hsl(0 84% 60%)"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                  <text
                    x={padding + offsetX / 2}
                    y={y + stripHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[8px] font-medium"
                    fill="hsl(0 84% 40%)"
                  >
                    Offset
                  </text>
                </>
              )}

              {/* Pattern lines within strip */}
              {patternWidth > 10 && Array.from({ length: Math.floor(width / patternWidth) }).map((_, pi) => (
                <line
                  key={`p-${pi}`}
                  x1={padding + (pi + 1) * patternWidth}
                  y1={y + 5}
                  x2={padding + (pi + 1) * patternWidth}
                  y2={y + stripHeight - 5}
                  stroke="hsl(142 76% 36% / 0.5)"
                  strokeWidth="2"
                />
              ))}

              {/* Strip label */}
              <text
                x={padding + width / 2}
                y={y + stripHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-medium"
                fill="hsl(var(--foreground))"
              >
                Strip #{index + 1} ({(strip.length / 1000).toFixed(2)}m)
              </text>

              {/* Reference badge for first strip */}
              {index === 0 && (
                <text
                  x={padding + 4}
                  y={y + 12}
                  className="text-[8px] font-medium"
                  fill="hsl(217 91% 50%)"
                >
                  REF
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padding}, ${totalHeight - 25})`}>
          <rect x="0" y="0" width="12" height="12" fill="hsl(142 76% 36% / 0.5)" rx="1" />
          <text x="16" y="10" className="text-[9px]" fill="hsl(var(--muted-foreground))">Pattern repeat</text>
          
          <rect x="100" y="0" width="12" height="12" fill="hsl(0 84% 60% / 0.3)" stroke="hsl(0 84% 60%)" strokeWidth="1" strokeDasharray="2 1" rx="1" />
          <text x="116" y="10" className="text-[9px]" fill="hsl(var(--muted-foreground))">Pattern offset cut</text>
        </g>
      </svg>
    </div>
  );
}

function RoomLayoutDiagram({ stripPlan }: { stripPlan: StripPlanResult }) {
  const width = 400;
  const height = 300;
  const padding = 30;
  
  const bbox = stripPlan.roomBoundingBox;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  
  const scaleX = availableWidth / Math.max(bbox.width, 1);
  const scaleY = availableHeight / Math.max(bbox.height, 1);
  const uniformScale = Math.min(scaleX, scaleY);

  const toSvgX = (mm: number) => padding + (mm - bbox.minX) * uniformScale;
  const toSvgY = (mm: number) => padding + (mm - bbox.minY) * uniformScale;
  const toSvgWidth = (mm: number) => mm * uniformScale;
  const toSvgHeight = (mm: number) => mm * uniformScale;

  return (
    <div className="bg-muted/30 rounded-lg p-4 border flex justify-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md h-auto">
        {/* Grid */}
        <defs>
          <pattern id="cutPlanGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--muted))" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#cutPlanGrid)" />

        {/* Room outline */}
        <rect
          x={padding}
          y={padding}
          width={toSvgWidth(bbox.width)}
          height={toSvgHeight(bbox.height)}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
        />

        {/* Strips */}
        {stripPlan.strips.map((strip, index) => {
          const isHorizontal = strip.rotation === 0;
          const x = toSvgX(strip.x);
          const y = toSvgY(strip.y);
          const w = isHorizontal ? toSvgWidth(strip.length) : toSvgWidth(strip.width);
          const h = isHorizontal ? toSvgHeight(strip.width) : toSvgHeight(strip.length);

          return (
            <g key={strip.id}>
              <rect
                x={x}
                y={y}
                width={Math.max(w, 0)}
                height={Math.max(h, 0)}
                fill={index % 2 === 0 ? 'hsl(217 91% 60% / 0.3)' : 'hsl(217 91% 50% / 0.3)'}
                stroke="hsl(217 91% 50%)"
                strokeWidth="1"
              />
              <text
                x={x + w / 2}
                y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[11px] font-medium"
                fill="hsl(var(--foreground))"
              >
                #{index + 1}
              </text>
            </g>
          );
        })}

        {/* Seam lines */}
        {stripPlan.seamLines.map((seam) => (
          <line
            key={seam.id}
            x1={toSvgX(seam.x1)}
            y1={toSvgY(seam.y1)}
            x2={toSvgX(seam.x2)}
            y2={toSvgY(seam.y2)}
            stroke="hsl(0 84% 60%)"
            strokeWidth="2"
            strokeDasharray={seam.type === 'cross' ? '4 2' : 'none'}
          />
        ))}

        {/* Dimensions */}
        <text
          x={padding + toSvgWidth(bbox.width) / 2}
          y={height - 8}
          textAnchor="middle"
          className="text-[10px]"
          fill="hsl(var(--muted-foreground))"
        >
          {(bbox.width / 1000).toFixed(2)}m
        </text>
        <text
          x={8}
          y={padding + toSvgHeight(bbox.height) / 2}
          textAnchor="middle"
          transform={`rotate(-90, 8, ${padding + toSvgHeight(bbox.height) / 2})`}
          className="text-[10px]"
          fill="hsl(var(--muted-foreground))"
        >
          {(bbox.height / 1000).toFixed(2)}m
        </text>

        {/* Legend */}
        <g transform={`translate(${width - 90}, ${height - 50})`}>
          <rect x="0" y="0" width="80" height="40" fill="hsl(var(--background))" rx="4" opacity="0.9" />
          <line x1="8" y1="12" x2="24" y2="12" stroke="hsl(0 84% 60%)" strokeWidth="2" />
          <text x="28" y="15" className="text-[8px]" fill="hsl(var(--foreground))">Seam</text>
          <rect x="8" y="22" width="16" height="10" fill="hsl(217 91% 60% / 0.3)" stroke="hsl(217 91% 50%)" strokeWidth="1" />
          <text x="28" y="30" className="text-[8px]" fill="hsl(var(--foreground))">Strip</text>
        </g>
      </svg>
    </div>
  );
}
