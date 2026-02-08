import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { usePriceBook, PriceBookCategory, CATEGORY_LABELS } from '@/hooks/usePriceBook';
import { PriceBookCard } from '@/components/pricebook/PriceBookCard';
import { CreatePriceBookItemDialog } from '@/components/pricebook/CreatePriceBookItemDialog';

const ALL_CATEGORIES: PriceBookCategory[] = ['installation_labor', 'sundry', 'accessory', 'other'];

export default function PriceBook() {
  const { data: items, isLoading } = usePriceBook();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PriceBookCategory | null>(null);

  const filtered = items?.filter(item => {
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description?.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !activeCategory || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Price Book</h1>
          <p className="text-muted-foreground">
            Manage installation rates, sundries, and accessories for quoting.
          </p>
        </div>
        <div className="shrink-0">
          <CreatePriceBookItemDialog />
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search items..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={activeCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveCategory(null)}
          >
            All ({items?.length || 0})
          </Badge>
          {ALL_CATEGORIES.map(cat => {
            const count = items?.filter(i => i.category === cat).length || 0;
            return (
              <Badge
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <PriceBookCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            {search || activeCategory ? 'No items match your filters' : 'No price book items yet'}
          </p>
          <CreatePriceBookItemDialog />
        </div>
      )}
    </div>
  );
}
