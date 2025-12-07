import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Grid3X3, Square, Rows3, Ruler } from 'lucide-react';
import { useCreateMaterial, MaterialSpecs, MaterialSubtype } from '@/hooks/useMaterials';
import { toast } from 'sonner';

interface MaterialPreset {
  name: string;
  type: 'roll' | 'tile' | 'linear';
  subtype: MaterialSubtype;
  specs: MaterialSpecs;
  icon: React.ReactNode;
}

const MATERIAL_PRESETS: MaterialPreset[] = [
  // Carpet Tiles
  {
    name: 'Carpet Tile 500×500mm',
    type: 'tile',
    subtype: 'carpet_tile',
    specs: {
      widthMm: 500,
      lengthMm: 500,
      pricePerM2: 45,
      wastePercent: 10,
    },
    icon: <Grid3X3 className="w-4 h-4" />,
  },
  {
    name: 'Carpet Plank 1000×250mm',
    type: 'tile',
    subtype: 'carpet_tile',
    specs: {
      widthMm: 1000,
      lengthMm: 250,
      pricePerM2: 55,
      wastePercent: 10,
    },
    icon: <Rows3 className="w-4 h-4" />,
  },
  // Ceramic Tiles
  {
    name: 'Ceramic Tile 300×300mm',
    type: 'tile',
    subtype: 'ceramic_tile',
    specs: {
      widthMm: 300,
      lengthMm: 300,
      pricePerM2: 35,
      wastePercent: 10,
    },
    icon: <Square className="w-4 h-4" />,
  },
  {
    name: 'Ceramic Tile 300×600mm',
    type: 'tile',
    subtype: 'ceramic_tile',
    specs: {
      widthMm: 300,
      lengthMm: 600,
      pricePerM2: 42,
      wastePercent: 10,
    },
    icon: <Rows3 className="w-4 h-4" />,
  },
  {
    name: 'Ceramic Tile 600×600mm',
    type: 'tile',
    subtype: 'ceramic_tile',
    specs: {
      widthMm: 600,
      lengthMm: 600,
      pricePerM2: 48,
      wastePercent: 10,
    },
    icon: <Square className="w-4 h-4" />,
  },
  // Vinyl Planks / LVT
  {
    name: 'Vinyl Plank 180×1220mm',
    type: 'tile',
    subtype: 'vinyl_plank',
    specs: {
      widthMm: 180,
      lengthMm: 1220,
      pricePerM2: 38,
      wastePercent: 10,
    },
    icon: <Rows3 className="w-4 h-4" />,
  },
  {
    name: 'LVT Tile 457×457mm',
    type: 'tile',
    subtype: 'lvt',
    specs: {
      widthMm: 457,
      lengthMm: 457,
      pricePerM2: 52,
      wastePercent: 10,
    },
    icon: <Square className="w-4 h-4" />,
  },
  // Sheet Vinyl
  {
    name: 'Sheet Vinyl 2m × 25m Roll',
    type: 'roll',
    subtype: 'sheet_vinyl',
    specs: {
      rollWidthMm: 2000,
      rollLengthM: 25,
      pricePerRoll: 650,
      pricePerLinearM: 32,
      wastePercent: 5,
    },
    icon: <Ruler className="w-4 h-4" />,
  },
  {
    name: 'Sheet Vinyl 3m × 25m Roll',
    type: 'roll',
    subtype: 'sheet_vinyl',
    specs: {
      rollWidthMm: 3000,
      rollLengthM: 25,
      pricePerRoll: 950,
      pricePerLinearM: 48,
      wastePercent: 5,
    },
    icon: <Ruler className="w-4 h-4" />,
  },
  {
    name: 'Sheet Vinyl 4m × 25m Roll',
    type: 'roll',
    subtype: 'sheet_vinyl',
    specs: {
      rollWidthMm: 4000,
      rollLengthM: 25,
      pricePerRoll: 1200,
      pricePerLinearM: 60,
      wastePercent: 5,
    },
    icon: <Ruler className="w-4 h-4" />,
  },
  // Broadloom Carpet
  {
    name: 'Broadloom Carpet 3.66m Wide',
    type: 'roll',
    subtype: 'broadloom_carpet',
    specs: {
      rollWidthMm: 3660,
      pricePerM2: 65,
      patternRepeatMm: 0,
      wastePercent: 10,
    },
    icon: <Ruler className="w-4 h-4" />,
  },
  {
    name: 'Broadloom Carpet 4m Wide',
    type: 'roll',
    subtype: 'broadloom_carpet',
    specs: {
      rollWidthMm: 4000,
      pricePerM2: 72,
      patternRepeatMm: 0,
      wastePercent: 10,
    },
    icon: <Ruler className="w-4 h-4" />,
  },
  // Linear
  {
    name: 'Standard Baseboard 100mm',
    type: 'linear',
    subtype: 'baseboard',
    specs: {
      pricePerLinearM: 8,
      wastePercent: 5,
    },
    icon: <Ruler className="w-4 h-4" />,
  },
  {
    name: 'Transition Strip',
    type: 'linear',
    subtype: 'transition_strip',
    specs: {
      pricePerLinearM: 12,
      wastePercent: 5,
    },
    icon: <Ruler className="w-4 h-4" />,
  },
];

export function MaterialPresets() {
  const createMaterial = useCreateMaterial();

  const handleCreateFromPreset = async (preset: MaterialPreset) => {
    try {
      await createMaterial.mutateAsync({
        name: preset.name,
        type: preset.type,
        subtype: preset.subtype,
        specs: preset.specs,
      });
      toast.success(`Created "${preset.name}"`);
    } catch (error) {
      toast.error('Failed to create material');
    }
  };

  const carpetTiles = MATERIAL_PRESETS.filter(p => p.subtype === 'carpet_tile');
  const ceramicTiles = MATERIAL_PRESETS.filter(p => p.subtype === 'ceramic_tile');
  const vinylProducts = MATERIAL_PRESETS.filter(p => ['vinyl_plank', 'lvt', 'sheet_vinyl'].includes(p.subtype));
  const broadloom = MATERIAL_PRESETS.filter(p => p.subtype === 'broadloom_carpet');
  const linear = MATERIAL_PRESETS.filter(p => p.type === 'linear');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Quick Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Carpet Tiles</DropdownMenuLabel>
        {carpetTiles.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => handleCreateFromPreset(preset)}
            className="gap-2 cursor-pointer"
          >
            {preset.icon}
            {preset.name}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Ceramic Tiles</DropdownMenuLabel>
        {ceramicTiles.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => handleCreateFromPreset(preset)}
            className="gap-2 cursor-pointer"
          >
            {preset.icon}
            {preset.name}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Vinyl Products</DropdownMenuLabel>
        {vinylProducts.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => handleCreateFromPreset(preset)}
            className="gap-2 cursor-pointer"
          >
            {preset.icon}
            {preset.name}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Broadloom Carpet</DropdownMenuLabel>
        {broadloom.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => handleCreateFromPreset(preset)}
            className="gap-2 cursor-pointer"
          >
            {preset.icon}
            {preset.name}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Linear Products</DropdownMenuLabel>
        {linear.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => handleCreateFromPreset(preset)}
            className="gap-2 cursor-pointer"
          >
            {preset.icon}
            {preset.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
