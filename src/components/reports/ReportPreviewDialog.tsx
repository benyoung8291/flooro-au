import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Printer, FileText, Building2, User, Eye } from 'lucide-react';
import { ReportSummary, formatCurrency, formatArea, formatLength } from '@/lib/reports/calculations';
import { exportToPDF } from '@/lib/reports/pdfGenerator';
import { ClientDetailsForm, ClientDetails } from './ClientDetailsForm';
import { CompanyBrandingForm, CompanyBranding } from './CompanyBrandingForm';
import { useUserOrganization } from '@/hooks/useUserProfile';
import { Room } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectAddress?: string;
  report: ReportSummary;
  rooms?: Room[];
  materials?: Material[];
}

const defaultClientDetails: ClientDetails = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  clientAddress: '',
  notes: '',
};

const defaultCompanyBranding: CompanyBranding = {
  companyName: '',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  companyWebsite: '',
  logoUrl: null,
  termsAndConditions: 'This estimate is valid for 30 days. A 50% deposit is required to begin work. Final payment is due upon completion. Prices do not include removal of existing flooring unless specified.',
};

export function ReportPreviewDialog({
  open,
  onOpenChange,
  projectName,
  projectAddress,
  report,
  rooms = [],
  materials = [],
}: ReportPreviewDialogProps) {
  const { data: organization } = useUserOrganization();
  
  const [clientDetails, setClientDetails] = useState<ClientDetails>(defaultClientDetails);
  const [companyBranding, setCompanyBranding] = useState<CompanyBranding>(defaultCompanyBranding);
  const [includeSeamDiagrams, setIncludeSeamDiagrams] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');

  // Update company branding when organization loads or dialog opens
  useEffect(() => {
    if (organization && open) {
      setCompanyBranding({
        companyName: organization.name || '',
        companyEmail: organization.email || '',
        companyPhone: organization.phone || '',
        companyAddress: organization.address || '',
        companyWebsite: organization.website || '',
        logoUrl: organization.logo_url || null,
        termsAndConditions: organization.terms_and_conditions || defaultCompanyBranding.termsAndConditions,
      });
    }
  }, [organization, open]);

  const handleExport = () => {
    exportToPDF({
      projectName,
      projectAddress,
      report,
      clientDetails: clientDetails.clientName ? clientDetails : undefined,
      companyBranding: companyBranding.companyName ? companyBranding : undefined,
      includeSeamDiagrams,
      includeFinishesSchedule: rooms.some(r => r.materialCode),
      rooms,
      materials,
    });
  };

  const hasRollGoods = report.roomCalculations.some(room => room.stripPlan);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Estimate Report</DialogTitle>
          <DialogDescription>
            Customize your professional proposal before exporting
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="preview" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="client" className="text-xs">
              <User className="w-3 h-3 mr-1" />
              Client Details
            </TabsTrigger>
            <TabsTrigger value="branding" className="text-xs">
              <Building2 className="w-3 h-3 mr-1" />
              Company
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 m-0 mt-4 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-6 pb-4 pr-4">
                {/* Project Info */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{projectName}</h3>
                      {projectAddress && (
                        <p className="text-sm text-muted-foreground mt-1">{projectAddress}</p>
                      )}
                    </div>
                    {clientDetails.clientName && (
                      <div className="text-right text-sm">
                        <p className="font-medium">{clientDetails.clientName}</p>
                        {clientDetails.clientEmail && (
                          <p className="text-muted-foreground">{clientDetails.clientEmail}</p>
                        )}
                      </div>
                    )}
                  </div>
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

                {/* Seam Diagrams Info */}
                {hasRollGoods && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Include seam & cut diagrams in PDF</span>
                    </div>
                    <Switch
                      checked={includeSeamDiagrams}
                      onCheckedChange={setIncludeSeamDiagrams}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="client" className="flex-1 m-0 mt-4 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="pr-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Add client information to personalize the proposal
                </p>
                <ClientDetailsForm
                  value={clientDetails}
                  onChange={setClientDetails}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="branding" className="flex-1 m-0 mt-4 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="pr-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Customize your company branding for professional proposals
                </p>
                <CompanyBrandingForm
                  value={companyBranding}
                  onChange={setCompanyBranding}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator />
        
        <div className="flex justify-between items-center pt-4">
          <div className="text-xs text-muted-foreground">
            {companyBranding.companyName && (
              <span>From: {companyBranding.companyName}</span>
            )}
            {clientDetails.clientName && (
              <span className="ml-2">• To: {clientDetails.clientName}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleExport}>
              <Printer className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}