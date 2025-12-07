import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Material, useUpdateMaterial, MaterialSubtype, BACKING_OPTIONS } from '@/hooks/useMaterials';

// Dimension presets
const TILE_PRESETS = [
  { label: '500×500', widthMm: 500, lengthMm: 500 },
  { label: '1000×250', widthMm: 1000, lengthMm: 250 },
  { label: '610×610', widthMm: 610, lengthMm: 610 },
  { label: '300×300', widthMm: 300, lengthMm: 300 },
  { label: '300×600', widthMm: 300, lengthMm: 600 },
  { label: '600×600', widthMm: 600, lengthMm: 600 },
];

const ROLL_WIDTH_PRESETS = [
  { label: '2m', widthMm: 2000 },
  { label: '3m', widthMm: 3000 },
  { label: '3.66m', widthMm: 3660 },
  { label: '4m', widthMm: 4000 },
];

const materialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['roll', 'tile', 'linear']),
  subtype: z.string().optional(),
  range: z.string().optional(),
  colour: z.string().optional(),
  backing: z.string().optional(),
  widthMm: z.coerce.number().positive().optional().or(z.literal('')),
  lengthMm: z.coerce.number().positive().optional().or(z.literal('')),
  rollWidthMm: z.coerce.number().positive().optional().or(z.literal('')),
  rollLengthM: z.coerce.number().positive().optional().or(z.literal('')),
  patternRepeatMm: z.coerce.number().min(0).optional().or(z.literal('')),
  pricePerM2: z.coerce.number().min(0).optional().or(z.literal('')),
  pricePerRoll: z.coerce.number().min(0).optional().or(z.literal('')),
  pricePerLinearM: z.coerce.number().min(0).optional().or(z.literal('')),
  wastePercent: z.coerce.number().min(0).max(50).optional().or(z.literal('')),
  manufacturer: z.string().optional(),
  sku: z.string().optional(),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface EditMaterialDialogProps {
  material: Material;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMaterialDialog({ material, open, onOpenChange }: EditMaterialDialogProps) {
  const updateMaterial = useUpdateMaterial();
  
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: material.name,
      type: material.type,
      subtype: material.subtype || '',
      range: material.specs.range || '',
      colour: material.specs.colour || '',
      backing: material.specs.backing || '',
      widthMm: material.specs.widthMm || '',
      lengthMm: material.specs.lengthMm || '',
      rollWidthMm: material.specs.rollWidthMm || (material.specs.width ? material.specs.width * 1000 : ''),
      rollLengthM: material.specs.rollLengthM || '',
      patternRepeatMm: material.specs.patternRepeatMm || '',
      pricePerM2: material.specs.pricePerM2 || material.specs.price || '',
      pricePerRoll: material.specs.pricePerRoll || '',
      pricePerLinearM: material.specs.pricePerLinearM || '',
      wastePercent: material.specs.wastePercent ?? 10,
      manufacturer: material.specs.manufacturer || '',
      sku: material.specs.sku || '',
    },
  });

  const selectedType = form.watch('type');
  const selectedSubtype = form.watch('subtype');
  
  // Check if backing should be shown for this subtype
  const showBacking = selectedSubtype && Object.keys(BACKING_OPTIONS).includes(selectedSubtype);
  const backingOptions = selectedSubtype ? BACKING_OPTIONS[selectedSubtype] || [] : [];

  const applyTilePreset = (preset: typeof TILE_PRESETS[0]) => {
    form.setValue('widthMm', preset.widthMm);
    form.setValue('lengthMm', preset.lengthMm);
  };

  const applyRollPreset = (preset: typeof ROLL_WIDTH_PRESETS[0]) => {
    form.setValue('rollWidthMm', preset.widthMm);
  };

  const onSubmit = async (values: MaterialFormValues) => {
    await updateMaterial.mutateAsync({
      id: material.id,
      name: values.name,
      type: values.type,
      subtype: values.subtype as MaterialSubtype | undefined,
      specs: {
        range: values.range || undefined,
        colour: values.colour || undefined,
        backing: values.backing || undefined,
        widthMm: typeof values.widthMm === 'number' ? values.widthMm : undefined,
        lengthMm: typeof values.lengthMm === 'number' ? values.lengthMm : undefined,
        rollWidthMm: typeof values.rollWidthMm === 'number' ? values.rollWidthMm : undefined,
        rollLengthM: typeof values.rollLengthM === 'number' ? values.rollLengthM : undefined,
        patternRepeatMm: typeof values.patternRepeatMm === 'number' ? values.patternRepeatMm : undefined,
        pricePerM2: typeof values.pricePerM2 === 'number' ? values.pricePerM2 : undefined,
        pricePerRoll: typeof values.pricePerRoll === 'number' ? values.pricePerRoll : undefined,
        pricePerLinearM: typeof values.pricePerLinearM === 'number' ? values.pricePerLinearM : undefined,
        wastePercent: typeof values.wastePercent === 'number' ? values.wastePercent : undefined,
        manufacturer: values.manufacturer,
        sku: values.sku,
        // Legacy compatibility
        price: typeof values.pricePerM2 === 'number' ? values.pricePerM2 : (typeof values.pricePerLinearM === 'number' ? values.pricePerLinearM : 0),
      },
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Material</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Urban Retreat UR101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Range and Colour */}
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
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tile">Tile / Plank</SelectItem>
                        <SelectItem value="roll">Roll Goods</SelectItem>
                        <SelectItem value="linear">Linear</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subtype"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedType === 'tile' && (
                          <>
                            <SelectItem value="carpet_tile">Carpet Tile</SelectItem>
                            <SelectItem value="ceramic_tile">Ceramic Tile</SelectItem>
                            <SelectItem value="vinyl_plank">Vinyl Plank</SelectItem>
                            <SelectItem value="lvt">LVT</SelectItem>
                          </>
                        )}
                        {selectedType === 'roll' && (
                          <>
                            <SelectItem value="broadloom_carpet">Broadloom Carpet</SelectItem>
                            <SelectItem value="sheet_vinyl">Sheet Vinyl</SelectItem>
                          </>
                        )}
                        {selectedType === 'linear' && (
                          <>
                            <SelectItem value="baseboard">Baseboard</SelectItem>
                            <SelectItem value="transition_strip">Transition Strip</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Backing - shown for relevant subtypes */}
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
            {selectedType === 'tile' && (
              <div className="space-y-3">
                <FormLabel>Tile Dimensions (mm)</FormLabel>
                <div className="flex flex-wrap gap-1.5">
                  {TILE_PRESETS.map((preset) => (
                    <Badge
                      key={preset.label}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => applyTilePreset(preset)}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
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
              </div>
            )}
            
            {/* Roll Dimensions */}
            {selectedType === 'roll' && (
              <div className="space-y-3">
                <FormLabel>Roll Specifications</FormLabel>
                <div className="flex flex-wrap gap-1.5">
                  {ROLL_WIDTH_PRESETS.map((preset) => (
                    <Badge
                      key={preset.label}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => applyRollPreset(preset)}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
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
                        <Input type="number" placeholder="0 for no pattern" {...field} />
                      </FormControl>
                      <FormDescription>Leave 0 if no pattern matching required</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Pricing Section */}
            <div className="space-y-3 pt-2 border-t">
              <FormLabel className="text-base">Pricing</FormLabel>
              
              {selectedType === 'linear' ? (
                <FormField
                  control={form.control}
                  name="pricePerLinearM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per linear meter ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="12.50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
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
                  
                  {selectedType === 'roll' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="pricePerRoll"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Roll Price ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="850.00" {...field} />
                            </FormControl>
                            <FormDescription>Optional bulk price</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pricePerLinearM"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cut Price/m ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="55.00" {...field} />
                            </FormControl>
                            <FormDescription>For partial rolls</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Waste & Metadata */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <FormField
                control={form.control}
                name="wastePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waste %</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU / Product Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMaterial.isPending}>
                {updateMaterial.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
