import { useMemo } from 'react';
import { Room, MATERIAL_TYPE_COLORS, DEFAULT_ROOM_COLOR, ProjectMaterial } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinishesLegendProps {
  rooms: Room[];
  materials: Material[];
  projectMaterials?: ProjectMaterial[];
  onClose?: () => void;
  compact?: boolean;
}

interface LegendEntry {
  code: string;
  materialName: string;
  range?: string;
  colour?: string;
  type: string;
  fillColor: string;
}

export function FinishesLegend({ rooms, materials, projectMaterials = [], onClose, compact = false }: FinishesLegendProps) {
  const legendEntries = useMemo(() => {
    const projectMaterialMap = new Map(projectMaterials.map(pm => [pm.id, pm]));
    const libraryMaterialMap = new Map(materials.map(m => [m.id, m]));
    const entriesMap = new Map<string, LegendEntry>();

    for (const room of rooms) {
      if (!room.materialId) continue;

      // Get project material for the code
      const projectMaterial = projectMaterialMap.get(room.materialId);
      const libraryMaterial = libraryMaterialMap.get(room.materialId);
      
      // Code comes from project material only
      const materialCode = projectMaterial?.materialCode;
      if (!materialCode) continue;

      const key = materialCode;
      if (entriesMap.has(key)) continue;

      const materialType = projectMaterial?.type || libraryMaterial?.type || 'roll';
      const specs = projectMaterial?.specs || libraryMaterial?.specs;
      const fillColor = MATERIAL_TYPE_COLORS[materialType] || DEFAULT_ROOM_COLOR;
      // Convert HSLa to solid color for swatch
      const solidColor = fillColor.replace(/hsla?\(([^)]+),\s*[\d.]+\)/, 'hsl($1)');

      entriesMap.set(key, {
        code: materialCode,
        materialName: projectMaterial?.name || libraryMaterial?.name || 'Unknown',
        range: (specs as any)?.range,
        colour: (specs as any)?.colour,
        type: materialType,
        fillColor: solidColor,
      });
    }

    return Array.from(entriesMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [rooms, materials, projectMaterials]);

  if (legendEntries.length === 0) {
    return null;
  }

  return (
    <div className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-semibold text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          Finishes Schedule
        </h4>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <div className={`space-y-1.5 ${compact ? 'max-w-[180px]' : 'min-w-[200px]'}`}>
        {legendEntries.map((entry) => (
          <div key={entry.code} className="flex items-center gap-2">
            {/* Color swatch */}
            <div 
              className="w-5 h-5 rounded border border-border flex-shrink-0"
              style={{ backgroundColor: getSwatchColor(entry.type) }}
            />
            
            {/* Code */}
            <span className={`font-mono font-bold text-primary ${compact ? 'text-xs' : 'text-sm'} min-w-[40px]`}>
              {entry.code}
            </span>
            
            {/* Material info */}
            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                {entry.materialName}
              </div>
              {!compact && (entry.range || entry.colour) && (
                <div className="text-xs text-muted-foreground truncate">
                  {[entry.range, entry.colour].filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getSwatchColor(type: string): string {
  switch (type) {
    case 'roll':
      return 'hsl(142 71% 45%)';
    case 'tile':
      return 'hsl(280 65% 60%)';
    case 'linear':
      return 'hsl(25 95% 53%)';
    default:
      return 'hsl(217 91% 50%)';
  }
}

// Exportable SVG version for PDF/print
export function generateFinishesLegendSvg(
  rooms: Room[],
  materials: Material[],
  projectMaterials: ProjectMaterial[] = [],
  width: number = 220
): string {
  const projectMaterialMap = new Map(projectMaterials.map(pm => [pm.id, pm]));
  const libraryMaterialMap = new Map(materials.map(m => [m.id, m]));
  const entriesMap = new Map<string, LegendEntry>();

  for (const room of rooms) {
    if (!room.materialId) continue;
    
    const projectMaterial = projectMaterialMap.get(room.materialId);
    const libraryMaterial = libraryMaterialMap.get(room.materialId);
    const materialCode = projectMaterial?.materialCode;
    if (!materialCode) continue;
    
    const key = materialCode;
    if (entriesMap.has(key)) continue;

    const materialType = projectMaterial?.type || libraryMaterial?.type || 'roll';

    entriesMap.set(key, {
      code: materialCode,
      materialName: projectMaterial?.name || libraryMaterial?.name || 'Unknown',
      range: (projectMaterial?.specs as any)?.range || (libraryMaterial?.specs as any)?.range,
      colour: (projectMaterial?.specs as any)?.colour || (libraryMaterial?.specs as any)?.colour,
      type: materialType,
      fillColor: getSwatchColor(materialType),
    });
  }

  const entries = Array.from(entriesMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  
  if (entries.length === 0) return '';

  const rowHeight = 28;
  const headerHeight = 30;
  const padding = 12;
  const height = headerHeight + entries.length * rowHeight + padding * 2;

  const rows = entries.map((entry, i) => {
    const y = headerHeight + padding + i * rowHeight;
    return `
      <rect x="${padding}" y="${y}" width="18" height="18" rx="3" fill="${entry.fillColor}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padding + 26}" y="${y + 13}" font-family="monospace" font-size="12" font-weight="bold" fill="#0066cc">${entry.code}</text>
      <text x="${padding + 70}" y="${y + 13}" font-family="system-ui" font-size="11" fill="#1a1a1a">${entry.materialName}</text>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="white" rx="8" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${padding}" y="${padding + 14}" font-family="system-ui" font-size="13" font-weight="600" fill="#1a1a1a">Finishes Schedule</text>
      <line x1="${padding}" y1="${headerHeight}" x2="${width - padding}" y2="${headerHeight}" stroke="#e5e7eb" stroke-width="1"/>
      ${rows}
    </svg>
  `;
}
