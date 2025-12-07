import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, Square, Circle, Minus, Globe, Ruler, DollarSign } from 'lucide-react';
import { Material, useDeleteMaterial, getMaterialDimensions, getMaterialPrice } from '@/hooks/useMaterials';
import { EditMaterialDialog } from './EditMaterialDialog';

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

const subtypeLabels: Record<string, string> = {
  broadloom_carpet: 'Broadloom',
  sheet_vinyl: 'Sheet Vinyl',
  carpet_tile: 'Carpet Tile',
  ceramic_tile: 'Ceramic',
  vinyl_plank: 'Vinyl Plank',
  lvt: 'LVT',
  baseboard: 'Baseboard',
  transition_strip: 'Transition',
};

interface MaterialCardProps {
  material: Material;
}

export function MaterialCard({ material }: MaterialCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deleteMaterial = useDeleteMaterial();
  
  const Icon = typeIcons[material.type] || Square;
  const isEditable = !material.is_global;
  const dimensions = getMaterialDimensions(material);
  const primaryPrice = getMaterialPrice(material.specs);

  const handleDelete = async () => {
    await deleteMaterial.mutateAsync(material.id);
    setShowDeleteDialog(false);
  };

  // Format pricing display
  const getPricingDisplay = () => {
    const { specs, type } = material;
    const parts: string[] = [];
    
    if (type === 'linear' && specs.pricePerLinearM) {
      return `$${specs.pricePerLinearM.toFixed(2)}/m`;
    }
    
    if (specs.pricePerM2 || specs.price) {
      parts.push(`$${(specs.pricePerM2 || specs.price || 0).toFixed(2)}/m²`);
    }
    
    if (type === 'roll') {
      if (specs.pricePerRoll) {
        parts.push(`$${specs.pricePerRoll.toFixed(2)}/roll`);
      }
      if (specs.pricePerLinearM) {
        parts.push(`$${specs.pricePerLinearM.toFixed(2)}/m cut`);
      }
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No price';
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon with optional product image */}
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {material.specs.imageUrl ? (
                <img 
                  src={material.specs.imageUrl} 
                  alt={material.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon className="w-6 h-6 text-primary" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{material.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {material.type}
                    </Badge>
                    {material.subtype && subtypeLabels[material.subtype] && (
                      <Badge variant="outline" className="text-xs">
                        {subtypeLabels[material.subtype]}
                      </Badge>
                    )}
                    {material.is_global && (
                      <Badge variant="outline" className="text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        Global
                      </Badge>
                    )}
                  </div>
                </div>
                
                {isEditable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <div className="mt-3 space-y-1.5 text-sm">
                {/* Dimensions */}
                {dimensions && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ruler className="w-3.5 h-3.5" />
                    <span className="font-mono">{dimensions}</span>
                  </div>
                )}
                
                {/* Pattern repeat for roll goods */}
                {material.type === 'roll' && material.specs.patternRepeatMm && material.specs.patternRepeatMm > 0 && (
                  <div className="text-muted-foreground text-xs">
                    Pattern repeat: {material.specs.patternRepeatMm}mm
                  </div>
                )}
                
                {/* Pricing */}
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono font-medium text-foreground">
                    {getPricingDisplay()}
                  </span>
                </div>
                
                {/* Waste percentage */}
                {material.specs.wastePercent !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    +{material.specs.wastePercent}% waste factor
                  </div>
                )}
                
                {/* Manufacturer & SKU */}
                {(material.specs.manufacturer || material.specs.sku) && (
                  <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                    {material.specs.manufacturer && <span>{material.specs.manufacturer}</span>}
                    {material.specs.manufacturer && material.specs.sku && <span> • </span>}
                    {material.specs.sku && <span className="font-mono">{material.specs.sku}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{material.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMaterial.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {showEditDialog && (
        <EditMaterialDialog 
          material={material} 
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </>
  );
}
