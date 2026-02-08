import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-xs whitespace-nowrap cursor-pointer">
        {label}
      </Label>
    </div>
  );
}

export function PreviewToolbar({ settings, onUpdate }: Props) {
  return (
    <div className="border-b border-border bg-card/60 print:hidden">
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
          Display
        </span>

        <ToggleRow
          id="show-sub-items"
          label="Show Sub-items"
          checked={settings.showSubItems}
          onChange={v => onUpdate('showSubItems', v)}
        />

        <Separator orientation="vertical" className="h-5" />

        <ToggleRow
          id="hide-parent-qty"
          label="Hide Qty"
          checked={settings.hideParentQty}
          onChange={v => onUpdate('hideParentQty', v)}
        />

        <ToggleRow
          id="hide-parent-pricing"
          label="Hide Pricing"
          checked={settings.hideParentPricing}
          onChange={v => onUpdate('hideParentPricing', v)}
        />

        {settings.showSubItems && (
          <>
            <Separator orientation="vertical" className="h-5" />

            <ToggleRow
              id="hide-sub-qty"
              label="Hide Sub Qty"
              checked={settings.hideSubItemQty}
              onChange={v => onUpdate('hideSubItemQty', v)}
            />

            <ToggleRow
              id="hide-sub-pricing"
              label="Hide Sub Pricing"
              checked={settings.hideSubItemPricing}
              onChange={v => onUpdate('hideSubItemPricing', v)}
            />
          </>
        )}
      </div>
    </div>
  );
}
