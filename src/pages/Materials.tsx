import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft } from 'lucide-react';
import { MaterialsList } from '@/components/materials/MaterialsList';
import { CreateMaterialDialog } from '@/components/materials/CreateMaterialDialog';
import { ImportProductDialog } from '@/components/materials/ImportProductDialog';
import { MaterialPresets } from '@/components/materials/MaterialPresets';
export default function Materials() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src="/favicon.png" alt="Flooro" className="w-9 h-9" />
            <span className="text-xl font-semibold text-foreground">Materials</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MaterialPresets />
            <ImportProductDialog />
            <CreateMaterialDialog />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Materials Library</h1>
          <p className="text-muted-foreground">
            Manage flooring materials with precise dimensions and pricing. Import products from manufacturer websites using AI.
          </p>
        </div>

        <MaterialsList />
      </main>
    </div>
  );
}
