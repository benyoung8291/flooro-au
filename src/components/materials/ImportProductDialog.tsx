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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, ExternalLink, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCreateMaterial, MaterialSubtype } from '@/hooks/useMaterials';

const urlSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
});

interface ExtractedProduct {
  name: string;
  type: 'roll' | 'tile' | 'linear';
  subtype?: MaterialSubtype;
  range?: string;
  colour?: string;
  backing?: string;
  widthMm?: number;
  lengthMm?: number;
  rollWidthMm?: number;
  rollLengthM?: number;
  pricePerM2?: number;
  pricePerRoll?: number;
  manufacturer?: string;
  sku?: string;
  imageUrl?: string;
  description?: string;
}

export function ImportProductDialog() {
  const [open, setOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedProduct, setExtractedProduct] = useState<ExtractedProduct | null>(null);
  const createMaterial = useCreateMaterial();
  
  const form = useForm<z.infer<typeof urlSchema>>({
    resolver: zodResolver(urlSchema),
    defaultValues: { url: '' },
  });

  const handleExtract = async (values: z.infer<typeof urlSchema>) => {
    setIsExtracting(true);
    setExtractedProduct(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-product', {
        body: { url: values.url },
      });
      
      if (error) throw error;
      
      if (data?.product) {
        setExtractedProduct(data.product);
        toast.success('Product details extracted successfully');
      } else {
        toast.error('Could not extract product details from this page');
      }
    } catch (error) {
      console.error('Extract error:', error);
      toast.error('Failed to extract product. Please try a different URL.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImport = async () => {
    if (!extractedProduct) return;
    
    try {
      await createMaterial.mutateAsync({
        name: extractedProduct.name,
        type: extractedProduct.type,
        subtype: extractedProduct.subtype,
        specs: {
          range: extractedProduct.range,
          colour: extractedProduct.colour,
          backing: extractedProduct.backing,
          widthMm: extractedProduct.widthMm,
          lengthMm: extractedProduct.lengthMm,
          rollWidthMm: extractedProduct.rollWidthMm,
          rollLengthM: extractedProduct.rollLengthM,
          pricePerM2: extractedProduct.pricePerM2,
          pricePerRoll: extractedProduct.pricePerRoll,
          manufacturer: extractedProduct.manufacturer,
          sku: extractedProduct.sku,
          imageUrl: extractedProduct.imageUrl,
          manufacturerUrl: form.getValues('url'),
          wastePercent: 10,
          price: extractedProduct.pricePerM2 || 0,
        },
      });
      
      setOpen(false);
      setExtractedProduct(null);
      form.reset();
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleReset = () => {
    setExtractedProduct(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="w-4 h-4 mr-2" />
          Import with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Import Product from URL
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleExtract)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacturer Product Page URL</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://manufacturer.com/product/carpet-tile" 
                        {...field} 
                        disabled={isExtracting}
                      />
                      <Button 
                        type="submit" 
                        disabled={isExtracting}
                        className="shrink-0"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          'Extract'
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        
        {extractedProduct && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {extractedProduct.imageUrl && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={extractedProduct.imageUrl} 
                      alt={extractedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{extractedProduct.name}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {extractedProduct.type}
                    </Badge>
                    {extractedProduct.subtype && (
                      <Badge variant="outline" className="text-xs">
                        {extractedProduct.subtype.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    {extractedProduct.range && (
                      <p>Range: {extractedProduct.range}</p>
                    )}
                    {extractedProduct.colour && (
                      <p>Colour: {extractedProduct.colour}</p>
                    )}
                    {extractedProduct.backing && (
                      <p>Backing: {extractedProduct.backing}</p>
                    )}
                    {extractedProduct.widthMm && extractedProduct.lengthMm && (
                      <p>Dimensions: {extractedProduct.widthMm} × {extractedProduct.lengthMm}mm</p>
                    )}
                    {extractedProduct.rollWidthMm && (
                      <p>Roll width: {(extractedProduct.rollWidthMm / 1000).toFixed(2)}m</p>
                    )}
                    {extractedProduct.pricePerM2 && (
                      <p>Price: ${extractedProduct.pricePerM2.toFixed(2)}/m²</p>
                    )}
                    {extractedProduct.manufacturer && (
                      <p>Manufacturer: {extractedProduct.manufacturer}</p>
                    )}
                    {extractedProduct.sku && (
                      <p className="font-mono text-xs">SKU: {extractedProduct.sku}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleImport}
                  disabled={createMaterial.isPending}
                >
                  {createMaterial.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Import Material
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <p className="text-xs text-muted-foreground">
          Paste a product page URL from a flooring manufacturer website. AI will extract product details including dimensions, pricing, and images.
        </p>
      </DialogContent>
    </Dialog>
  );
}
