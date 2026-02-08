import { MaterialsList } from '@/components/materials/MaterialsList';
import { CreateMaterialDialog } from '@/components/materials/CreateMaterialDialog';
import { ImportProductDialog } from '@/components/materials/ImportProductDialog';
import { MaterialPresets } from '@/components/materials/MaterialPresets';

export default function Materials() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Materials Library</h1>
          <p className="text-muted-foreground">
            Manage flooring materials with precise dimensions and pricing. Import products from manufacturer websites using AI.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MaterialPresets />
          <ImportProductDialog />
          <CreateMaterialDialog />
        </div>
      </div>

      <MaterialsList />
    </div>
  );
}
