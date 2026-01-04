import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCcw, Save, Info } from 'lucide-react';
import { ProjectMaterial } from '@/lib/canvas/types';
import { Material, MaterialSpecs, BACKING_OPTIONS } from '@/hooks/useMaterials';

const materialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  materialCode: z.string().min(1, 'Code is required').max(10),
  range: z.string().optional(),
  colour: z.string().optional(),
  backing: z.string().optional(),
  widthMm: z.coerce.number().positive().optional(),
  lengthMm: z.coerce.number().positive().optional(),
  tilesPerBox: z.coerce.number().positive().optional(),
  pricePerBox: z.coerce.number().min(0).optional(),
  rollWidthMm: z.coerce.number().positive().optional(),
  rollLengthM: z.coerce.number().positive().optional(),
  patternRepeatMm: z.coerce.number().min(0).optional(),
  pricePerM2: z.coerce.number().min(0).optional(),
  pricePerRoll: z.coerce.number().min(0).optional(),
  pricePerLinearM: z.coerce.number().min(0).optional(),
  wastePercent: z.coerce.number().min(0).max(50).optional(),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface EditProjectMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: ProjectMaterial;
  sourceMaterial?: Material;
  onSave: (updates: Partial<ProjectMaterial>) => void;
  onSaveToLibrary?: (material: ProjectMaterial) => Promise<void>;
}

