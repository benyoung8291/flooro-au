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
import { Plus } from 'lucide-react';
import { useCreateMaterial, Material } from '@/hooks/useMaterials';

const materialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['roll', 'tile', 'linear']),
  width: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  price: z.coerce.number().positive('Price must be positive'),
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
      type: 'roll',
      price: 0,
    },
  });

  const selectedType = form.watch('type');

  const onSubmit = async (values: MaterialFormValues) => {
    const result = await createMaterial.mutateAsync({
      name: values.name,
      type: values.type,
      specs: {
        price: values.price,
        ...(values.width ? { width: values.width } : {}),
        ...(values.height ? { height: values.height } : {}),
      },
    });
    
    setOpen(false);
    form.reset();
    onSuccess?.(result);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Material
        </Button>
      </DialogTrigger>
      <DialogContent>
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
                    <Input placeholder="e.g., Berber Carpet - Gray" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      <SelectItem value="roll">Roll (Width-based)</SelectItem>
                      <SelectItem value="tile">Tile (Width × Height)</SelectItem>
                      <SelectItem value="linear">Linear (Length-based)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {(selectedType === 'roll' || selectedType === 'tile') && (
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (meters)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 3.66" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {selectedType === 'tile' && (
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (meters)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 0.6" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per m²</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 45.00" {...field} />
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
