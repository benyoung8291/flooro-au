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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PriceBookItem, useUpdatePriceBookItem, CATEGORY_LABELS, PRICING_TYPE_LABELS, PriceBookCategory, PricingType } from '@/hooks/usePriceBook';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['installation_labor', 'sundry', 'accessory', 'other']),
  pricing_type: z.enum(['per_m2', 'per_linear_m', 'per_unit', 'fixed', 'per_hour']),
  cost_rate: z.coerce.number().min(0),
  sell_rate: z.coerce.number().min(0),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditPriceBookItemDialogProps {
  item: PriceBookItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPriceBookItemDialog({ item, open, onOpenChange }: EditPriceBookItemDialogProps) {
  const updateItem = useUpdatePriceBookItem();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item.name,
      category: item.category,
      pricing_type: item.pricing_type,
      cost_rate: item.cost_rate,
      sell_rate: item.sell_rate,
      description: item.description || '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    await updateItem.mutateAsync({
      id: item.id,
      name: values.name,
      category: values.category as PriceBookCategory,
      pricing_type: values.pricing_type as PricingType,
      cost_rate: values.cost_rate,
      sell_rate: values.sell_rate,
      description: values.description || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Price Book Item</DialogTitle>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.entries(CATEGORY_LABELS) as [PriceBookCategory, string][]).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="pricing_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.entries(PRICING_TYPE_LABELS) as [PricingType, string][]).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Rate ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sell_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sell Rate ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateItem.isPending}>
                {updateItem.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
