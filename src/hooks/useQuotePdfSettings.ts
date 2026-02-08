import { useState, useEffect, useCallback } from 'react';

export interface QuotePdfSettings {
  showSubItems: boolean;
  hideParentQty: boolean;
  hideParentPricing: boolean;
  hideSubItemQty: boolean;
  hideSubItemPricing: boolean;
}

const STORAGE_KEY = 'quote-pdf-settings';

const DEFAULTS: QuotePdfSettings = {
  showSubItems: true,
  hideParentQty: false,
  hideParentPricing: false,
  hideSubItemQty: false,
  hideSubItemPricing: true, // FieldFlow default
};

function load(): QuotePdfSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function useQuotePdfSettings() {
  const [settings, setSettings] = useState<QuotePdfSettings>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback(
    (key: keyof QuotePdfSettings, value: boolean) => {
      setSettings(prev => {
        const next = { ...prev, [key]: value };
        // When sub-items are hidden, reset sub-specific toggles
        if (key === 'showSubItems' && !value) {
          next.hideSubItemQty = false;
          next.hideSubItemPricing = false;
        }
        return next;
      });
    },
    [],
  );

  // Derived visibility helpers
  const showQtyColumn = !(
    settings.hideParentQty &&
    (!settings.showSubItems || settings.hideSubItemQty)
  );
  const showUnitPriceColumn = !(
    settings.hideParentPricing &&
    (!settings.showSubItems || settings.hideSubItemPricing)
  );
  const showTotalColumn = !(
    settings.hideParentPricing &&
    (!settings.showSubItems || settings.hideSubItemPricing)
  );

  const visibleColumnCount =
    1 + // description always
    (showQtyColumn ? 1 : 0) +
    (showUnitPriceColumn ? 1 : 0) +
    (showTotalColumn ? 1 : 0);

  return {
    settings,
    update,
    showQtyColumn,
    showUnitPriceColumn,
    showTotalColumn,
    visibleColumnCount,
  };
}
