import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Download, Printer } from 'lucide-react';
import { ReportSummary, formatCurrency, formatArea, formatLength } from '@/lib/reports/calculations';
import { exportToPDF } from '@/lib/reports/pdfGenerator';

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectAddress?: string;
  report: ReportSummary;
}

export function ReportPreviewDialog({
  open,
  onOpenChange,
  projectName,
  projectAddress,
  report,
}: ReportPreviewDialogProps) {
  const handleExport = () => {
    exportToPDF({
      projectName,
      projectAddress,
      report,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Estimate Report</DialogTitle>
          <DialogDescription>
            Preview your flooring estimate before exporting
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Project Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-lg">{projectName}</h3>
              {projectAddress && (
                <p className="text-sm text-muted-foreground mt-1">{projectAddress}</p>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-primary text-primary-foreground rounded-lg p-3 text-center">
                <div className="text-xs opacity-80">Total Cost</div>
                <div className="text-lg font-bold font-mono">{formatCurrency(report.totalCost)}</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Net Area</div>
                <div className="text-sm font-mono font-medium">{formatArea(report.totalNetArea)}</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Gross Area</div>
                <div className="text-sm font-mono font-medium">{formatArea(report.totalGrossArea)}</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Perimeter</div>
                <div className="text-sm font-mono font-medium">{formatLength(report.totalPerimeter)}</div>
              </div>
            </div>

            {/* Room Breakdown */}
            <div>
              <h4 className="font-medium mb-3">Room Breakdown</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium">Room</th>
                      <th className="text-left p-3 font-medium">Material</th>
                      <th className="text-right p-3 font-medium">Area</th>
                      <th className="text-right p-3 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.roomCalculations.map((room, idx) => (
                      <tr key={room.roomId} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="p-3">{room.roomName}</td>
                        <td className="p-3">
                          {room.materialName ? (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {room.materialName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">{formatArea(room.netAreaM2)}</td>
                        <td className="p-3 text-right font-mono font-medium">
                          {room.totalCost > 0 ? formatCurrency(room.totalCost) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Material Summary */}
            {report.materialSummary.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Material Summary</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-medium">Material</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-right p-3 font-medium">Quantity</th>
                        <th className="text-right p-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.materialSummary.map((item, idx) => (
                        <tr key={item.materialId} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="p-3">{item.materialName}</td>
                          <td className="p-3 capitalize">{item.materialType}</td>
                          <td className="p-3 text-right font-mono">
                            {item.totalQuantity.toFixed(item.unit === 'tiles' ? 0 : 2)} {item.unit}
                          </td>
                          <td className="p-3 text-right font-mono font-medium">
                            {formatCurrency(item.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleExport}>
            <Printer className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
