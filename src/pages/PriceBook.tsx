import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Search } from 'lucide-react';
import { usePriceBook, PriceBookCategory, CATEGORY_LABELS } from '@/hooks/usePriceBook';
import { PriceBookCard } from '@/components/pricebook/PriceBookCard';
import { CreatePriceBookItemDialog } from '@/components/pricebook/CreatePriceBookItemDialog';

const ALL_CATEGORIES: PriceBookCategory[] = ['installation_labor', 'sundry', 'accessory', 'other'];

export default function PriceBook() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src="/favicon.png" alt="Flooro" className="w-9 h-9" />
            <span className="text-xl font-semibold text-foreground">Price Book</span>
          </div>
          
          <div className="flex items-center gap-2">
            <CreatePriceBookItemDialog />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Price Book</h1>
          <p className="text-muted-foreground">
            Manage installation rates, sundries, and accessories for quoting.
          </p>
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
      </main>
    </div>
  );
}
