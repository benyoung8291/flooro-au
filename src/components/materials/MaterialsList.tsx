import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Square, Circle, Minus } from 'lucide-react';
import { useMaterials, Material } from '@/hooks/useMaterials';
import { MaterialCard } from './MaterialCard';

export function MaterialsList() {
  const { data: materials, isLoading } = useMaterials();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'roll' | 'tile' | 'linear'>('all');

  const filteredMaterials = materials?.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || material.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const globalMaterials = filteredMaterials?.filter(m => m.is_global) || [];
  const orgMaterials = filteredMaterials?.filter(m => !m.is_global) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="roll" className="gap-1">
              <Square className="w-3 h-3" /> Roll
            </TabsTrigger>
            <TabsTrigger value="tile" className="gap-1">
              <Circle className="w-3 h-3" /> Tile
            </TabsTrigger>
            <TabsTrigger value="linear" className="gap-1">
              <Minus className="w-3 h-3" /> Linear
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {orgMaterials.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Your Materials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgMaterials.map(material => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        </section>
      )}

      {globalMaterials.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Global Materials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalMaterials.map(material => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        </section>
      )}

      {filteredMaterials?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {search ? (
            <p>No materials found matching "{search}"</p>
          ) : (
            <p>No materials available. Add your first material to get started.</p>
          )}
        </div>
      )}
    </div>
  );
}
