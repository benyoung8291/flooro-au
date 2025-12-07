import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Layers, 
  Package, 
  FileText,
  ChevronRight,
  Square,
  Circle,
  Minus
} from 'lucide-react';

interface EditorSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

// Placeholder material data
const materials = [
  { id: '1', name: 'Berber Carpet - Gray', type: 'roll', specs: { width: 3.66, price: 45 } },
  { id: '2', name: 'Luxury Vinyl Plank - Oak', type: 'roll', specs: { width: 1.22, price: 65 } },
  { id: '3', name: 'Porcelain Tile 12x24', type: 'tile', specs: { width: 0.3, height: 0.6, price: 8 } },
  { id: '4', name: 'Hardwood - Walnut', type: 'roll', specs: { width: 0.15, price: 120 } },
  { id: '5', name: 'Rubber Baseboard', type: 'linear', specs: { price: 12 } },
];

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

export function EditorSidebar({ collapsed, onToggle }: EditorSidebarProps) {
  const [selectedTab, setSelectedTab] = useState('materials');

  if (collapsed) {
    return (
      <div className="w-12 h-full border-l border-border bg-card flex flex-col items-center py-2 gap-1">
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Separator className="my-2" />
        <Button 
          variant={selectedTab === 'materials' ? 'secondary' : 'ghost'} 
          size="icon"
          onClick={() => { setSelectedTab('materials'); onToggle?.(); }}
        >
          <Package className="w-4 h-4" />
        </Button>
        <Button 
          variant={selectedTab === 'layers' ? 'secondary' : 'ghost'} 
          size="icon"
          onClick={() => { setSelectedTab('layers'); onToggle?.(); }}
        >
          <Layers className="w-4 h-4" />
        </Button>
        <Button 
          variant={selectedTab === 'report' ? 'secondary' : 'ghost'} 
          size="icon"
          onClick={() => { setSelectedTab('report'); onToggle?.(); }}
        >
          <FileText className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 h-full border-l border-border bg-card flex flex-col">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex flex-col h-full">
        <div className="px-3 pt-3 pb-2 border-b border-border">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="materials" className="text-xs">
              <Package className="w-3 h-3 mr-1" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="layers" className="text-xs">
              <Layers className="w-3 h-3 mr-1" />
              Layers
            </TabsTrigger>
            <TabsTrigger value="report" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Report
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="materials" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                Drag materials onto rooms to apply
              </p>
              {materials.map(material => {
                const Icon = typeIcons[material.type] || Square;
                return (
                  <div
                    key={material.id}
                    className="p-3 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-grab transition-colors"
                    draggable
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{material.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {material.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            ${material.specs.price}/m²
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="layers" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <p className="text-sm text-muted-foreground text-center py-8">
                Draw rooms to see layers here
              </p>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="report" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <p className="text-sm text-muted-foreground text-center py-8">
                Add rooms and materials to generate a report
              </p>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
