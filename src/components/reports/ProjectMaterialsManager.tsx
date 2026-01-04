import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Library, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Save,
  Square,
  Circle,
  Minus,
  ExternalLink,
  Download,
} from 'lucide-react';
import { ProjectMaterial } from '@/lib/canvas/types';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Material, MaterialSpecs } from '@/hooks/useMaterials';
import { useProjectMaterials } from '@/hooks/useProjectMaterials';
import { AddMaterialFromLibraryDialog } from './AddMaterialFromLibraryDialog';
import { CreateProjectMaterialDialog } from './CreateProjectMaterialDialog';
import { EditProjectMaterialDialog } from './EditProjectMaterialDialog';
import { calculatePolygonArea } from '@/lib/canvas/geometry';
import { cn } from '@/lib/utils';

interface ProjectMaterialsManagerProps {
  projectMaterials: ProjectMaterial[];
  onProjectMaterialsChange: (materials: ProjectMaterial[]) => void;
  libraryMaterials: Material[];
  rooms: Room[];
  scale: ScaleCalibration | null;
  onSaveToLibrary?: (material: ProjectMaterial) => Promise<void>;
}

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

export function ProjectMaterialsManager({
  projectMaterials,
  onProjectMaterialsChange,
  libraryMaterials,
  rooms,
  scale,
  onSaveToLibrary,
}: ProjectMaterialsManagerProps) {
  const [addFromLibraryOpen, setAddFromLibraryOpen] = useState(false);
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ProjectMaterial | null>(null);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [tempCode, setTempCode] = useState('');

  const {
    addFromLibrary,
    createNew,
    update,
    remove,
  } = useProjectMaterials(projectMaterials, onProjectMaterialsChange);

  // Calculate room counts and areas per material
  const materialStats = projectMaterials.reduce((acc, pm) => {
    const materialRooms = rooms.filter(r => r.materialId === pm.id);
    let totalArea = 0;
    
    if (scale) {
      materialRooms.forEach(room => {
        const areaPx = calculatePolygonArea(room.points);
        const areaM2 = areaPx / (scale.pixelsPerMm * scale.pixelsPerMm) / 1_000_000;
        totalArea += areaM2;
      });
    }
    
    acc[pm.id] = { roomCount: materialRooms.length, totalArea };
    return acc;
  }, {} as Record<string, { roomCount: number; totalArea: number }>);

  const handleAddFromLibrary = (materials: Material[]) => {
    materials.forEach(m => addFromLibrary(m));
    setAddFromLibraryOpen(false);
  };

  const handleCreateNew = (data: {
    name: string;
    type: 'roll' | 'tile' | 'linear';
    subtype?: any;
    specs: MaterialSpecs;
  }, saveToLibrary: boolean) => {
    const newMaterial = createNew(data);
    if (saveToLibrary && onSaveToLibrary) {
      onSaveToLibrary(newMaterial);
    }
    setCreateNewOpen(false);
  };

  const handleStartEditCode = (pm: ProjectMaterial) => {
    setEditingCodeId(pm.id);
    setTempCode(pm.materialCode);
  };

  const handleSaveCode = (id: string) => {
    if (tempCode.trim()) {
      update(id, { materialCode: tempCode.toUpperCase() });
    }
    setEditingCodeId(null);
  };

  const handleExportCSV = () => {
    const headers = ['Code', 'Material', 'Type', 'Range', 'Colour', 'Backing', 'Price/m²', 'Rooms', 'Total Area (m²)'];
    const rows = projectMaterials.map(pm => {
      const specs = pm.specs as MaterialSpecs;
      const stats = materialStats[pm.id] || { roomCount: 0, totalArea: 0 };
      const roomNames = rooms.filter(r => r.materialId === pm.id).map(r => r.name).join('; ');
      
      return [
        pm.materialCode,
        pm.name,
        pm.type,
        specs.range || '',
        specs.colour || '',
        specs.backing || '',
        specs.pricePerM2?.toFixed(2) || specs.price?.toFixed(2) || '0.00',
        roomNames,
        stats.totalArea.toFixed(2),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'project-materials.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Project Materials</h3>
          <p className="text-xs text-muted-foreground">
            {projectMaterials.length} material{projectMaterials.length !== 1 ? 's' : ''} in this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddFromLibraryOpen(true)}>
            <Library className="w-3.5 h-3.5 mr-1.5" />
            From Library
          </Button>
          <Button size="sm" onClick={() => setCreateNewOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create New
          </Button>
        </div>
      </div>

      {/* Materials Table */}
      {projectMaterials.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Library className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-2">No materials in this project</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add materials from your library or create new ones
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddFromLibraryOpen(true)}>
              <Library className="w-3.5 h-3.5 mr-1.5" />
              From Library
            </Button>
            <Button size="sm" onClick={() => setCreateNewOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create New
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20 font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Material</TableHead>
                <TableHead className="font-semibold">Details</TableHead>
                <TableHead className="text-right font-semibold">Price</TableHead>
                <TableHead className="text-center font-semibold">Rooms</TableHead>
                <TableHead className="text-right font-semibold">Area</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectMaterials.map((pm) => {
                const specs = pm.specs as MaterialSpecs;
                const Icon = typeIcons[pm.type] || Square;
                const stats = materialStats[pm.id] || { roomCount: 0, totalArea: 0 };
                const price = specs.pricePerM2 || specs.price || 0;
                
                return (
                  <TableRow key={pm.id}>
                    <TableCell>
                      {editingCodeId === pm.id ? (
                        <Input
                          value={tempCode}
                          onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                          onBlur={() => handleSaveCode(pm.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCode(pm.id);
                            if (e.key === 'Escape') setEditingCodeId(null);
                          }}
                          className="w-16 h-7 font-mono text-xs uppercase px-1.5"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => handleStartEditCode(pm)}
                          className="font-mono font-semibold text-primary hover:underline cursor-pointer"
                        >
                          {pm.materialCode}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <div className="font-medium text-sm flex items-center gap-1.5">
                            {pm.name}
                            {pm.isCustom ? (
                              <Badge variant="outline" className="text-[9px] h-4 px-1">Custom</Badge>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1">Library</Badge>
                                </TooltipTrigger>
                                <TooltipContent>Imported from material library</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {specs.range && (
                            <div className="text-xs text-muted-foreground">{specs.range}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {specs.colour && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">Colour:</span> {specs.colour}
                          </div>
                        )}
                        {specs.backing && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">Backing:</span> {specs.backing}
                          </div>
                        )}
                        {!specs.colour && !specs.backing && (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${price.toFixed(2)}
                      <span className="text-xs text-muted-foreground">/m²</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {stats.roomCount > 0 ? (
                        <Badge variant="outline">{stats.roomCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {stats.totalArea > 0 ? (
                        `${stats.totalArea.toFixed(1)} m²`
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingMaterial(pm)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!pm.isCustom && pm.sourceMaterialId && (
                            <DropdownMenuItem disabled>
                              <ExternalLink className="w-3.5 h-3.5 mr-2" />
                              View Source
                            </DropdownMenuItem>
                          )}
                          {pm.isCustom && onSaveToLibrary && (
                            <DropdownMenuItem onClick={() => onSaveToLibrary(pm)}>
                              <Save className="w-3.5 h-3.5 mr-2" />
                              Save to Library
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (stats.roomCount > 0) {
                                // Could show a confirmation dialog here
                              }
                              remove(pm.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Export Button */}
      {projectMaterials.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <AddMaterialFromLibraryDialog
        open={addFromLibraryOpen}
        onOpenChange={setAddFromLibraryOpen}
        libraryMaterials={libraryMaterials}
        existingMaterialIds={projectMaterials.filter(pm => pm.sourceMaterialId).map(pm => pm.sourceMaterialId!)}
        onAdd={handleAddFromLibrary}
      />

      <CreateProjectMaterialDialog
        open={createNewOpen}
        onOpenChange={setCreateNewOpen}
        onSubmit={handleCreateNew}
      />

      {editingMaterial && (
        <EditProjectMaterialDialog
          open={!!editingMaterial}
          onOpenChange={(open) => !open && setEditingMaterial(null)}
          material={editingMaterial}
          sourceMaterial={editingMaterial.sourceMaterialId 
            ? libraryMaterials.find(m => m.id === editingMaterial.sourceMaterialId)
            : undefined
          }
          onSave={(updates) => {
            update(editingMaterial.id, updates);
            setEditingMaterial(null);
          }}
          onSaveToLibrary={onSaveToLibrary}
        />
      )}
    </div>
  );
}
