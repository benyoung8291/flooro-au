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
import { MoreHorizontal, Pencil, Trash2, Globe, DollarSign, Hammer, Package, Wrench, HelpCircle } from 'lucide-react';
import { PriceBookItem, useDeletePriceBookItem, CATEGORY_LABELS, PRICING_TYPE_LABELS } from '@/hooks/usePriceBook';
import { EditPriceBookItemDialog } from './EditPriceBookItemDialog';

const categoryIcons: Record<string, React.ElementType> = {
  installation_labor: Hammer,
  sundry: Package,
  accessory: Wrench,
  other: HelpCircle,
};

const categoryColors: Record<string, string> = {
  installation_labor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  sundry: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  accessory: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  other: 'bg-muted text-muted-foreground',
};

interface PriceBookCardProps {
  item: PriceBookItem;
}

export function PriceBookCard({ item }: PriceBookCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deleteItem = useDeletePriceBookItem();
  
  const Icon = categoryIcons[item.category] || HelpCircle;
  const isEditable = !item.is_global;

  const handleDelete = async () => {
    await deleteItem.mutateAsync(item.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryColors[item.category] || categoryColors.other}`}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {PRICING_TYPE_LABELS[item.pricing_type]}
                    </Badge>
                    {item.is_global && (
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
              
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Cost</div>
                    <span className="font-mono font-medium">
                      ${item.cost_rate.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Sell</div>
                    <span className="font-mono font-medium text-primary">
                      ${item.sell_rate.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price Book Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{item.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {showEditDialog && (
        <EditPriceBookItemDialog 
          item={item} 
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </>
  );
}
