import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Download,
  FileText,
  DollarSign,
  Ruler,
  Package,
  Users,
  Percent,
  Check,
  AlertTriangle,
  Square,
  Circle,
  Minus,
} from 'lucide-react';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { generateReport, formatCurrency, formatArea, ReportSummary } from '@/lib/reports/calculations';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

interface QuoteSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
  materials: Material[];
  scale: ScaleCalibration | null;
  projectName: string;
  projectAddress?: string;
  onExportPDF?: () => void;
}

export function QuoteSummaryDialog({
  open,
  onOpenChange,
  rooms,
  materials,
  scale,
  projectName,
  projectAddress,
  onExportPDF,
}: QuoteSummaryDialogProps) {
  const [includeLabor, setIncludeLabor] = useState(true);
  const [laborRate, setLaborRate] = useState(25);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  const report = useMemo(
    () => generateReport(rooms, materials, scale),
    [rooms, materials, scale]
  );

  // Calculate totals
  const materialCost = report.totalCost;
  const laborCost = includeLabor ? report.totalNetArea * laborRate : 0;
  const subtotal = materialCost + laborCost;
  const markupAmount = subtotal * (markupPercent / 100);
  const discountAmount = (subtotal + markupAmount) * (discountPercent / 100);
  const grandTotal = subtotal + markupAmount - discountAmount;

  // Stats
  const roomsWithMaterial = rooms.filter(r => r.materialId).length;
  const roomsWithoutMaterial = rooms.length - roomsWithMaterial;
  const uniqueMaterials = new Set(rooms.map(r => r.materialId).filter(Boolean)).size;

  const getMaterial = (materialId: string | null): Material | undefined => {
    return materialId ? materials.find(m => m.id === materialId) : undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Quote Summary
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {projectName}
                {projectAddress && ` • ${projectAddress}`}
              </p>
            </div>
            
            <Button onClick={onExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Square className="w-4 h-4" />
                  Rooms
                </div>
                <p className="text-2xl font-bold">{rooms.length}</p>
                {roomsWithoutMaterial > 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    {roomsWithoutMaterial} unassigned
                  </p>
                )}
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Ruler className="w-4 h-4" />
                  Total Area
                </div>
                <p className="text-2xl font-bold">{report.totalNetArea.toFixed(1)} m²</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.totalGrossArea.toFixed(1)} m² gross
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Package className="w-4 h-4" />
                  Materials
                </div>
                <p className="text-2xl font-bold">{uniqueMaterials}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  unique materials
                </p>
              </div>
              
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 text-primary text-sm mb-1">
                  <DollarSign className="w-4 h-4" />
                  Estimate
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(grandTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {includeLabor ? 'incl. labor' : 'materials only'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Room Breakdown */}
            <Accordion type="single" collapsible defaultValue="rooms">
              <AccordionItem value="rooms" className="border-none">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Square className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Room Breakdown</span>
                    <Badge variant="secondary" className="ml-2">
                      {rooms.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {report.roomCalculations.map(calc => {
                      const room = rooms.find(r => r.id === calc.roomId);
                      const material = getMaterial(calc.materialId);
                      const TypeIcon = material ? typeIcons[material.type] || Square : null;

                      return (
                        <div
                          key={calc.roomId}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border',
                            calc.materialId ? 'border-border' : 'border-amber-500/30 bg-amber-500/5'
                          )}
                        >
                          <div
                            className="w-4 h-4 rounded border flex-shrink-0"
                            style={{ backgroundColor: room?.color }}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{calc.roomName}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatArea(calc.netAreaM2)}
                              {material && (
                                <span className="ml-2">
                                  • {material.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {material ? (
                              <>
                                <div className="text-right">
                                  <p className="font-medium tabular-nums">
                                    {formatCurrency(calc.totalCost)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {calc.wastePercent.toFixed(0)}% waste
                                  </p>
                                </div>
                                <Check className="w-4 h-4 text-primary" />
                              </>
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Material Summary */}
            <Accordion type="single" collapsible defaultValue="materials">
              <AccordionItem value="materials" className="border-none">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Material Summary</span>
                    <Badge variant="secondary" className="ml-2">
                      {report.materialSummary.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {report.materialSummary.map(summary => {
                      const TypeIcon = typeIcons[summary.materialType] || Square;
                      
                      return (
                        <div
                          key={summary.materialId}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        >
                          <TypeIcon className="w-5 h-5 text-muted-foreground" />
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{summary.materialName}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {summary.materialType}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm tabular-nums">
                              {summary.totalQuantity.toFixed(2)} {summary.unit}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @ {formatCurrency(summary.unitPrice)}/{summary.unit}
                            </p>
                          </div>

                          <div className="text-right min-w-[80px]">
                            <p className="font-medium tabular-nums">
                              {formatCurrency(summary.totalCost)}
                            </p>
                            {summary.wastePercent !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                {summary.wastePercent.toFixed(0)}% waste
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Pricing Options */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Pricing Options
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                {/* Labor */}
                <div className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-labor" className="text-sm">Include Labor</Label>
                    <Switch
                      id="include-labor"
                      checked={includeLabor}
                      onCheckedChange={setIncludeLabor}
                    />
                  </div>
                  {includeLabor && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Rate ($/m²)</Label>
                      <Input
                        type="number"
                        value={laborRate}
                        onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                  )}
                </div>

                {/* Markup */}
                <div className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm">Markup</Label>
                  </div>
                  <div className="space-y-1.5">
                    <Input
                      type="number"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                      className="h-8"
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      + {formatCurrency(markupAmount)}
                    </p>
                  </div>
                </div>

                {/* Discount */}
                <div className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm">Discount</Label>
                  </div>
                  <div className="space-y-1.5">
                    <Input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="h-8"
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      - {formatCurrency(discountAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Cost Summary */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Materials</span>
                <span className="tabular-nums">{formatCurrency(materialCost)}</span>
              </div>
              
              {includeLabor && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Labor ({report.totalNetArea.toFixed(1)} m² × ${laborRate})
                  </span>
                  <span className="tabular-nums">{formatCurrency(laborCost)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              
              {markupPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Markup ({markupPercent}%)</span>
                  <span className="tabular-nums text-primary">
                    + {formatCurrency(markupAmount)}
                  </span>
                </div>
              )}
              
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount ({discountPercent}%)</span>
                  <span className="tabular-nums text-destructive">
                    - {formatCurrency(discountAmount)}
                  </span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="tabular-nums text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
