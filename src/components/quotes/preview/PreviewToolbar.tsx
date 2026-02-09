import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { QuotePdfSettings } from '@/hooks/useQuotePdfSettings';

interface Props {
  settings: QuotePdfSettings;
  onUpdate: (key: keyof QuotePdfSettings, value: boolean) => void;
}

function InlineToggle({
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
    <div className="flex items-center gap-1.5">
      <Label htmlFor={id} className="text-[11px] text-muted-foreground whitespace-nowrap cursor-pointer select-none">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
      />
    </div>
  );
}

export function PreviewToolbar({ settings, onUpdate }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <InlineToggle
        id="toggle-sub-items"
        label="Show Sub-Items"
        checked={settings.showSubItems}
        onChange={(v) => onUpdate('showSubItems', v)}
      />
      <InlineToggle
        id="toggle-hide-qty"
        label="Hide Qty"
        checked={settings.hideParentQty}
        onChange={(v) => onUpdate('hideParentQty', v)}
      />
      <InlineToggle
        id="toggle-hide-pricing"
        label="Hide Pricing"
        checked={settings.hideParentPricing}
        onChange={(v) => onUpdate('hideParentPricing', v)}
      />
      {settings.showSubItems && (
        <>
          <InlineToggle
            id="toggle-hide-sub-qty"
            label="Hide Sub Qty"
            checked={settings.hideSubItemQty}
            onChange={(v) => onUpdate('hideSubItemQty', v)}
          />
          <InlineToggle
            id="toggle-hide-sub-pricing"
            label="Hide Sub Pricing"
            checked={settings.hideSubItemPricing}
            onChange={(v) => onUpdate('hideSubItemPricing', v)}
          />
        </>
      )}
    </div>
  );
}
