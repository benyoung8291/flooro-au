import { useMemo } from 'react';
import { StripPlanResult } from '@/lib/rollGoods';
import { formatArea } from '@/lib/reports/calculations';

interface SeamDiagramProps {
  stripPlan: StripPlanResult;
  width?: number;
  height?: number;
  showLabels?: boolean;
}

/**
 * Visual representation of the roll goods cut plan
 * Shows strips, seams, and material layout
 */
export function SeamDiagram({ 
  stripPlan, 
  width = 400, 
  height = 300,
  showLabels = true 
}: SeamDiagramProps) {
  const { bbox, scaleX, scaleY, padding } = useMemo(() => {
    const bbox = stripPlan.roomBoundingBox;
    const padding = 40;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    
    const scaleX = availableWidth / Math.max(bbox.width, 1);
    const scaleY = availableHeight / Math.max(bbox.height, 1);
    const uniformScale = Math.min(scaleX, scaleY);
    
    return { bbox, scaleX: uniformScale, scaleY: uniformScale, padding };
  }, [stripPlan, width, height]);

  // Transform mm coordinates to SVG coordinates
  const toSvgX = (mm: number) => padding + (mm - bbox.minX) * scaleX;
  const toSvgY = (mm: number) => padding + (mm - bbox.minY) * scaleY;
  const toSvgWidth = (mm: number) => mm * scaleX;
  const toSvgHeight = (mm: number) => mm * scaleY;

  // Generate strip colors (alternating for visibility)
  const getStripColor = (index: number) => {
    const colors = [
      'hsl(217 91% 60% / 0.3)',
      'hsl(217 91% 50% / 0.3)',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">{stripPlan.roomName} - Seam Diagram</h3>
        <span className="text-xs text-muted-foreground">
          {stripPlan.strips.length} strip{stripPlan.strips.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <svg 
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border rounded bg-background"
        style={{ maxHeight: height }}
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path 
              d="M 20 0 L 0 0 0 20" 
              fill="none" 
              stroke="hsl(var(--muted))" 
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#grid)" />
        
        {/* Room outline */}
        <rect
          x={padding}
          y={padding}
          width={toSvgWidth(bbox.width)}
          height={toSvgHeight(bbox.height)}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeDasharray="4 2"
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
                fill={getStripColor(index)}
                stroke="hsl(217 91% 50%)"
                strokeWidth="1"
              />
              {showLabels && (
                <text
                  x={x + w / 2}
                  y={y + h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] fill-foreground font-medium"
                >
                  #{index + 1}
                </text>
              )}
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
        
        {/* Direction indicator */}
        <text
          x={padding + 5}
          y={height - 10}
          className="text-[9px] fill-muted-foreground"
        >
          Layout: {stripPlan.layoutDirection}
        </text>
      </svg>
      
      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 bg-muted/50 rounded">
          <div className="text-muted-foreground">Room Area</div>
          <div className="font-medium">{formatArea(stripPlan.roomAreaM2)}</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded">
          <div className="text-muted-foreground">Material</div>
          <div className="font-medium">{formatArea(stripPlan.totalMaterialAreaM2)}</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded">
          <div className="text-muted-foreground">Utilization</div>
          <div className="font-medium text-primary">{stripPlan.utilizationPercent.toFixed(1)}%</div>
        </div>
      </div>
      
      {/* Waste breakdown */}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-destructive/30 rounded-sm" />
          <span>Waste: {formatArea(stripPlan.wasteAreaM2)} ({stripPlan.wastePercent.toFixed(1)}%)</span>
        </div>
        <span>•</span>
        <span>Seams: {stripPlan.seamLines.length}</span>
      </div>
    </div>
  );
}