export function EditProjectMaterialDialog({
  open,
  onOpenChange,
  material,
  sourceMaterial,
  onSave,
  onSaveToLibrary,
}: EditProjectMaterialDialogProps) {
  const specs = material.specs as MaterialSpecs;
  const sourceSpecs = sourceMaterial?.specs as MaterialSpecs | undefined;
  
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: material.name,
      materialCode: material.materialCode,
      range: specs.range || '',
      colour: specs.colour || '',
      backing: specs.backing || '',
      widthMm: specs.widthMm,
      lengthMm: specs.lengthMm,
      tilesPerBox: specs.tilesPerBox,
      pricePerBox: specs.pricePerBox,
      rollWidthMm: specs.rollWidthMm,
      rollLengthM: specs.rollLengthM,
      patternRepeatMm: specs.patternRepeatMm,
      pricePerM2: specs.pricePerM2 || specs.price,
      pricePerRoll: specs.pricePerRoll,
      pricePerLinearM: specs.pricePerLinearM,
      wastePercent: specs.wastePercent ?? 10,
    },
  });

  // Reset form when material changes
  useEffect(() => {
    const specs = material.specs as MaterialSpecs;
    form.reset({
      name: material.name,
      materialCode: material.materialCode,
      range: specs.range || '',
      colour: specs.colour || '',
      backing: specs.backing || '',
      widthMm: specs.widthMm,
      lengthMm: specs.lengthMm,
      tilesPerBox: specs.tilesPerBox,
      pricePerBox: specs.pricePerBox,
      rollWidthMm: specs.rollWidthMm,
      rollLengthM: specs.rollLengthM,
      patternRepeatMm: specs.patternRepeatMm,
      pricePerM2: specs.pricePerM2 || specs.price,
      pricePerRoll: specs.pricePerRoll,
      pricePerLinearM: specs.pricePerLinearM,
      wastePercent: specs.wastePercent ?? 10,
    });
  }, [material, form]);

  const selectedSubtype = material.subtype;
  const showBacking = selectedSubtype && Object.keys(BACKING_OPTIONS).includes(selectedSubtype);
  const backingOptions = selectedSubtype ? BACKING_OPTIONS[selectedSubtype] || [] : [];

  const handleResetToSource = () => {
    if (!sourceMaterial || !sourceSpecs) return;
    
    form.reset({
      name: sourceMaterial.name,
      materialCode: material.materialCode, // Keep the project-specific code
      range: sourceSpecs.range || '',
      colour: sourceSpecs.colour || '',
      backing: sourceSpecs.backing || '',
      widthMm: sourceSpecs.widthMm,
      lengthMm: sourceSpecs.lengthMm,
      tilesPerBox: sourceSpecs.tilesPerBox,
      pricePerBox: sourceSpecs.pricePerBox,
      rollWidthMm: sourceSpecs.rollWidthMm,
      rollLengthM: sourceSpecs.rollLengthM,
      patternRepeatMm: sourceSpecs.patternRepeatMm,
      pricePerM2: sourceSpecs.pricePerM2 || sourceSpecs.price,
      pricePerRoll: sourceSpecs.pricePerRoll,
      pricePerLinearM: sourceSpecs.pricePerLinearM,
      wastePercent: sourceSpecs.wastePercent ?? 10,
    });
  };

  const handleSubmit = (values: MaterialFormValues) => {
    let boxCoverageM2: number | undefined;
    if (values.tilesPerBox && values.widthMm && values.lengthMm) {
      const tileAreaM2 = (values.widthMm / 1000) * (values.lengthMm / 1000);
      boxCoverageM2 = tileAreaM2 * values.tilesPerBox;
    }

    // Detect overrides from source
    const overrides: ProjectMaterial['overrides'] = {};
    if (sourceSpecs) {
      if (values.pricePerM2 !== (sourceSpecs.pricePerM2 || sourceSpecs.price)) {
        overrides.price = true;
      }
      if (values.colour !== sourceSpecs.colour) {
        overrides.colour = true;
      }
      if (values.name !== sourceMaterial?.name) {
        overrides.name = true;
      }
    }

    onSave({
      name: values.name,
      materialCode: values.materialCode.toUpperCase(),
      specs: {
        ...material.specs,
        range: values.range,
        colour: values.colour,
        backing: values.backing,
        widthMm: values.widthMm,
        lengthMm: values.lengthMm,
        tilesPerBox: values.tilesPerBox,
        boxCoverageM2,
        pricePerBox: values.pricePerBox,
        rollWidthMm: values.rollWidthMm,
        rollLengthM: values.rollLengthM,
        patternRepeatMm: values.patternRepeatMm,
        pricePerM2: values.pricePerM2,
        pricePerRoll: values.pricePerRoll,
        pricePerLinearM: values.pricePerLinearM,
        wastePercent: values.wastePercent,
        price: values.pricePerM2 || values.pricePerLinearM || 0,
      },
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Edit Project Material</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form id="edit-material-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
              {/* Source Material Info */}
              {sourceMaterial && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-xs">
                      Imported from: <strong>{sourceMaterial.name}</strong>
                    </span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={handleResetToSource}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset to Source
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="materialCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="CP01" 
                          className="font-mono uppercase" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Material name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="range"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range / Collection</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Urban Retreat" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="colour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colour</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Ash Grey" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showBacking && backingOptions.length > 0 && (
                <FormField
                  control={form.control}
                  name="backing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backing</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select backing type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {backingOptions.map((backing) => (
                            <SelectItem key={backing} value={backing}>
                              {backing}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Tile Dimensions */}
              {material.type === 'tile' && (
                <div className="space-y-3">
                  <FormLabel className="text-muted-foreground">Tile Dimensions (mm)</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="widthMm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Width (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lengthMm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="pt-2 border-t border-border/50">
                    <FormLabel className="text-muted-foreground">Packaging</FormLabel>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <FormField
                        control={form.control}
                        name="tilesPerBox"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiles per Box</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="16" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pricePerBox"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price per Box ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="45.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Roll Dimensions */}
              {material.type === 'roll' && (
                <div className="space-y-3">
                  <FormLabel className="text-muted-foreground">Roll Specifications</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rollWidthMm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roll Width (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="3660" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rollLengthM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roll Length (m)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="patternRepeatMm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pattern Repeat (mm)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Pricing Section */}
              <div className="space-y-3 pt-2 border-t">
                <FormLabel className="text-base">Pricing</FormLabel>
                
                {material.type === 'linear' ? (
                  <FormField
                    control={form.control}
                    name="pricePerLinearM"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Linear Meter ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5.50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="pricePerM2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per m² ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="45.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {material.type === 'roll' && (
                  <FormField
                    control={form.control}
                    name="pricePerRoll"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Roll ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="1200.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Waste Factor */}
              <FormField
                control={form.control}
                name="wastePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waste Factor (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 pt-4 border-t gap-2">
          {material.isCustom && onSaveToLibrary && (
            <Button 
              type="button" 
              variant="outline"
              onClick={async () => {
                await onSaveToLibrary(material);
              }}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save to Library
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-material-form">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
