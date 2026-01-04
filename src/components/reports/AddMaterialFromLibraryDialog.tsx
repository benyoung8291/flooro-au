import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Square, Circle, Minus, Check, Building2 } from 'lucide-react';
import { Material, MaterialSpecs } from '@/hooks/useMaterials';
import { cn } from '@/lib/utils';

interface AddMaterialFromLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryMaterials: Material[];
  existingMaterialIds: string[];
  onAdd: (materials: Material[]) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

export function AddMaterialFromLibraryDialog({
  open,
  onOpenChange,
  libraryMaterials,
  existingMaterialIds,
  onAdd,
}: AddMaterialFromLibraryDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredMaterials = useMemo(() => {
    return libraryMaterials.filter(m => {
      // Filter by type
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const specs = m.specs as MaterialSpecs;
        const searchableText = [
          m.name,
          specs.range,
          specs.colour,
          specs.manufacturer,
          specs.sku,
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) return false;
      }
      
      return true;
    });
  }, [libraryMaterials, searchQuery, typeFilter]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const selectedMaterials = libraryMaterials.filter(m => selectedIds.has(m.id));
    onAdd(selectedMaterials);
    setSelectedIds(new Set());
    setSearchQuery('');
    setTypeFilter('all');
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedIds(new Set());
    setSearchQuery('');
    setTypeFilter('all');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add from Material Library</DialogTitle>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search materials..."
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="roll">Roll</SelectItem>
              <SelectItem value="tile">Tile</SelectItem>
              <SelectItem value="linear">Linear</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Materials List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1 py-2">
            {filteredMaterials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No materials found
              </div>
            ) : (
              filteredMaterials.map(material => {
                const Icon = typeIcons[material.type] || Square;
                const specs = material.specs as MaterialSpecs;
                const isSelected = selectedIds.has(material.id);
                const isAlreadyAdded = existingMaterialIds.includes(material.id);
                const price = specs.pricePerM2 || specs.price || 0;

                return (
                  <div
                    key={material.id}
                    onClick={() => !isAlreadyAdded && handleToggle(material.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isAlreadyAdded && "opacity-50 cursor-not-allowed",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isAlreadyAdded}
                      onCheckedChange={() => handleToggle(material.id)}
                    />
                    
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{material.name}</span>
                        {material.is_global && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
                            <Building2 className="w-2.5 h-2.5 mr-0.5" />
                            Global
                          </Badge>
                        )}
                        {isAlreadyAdded && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                            <Check className="w-2.5 h-2.5 mr-0.5" />
                            Added
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {specs.range && <span>{specs.range}</span>}
                        {specs.colour && <span>• {specs.colour}</span>}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm">${price.toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">/m²</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={selectedIds.size === 0}>
                Add {selectedIds.size > 0 && `(${selectedIds.size})`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
