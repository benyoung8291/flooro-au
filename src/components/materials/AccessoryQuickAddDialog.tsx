import { useState, useCallback, useMemo } from 'react';
import { Room, RoomAccessories, CovingConfig, WeldRodConfig, SmoothEdgeConfig, UnderlaymentConfig, AdhesiveConfig } from '@/lib/canvas/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Grip, 
  Layers, 
  Droplets,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';

interface AccessoryQuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialType: string;
  materialSubtype?: string;
  materialName?: string;
  room: Room;
  onApplyAccessories: (accessories: Partial<RoomAccessories>) => void;
  onSkip: () => void;
}

interface AccessoryOption {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultEnabled: boolean;
  category: 'perimeter' | 'seam' | 'subfloor';
}

export function AccessoryQuickAddDialog({
  open,
  onOpenChange,
  materialType,
  materialSubtype,
  materialName,
  room,
  onApplyAccessories,
  onSkip,
}: AccessoryQuickAddDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Get smart defaults based on material type/subtype
  const { options, defaults } = useMemo(() => {
    const opts: AccessoryOption[] = [];
    const defs: Record<string, boolean> = {};

    if (materialType === 'roll') {
      if (materialSubtype === 'sheet_vinyl') {
        // Sheet vinyl accessories
        opts.push({
          key: 'coving',
          label: 'Wall Coving',
          description: 'Vinyl cove base for wall/floor junction',
          icon: <Package className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'perimeter',
        });
        opts.push({
          key: 'weldRod',
          label: 'Weld Rod',
          description: 'Heat-welded seam sealer',
          icon: <Sparkles className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'seam',
        });
        opts.push({
          key: 'adhesive',
          label: 'Adhesive',
          description: 'Full-spread flooring adhesive',
          icon: <Droplets className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'subfloor',
        });
        
        defs.coving = true;
        defs.weldRod = true;
        defs.adhesive = true;
      } else if (materialSubtype === 'broadloom_carpet') {
        // Broadloom carpet accessories
        opts.push({
          key: 'smoothEdge',
          label: 'Smooth Edge / Gripper',
          description: 'Tack strip for stretched installation',
          icon: <Grip className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'perimeter',
        });
        opts.push({
          key: 'underlayment',
          label: 'Underlay',
          description: 'Foam or rubber carpet underlay',
          icon: <Layers className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'subfloor',
        });
        opts.push({
          key: 'adhesive',
          label: 'Adhesive (optional)',
          description: 'For glue-down installation',
          icon: <Droplets className="w-4 h-4" />,
          defaultEnabled: false,
          category: 'subfloor',
        });
        
        defs.smoothEdge = true;
        defs.underlayment = true;
        defs.adhesive = false;
      } else {
        // Generic roll material
        opts.push({
          key: 'adhesive',
          label: 'Adhesive',
          description: 'Flooring adhesive',
          icon: <Droplets className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'subfloor',
        });
        
        defs.adhesive = true;
      }
    } else if (materialType === 'tile') {
      if (materialSubtype === 'lvt' || materialSubtype === 'vinyl_plank') {
        // LVT/Vinyl Plank
        opts.push({
          key: 'underlayment',
          label: 'Underlayment',
          description: 'Foam or cork underlay for floating install',
          icon: <Layers className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'subfloor',
        });
        opts.push({
          key: 'adhesive',
          label: 'Adhesive',
          description: 'For glue-down installation',
          icon: <Droplets className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'subfloor',
        });
        
        defs.underlayment = true;
        defs.adhesive = true;
      } else if (materialSubtype === 'carpet_tile') {
        // Carpet Tile
        opts.push({
          key: 'adhesive',
          label: 'Adhesive',
          description: 'Tackifier or full-spread adhesive',
          icon: <Droplets className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'subfloor',
        });
        
        defs.adhesive = true;
      } else {
        // Generic tile
        opts.push({
          key: 'adhesive',
          label: 'Adhesive',
          description: 'Tile adhesive',
          icon: <Droplets className="w-4 h-4" />,
          defaultEnabled: true,
          category: 'subfloor',
        });
        
        defs.adhesive = true;
      }
    }

    return { options: opts, defaults: defs };
  }, [materialType, materialSubtype]);

  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, boolean>>(defaults);

  // Reset selections when dialog opens with new material
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setSelectedAccessories(defaults);
    }
    onOpenChange(isOpen);
  }, [onOpenChange, defaults]);

  const toggleAccessory = (key: string) => {
    setSelectedAccessories(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleApply = () => {
    // Store preference if "don't show again" is checked
    if (dontShowAgain) {
      localStorage.setItem('flooro_skip_accessory_prompt', 'true');
    }

    // Build accessories object
    const accessories: Partial<RoomAccessories> = {};

    if (selectedAccessories.coving) {
      accessories.coving = {
        enabled: true,
        heightMm: 100,
      } as CovingConfig;
    }

    if (selectedAccessories.weldRod) {
      accessories.weldRod = {
        enabled: true,
        colorMatch: true,
      } as WeldRodConfig;
    }

    if (selectedAccessories.smoothEdge) {
      accessories.smoothEdge = {
        enabled: true,
        doubleRow: false,
      } as SmoothEdgeConfig;
    }

    if (selectedAccessories.underlayment) {
      accessories.underlayment = {
        enabled: true,
        type: 'foam',
      } as UnderlaymentConfig;
    }

    if (selectedAccessories.adhesive) {
      accessories.adhesive = {
        enabled: true,
        type: 'full-spread',
        coverageRateM2PerUnit: 30,
      } as AdhesiveConfig;
    }

    onApplyAccessories(accessories);
    onOpenChange(false);
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem('flooro_skip_accessory_prompt', 'true');
    }
    onSkip();
    onOpenChange(false);
  };

  // Group options by category
  const perimeterOptions = options.filter(o => o.category === 'perimeter');
  const seamOptions = options.filter(o => o.category === 'seam');
  const subfloorOptions = options.filter(o => o.category === 'subfloor');

  const selectedCount = Object.values(selectedAccessories).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Add Accessories
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Recommended accessories for <span className="font-medium">{materialName}</span> in <span className="font-medium">{room.name}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Perimeter Products */}
          {perimeterOptions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Perimeter Products
              </h4>
              {perimeterOptions.map(option => (
                <AccessoryToggleCard
                  key={option.key}
                  option={option}
                  enabled={selectedAccessories[option.key] ?? false}
                  onToggle={() => toggleAccessory(option.key)}
                />
              ))}
            </div>
          )}

          {/* Seam Products */}
          {seamOptions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Seam Products
              </h4>
              {seamOptions.map(option => (
                <AccessoryToggleCard
                  key={option.key}
                  option={option}
                  enabled={selectedAccessories[option.key] ?? false}
                  onToggle={() => toggleAccessory(option.key)}
                />
              ))}
            </div>
          )}

          {/* Subfloor Products */}
          {subfloorOptions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Subfloor Products
              </h4>
              {subfloorOptions.map(option => (
                <AccessoryToggleCard
                  key={option.key}
                  option={option}
                  enabled={selectedAccessories[option.key] ?? false}
                  onToggle={() => toggleAccessory(option.key)}
                />
              ))}
            </div>
          )}

          <Separator />

          {/* Don't show again checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label htmlFor="dontShowAgain" className="text-xs text-muted-foreground cursor-pointer">
              Don't show this again
            </Label>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Skip
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button onClick={handleApply}>
            <Check className="w-4 h-4 mr-2" />
            Apply {selectedCount > 0 && `(${selectedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessoryToggleCard({
  option,
  enabled,
  onToggle,
}: {
  option: AccessoryOption;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        enabled 
          ? 'border-primary/50 bg-primary/5' 
          : 'border-border hover:border-border/80 hover:bg-muted/30'
      }`}
      onClick={onToggle}
    >
      <div className={`p-2 rounded-md ${enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {option.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{option.label}</span>
          {option.defaultEnabled && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Recommended
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{option.description}</p>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}