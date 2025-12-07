import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from 'lucide-react';
import { useCreateMaterial, Material, MaterialSubtype, BACKING_OPTIONS } from '@/hooks/useMaterials';

// Dimension presets
const TILE_PRESETS = [
  { label: '500×500', widthMm: 500, lengthMm: 500 },
  { label: '1000×250', widthMm: 1000, lengthMm: 250 },
  { label: '610×610', widthMm: 610, lengthMm: 610 },
  { label: '300×300', widthMm: 300, lengthMm: 300 },
  { label: '300×600', widthMm: 300, lengthMm: 600 },
  { label: '600×600', widthMm: 600, lengthMm: 600 },
  { label: '1200×600', widthMm: 1200, lengthMm: 600 },
];

const ROLL_WIDTH_PRESETS = [
  { label: '2m (Sheet Vinyl)', widthMm: 2000 },
  { label: '3m (Sheet Vinyl)', widthMm: 3000 },
  { label: '4m (Sheet Vinyl)', widthMm: 4000 },
  { label: '3.66m (Broadloom)', widthMm: 3660 },
  { label: '4m (Broadloom)', widthMm: 4000 },
  { label: '4.57m (Broadloom)', widthMm: 4570 },
];

const materialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['roll', 'tile', 'linear']),
  subtype: z.string().optional(),
  
  // Product identification
  range: z.string().optional(),
  colour: z.string().optional(),
  backing: z.string().optional(),
  
  // Tile dimensions (mm)
  widthMm: z.coerce.number().positive().optional(),
  lengthMm: z.coerce.number().positive().optional(),
  
  // Tile packaging
  tilesPerBox: z.coerce.number().positive().optional(),
  pricePerBox: z.coerce.number().min(0).optional(),
  
  // Roll dimensions
  rollWidthMm: z.coerce.number().positive().optional(),
  rollLengthM: z.coerce.number().positive().optional(),
  patternRepeatMm: z.coerce.number().min(0).optional(),
  
  // Pricing
  pricePerM2: z.coerce.number().min(0).optional(),
  pricePerRoll: z.coerce.number().min(0).optional(),
  pricePerLinearM: z.coerce.number().min(0).optional(),
  
  // Waste
  wastePercent: z.coerce.number().min(0).max(50).optional(),
  
  // Metadata
  manufacturer: z.string().optional(),
  sku: z.string().optional(),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface CreateMaterialDialogProps {
  onSuccess?: (material: Material) => void;
}

export function CreateMaterialDialog({ onSuccess }: CreateMaterialDialogProps) {
  const [open, setOpen] = useState(false);
  const createMaterial = useCreateMaterial();
  
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: '',
      type: 'tile',
      wastePercent: 10,
    },
  });

  const selectedType = form.watch('type');
  const selectedSubtype = form.watch('subtype');

  const applyTilePreset = (preset: typeof TILE_PRESETS[0]) => {
    form.setValue('widthMm', preset.widthMm);
    form.setValue('lengthMm', preset.lengthMm);
  };

  const applyRollPreset = (preset: typeof ROLL_WIDTH_PRESETS[0]) => {
    form.setValue('rollWidthMm', preset.widthMm);
    if (preset.label.includes('Broadloom')) {
      form.setValue('subtype', 'broadloom_carpet');
    } else if (preset.label.includes('Vinyl')) {
      form.setValue('subtype', 'sheet_vinyl');
    }
  };

  // Check if backing should be shown for this subtype
  const showBacking = selectedSubtype && Object.keys(BACKING_OPTIONS).includes(selectedSubtype);
  const backingOptions = selectedSubtype ? BACKING_OPTIONS[selectedSubtype] || [] : [];

  const onSubmit = async (values: MaterialFormValues) => {
    // Calculate box coverage if tiles per box is provided
    let boxCoverageM2: number | undefined;
    if (values.tilesPerBox && values.widthMm && values.lengthMm) {
      const tileAreaM2 = (values.widthMm / 1000) * (values.lengthMm / 1000);
      boxCoverageM2 = tileAreaM2 * values.tilesPerBox;
    }

    await createMaterial.mutateAsync({
      name: values.name,
      type: values.type,
      subtype: values.subtype as MaterialSubtype | undefined,
      specs: {
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
        manufacturer: values.manufacturer,
        sku: values.sku,
        // Legacy compatibility
        price: values.pricePerM2 || values.pricePerLinearM || 0,
      },
    });
    
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Material
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Material</DialogTitle>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                
                {/* Packaging - Tiles per box */}
                <div className="pt-2 border-t border-border/50">
                  <FormLabel className="text-muted-foreground">Packaging (Optional)</FormLabel>
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
                          <FormDescription>Optional</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMaterial.isPending}>
                {createMaterial.isPending ? 'Creating...' : 'Create Material'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
