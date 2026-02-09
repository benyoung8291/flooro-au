import type { LineItem } from '@/hooks/useQuoteLineItems';

function escapeCsvField(value: string): string {
  if (value === '') return '';
  // If the field contains commas, quotes, or newlines, wrap in double quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

interface ExportQuoteToCsvOptions {
  quoteNumber: string;
  lineItems: LineItem[];
}

export function exportQuoteToCsv({ quoteNumber, lineItems }: ExportQuoteToCsvOptions) {
  const headers = [
    'group',
    'description',
    'quantity',
    'unit',
    'cost_price',
    'sell_price',
    'margin_percent',
    'line_cost',
    'line_sell',
    'is_optional',
    'source_room_id',
    'price_book_item_id',
  ];

  const rows: string[][] = [];

  // Sort parents by item_order
  const parents = [...lineItems].sort((a, b) => a.item_order - b.item_order);

  for (const parent of parents) {
    const children = [...(parent.subItems || [])].sort((a, b) => a.item_order - b.item_order);
    const hasChildren = children.length > 0;

    if (hasChildren) {
      // Output each child with the parent description as the group
      for (const child of children) {
        const unit = (child.metadata?.unit as string) || '';
        rows.push([
          escapeCsvField(parent.description),
          escapeCsvField(child.description),
          formatNumber(child.quantity),
          escapeCsvField(unit),
          formatNumber(child.cost_price),
          formatNumber(child.sell_price),
          formatNumber(child.margin_percentage),
          formatNumber(child.quantity * child.cost_price),
          formatNumber(child.quantity * child.sell_price),
          child.is_optional ? 'TRUE' : 'FALSE',
          child.source_room_id || '',
          child.price_book_item_id || '',
        ]);
      }
    } else {
      // Standalone parent — output as its own row with group blank
      const unit = (parent.metadata?.unit as string) || '';
      rows.push([
        '',
        escapeCsvField(parent.description),
        formatNumber(parent.quantity),
        escapeCsvField(unit),
        formatNumber(parent.cost_price),
        formatNumber(parent.sell_price),
        formatNumber(parent.margin_percentage),
        formatNumber(parent.quantity * parent.cost_price),
        formatNumber(parent.quantity * parent.sell_price),
        parent.is_optional ? 'TRUE' : 'FALSE',
        parent.source_room_id || '',
        parent.price_book_item_id || '',
      ]);
    }
  }

  // Build CSV string
  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel compatibility
    headers.join(',') +
    '\n' +
    rows.map((row) => row.join(',')).join('\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${quoteNumber} - Line Items.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
