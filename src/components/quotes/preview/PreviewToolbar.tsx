import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import type { QuotePdfSettings } from '@/hooks/useQuotePdfSettings';

interface Props {
  settings: QuotePdfSettings;
  onUpdate: (key: keyof QuotePdfSettings, value: boolean) => void;
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <Label htmlFor={id} className="text-sm cursor-pointer">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function PreviewToolbar({ settings, onUpdate }: Props) {
  const [open, setOpen] = useState(false);

  // Count active toggles for indicator
  const activeCount = [
    !settings.hideParentQty,
    !settings.hideParentPricing,
    settings.showSubItems,
    settings.showSubItems && !settings.hideSubItemQty,
    settings.showSubItems && !settings.hideSubItemPricing,
  ].filter(Boolean).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Display Options
          <span className="ml-1 bg-primary/10 text-primary text-xs font-mono px-1.5 py-0.5 rounded-full">
            {activeCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-4 space-y-1">
          {/* Parent Items Group */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Parent Items
          </p>
          <ToggleRow
            id="hide-parent-qty"
            label="Show Quantity"
            checked={!settings.hideParentQty}
            onChange={(v) => onUpdate('hideParentQty', !v)}
          />
          <ToggleRow
            id="hide-parent-pricing"
            label="Show Pricing"
            checked={!settings.hideParentPricing}
            onChange={(v) => onUpdate('hideParentPricing', !v)}
          />
        </div>

        <Separator />

        <div className="p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Sub-items
          </p>
          <ToggleRow
            id="show-sub-items"
            label="Show Sub-items"
            checked={settings.showSubItems}
            onChange={(v) => onUpdate('showSubItems', v)}
          />

          {settings.showSubItems && (
            <div className="pl-4 border-l-2 border-border ml-2 space-y-0.5 mt-1">
              <ToggleRow
                id="hide-sub-qty"
                label="Show Quantity"
                checked={!settings.hideSubItemQty}
                onChange={(v) => onUpdate('hideSubItemQty', !v)}
              />
              <ToggleRow
                id="hide-sub-pricing"
                label="Show Pricing"
                checked={!settings.hideSubItemPricing}
                onChange={(v) => onUpdate('hideSubItemPricing', !v)}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
