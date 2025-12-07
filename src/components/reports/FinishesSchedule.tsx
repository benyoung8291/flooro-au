import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, ClipboardList } from 'lucide-react';
import { RoomCalculation, formatArea } from '@/lib/reports/calculations';
import { Material, MaterialSpecs } from '@/hooks/useMaterials';

interface FinishesScheduleProps {
  roomCalculations: RoomCalculation[];
  materials: Material[];
}

interface ScheduleEntry {
  code: string;
  materialId: string;
  materialName: string;
  range?: string;
  colour?: string;
  backing?: string;
  type: string;
  rooms: { name: string; area: number }[];
  totalArea: number;
}

function getMaterialDetails(specs: MaterialSpecs) {
  return {
    range: specs.range || '',
    colour: specs.colour || '',
    backing: specs.backing || '',
  };
}

export function FinishesSchedule({ roomCalculations, materials }: FinishesScheduleProps) {
  const scheduleEntries = useMemo(() => {
    const materialMap = new Map(materials.map(m => [m.id, m]));
    const entriesMap = new Map<string, ScheduleEntry>();

    for (const room of roomCalculations) {
      if (!room.materialCode || !room.materialId) continue;

      const material = materialMap.get(room.materialId);
      if (!material) continue;

      const key = room.materialCode;
      const existing = entriesMap.get(key);
      const details = getMaterialDetails(material.specs);

      if (existing) {
        existing.rooms.push({ name: room.roomName, area: room.netAreaM2 });
        existing.totalArea += room.netAreaM2;
      } else {
        entriesMap.set(key, {
          code: room.materialCode,
          materialId: room.materialId,
          materialName: material.name,
          range: details.range,
          colour: details.colour,
          backing: details.backing,
          type: material.type,
          rooms: [{ name: room.roomName, area: room.netAreaM2 }],
          totalArea: room.netAreaM2,
        });
      }
    }

    // Sort by code
    return Array.from(entriesMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [roomCalculations, materials]);

  const handleExportCSV = () => {
    const headers = ['Code', 'Material', 'Range', 'Colour', 'Backing', 'Type', 'Rooms', 'Total Area (m²)'];
    const rows = scheduleEntries.map(entry => [
      entry.code,
      entry.materialName,
      entry.range || '',
      entry.colour || '',
      entry.backing || '',
      entry.type,
      entry.rooms.map(r => r.name).join('; '),
      entry.totalArea.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finishes-schedule.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (scheduleEntries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No material codes assigned</p>
        <p className="text-xs mt-1">Assign codes to rooms in the properties panel</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Finishes Schedule
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="w-3 h-3 mr-1" />
          CSV
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16 font-semibold">Code</TableHead>
              <TableHead className="font-semibold">Material</TableHead>
              <TableHead className="font-semibold">Details</TableHead>
              <TableHead className="font-semibold">Rooms</TableHead>
              <TableHead className="text-right font-semibold">Area</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scheduleEntries.map((entry) => (
              <TableRow key={entry.code}>
                <TableCell className="font-mono font-semibold text-primary">
                  {entry.code}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{entry.materialName}</div>
                  {entry.range && (
                    <div className="text-xs text-muted-foreground">{entry.range}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-0.5">
                    {entry.colour && (
                      <div className="text-muted-foreground">
                        <span className="font-medium">Colour:</span> {entry.colour}
                      </div>
                    )}
                    {entry.backing && (
                      <div className="text-muted-foreground">
                        <span className="font-medium">Backing:</span> {entry.backing}
                      </div>
                    )}
                    {!entry.colour && !entry.backing && (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground">
                    {entry.rooms.map(r => r.name).join(', ')}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatArea(entry.totalArea)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
