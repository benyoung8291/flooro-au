import ExcelJS from 'exceljs';
import type { Quote } from '@/hooks/useQuotes';
import type { LineItem } from '@/hooks/useQuoteLineItems';
import type { OrganizationBranding } from '@/hooks/useOrganizationBranding';
import type { QuoteOwnerProfile } from '@/hooks/useQuoteOwnerProfile';
import { format } from 'date-fns';

// ─── Styles ──────────────────────────────────────────────────────────

const NAVY: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1B2A4A' },
};

const LIGHT_GREY: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F4F7' },
};

const SUBTLE_STRIPE: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFAFBFC' },
};

const TOTAL_BG: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE8EDF5' },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  left: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  right: { style: 'thin', color: { argb: 'FFD0D5DD' } },
};

const CURRENCY_FMT = '$#,##0.00';

const FONT_BODY: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10 };
const FONT_BOLD: Partial<ExcelJS.Font> = { ...FONT_BODY, bold: true };
const FONT_HEADER: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
const FONT_COMPANY: Partial<ExcelJS.Font> = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1B2A4A' } };
const FONT_SECTION: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1B2A4A' } };
const FONT_MUTED: Partial<ExcelJS.Font> = { name: 'Calibri', size: 9, color: { argb: 'FF667085' } };
const FONT_LABEL: Partial<ExcelJS.Font> = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF667085' } };

// ─── Helpers ─────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function setCellStyle(
  row: ExcelJS.Row,
  col: number,
  value: string | number,
  opts?: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
    border?: Partial<ExcelJS.Borders>;
  }
) {
  const cell = row.getCell(col);
  cell.value = value;
  if (opts?.font) cell.font = opts.font;
  if (opts?.fill) cell.fill = opts.fill;
  if (opts?.alignment) cell.alignment = opts.alignment;
  if (opts?.numFmt) cell.numFmt = opts.numFmt;
  if (opts?.border) cell.border = opts.border;
}

// ─── Main Export ─────────────────────────────────────────────────────

export interface ExportQuoteParams {
  quote: Quote;
  lineItems: LineItem[];
  org: OrganizationBranding | null;
  owner: QuoteOwnerProfile | null;
}

export async function exportQuoteToExcel({ quote, lineItems, org, owner }: ExportQuoteParams): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = org?.name || 'Quote Export';
  wb.created = new Date();

  const ws = wb.addWorksheet('Quote', {
    properties: { defaultColWidth: 14 },
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Column widths: A=Description, B=Qty, C=Unit Price, D=Amount
  ws.columns = [
    { width: 52 },  // A – Description
    { width: 10 },  // B – Qty
    { width: 16 },  // C – Unit Price
    { width: 18 },  // D – Amount
  ];

  let row = 1;

  // ─── Company Header ──────────────────────────────────────────────

  const companyName = org?.name || 'Your Company';
  setCellStyle(ws.getRow(row), 1, companyName, { font: FONT_COMPANY });
  setCellStyle(ws.getRow(row), 3, 'Quote No.', { font: FONT_LABEL, alignment: { horizontal: 'right' } });
  setCellStyle(ws.getRow(row), 4, quote.quote_number, { font: FONT_BOLD, alignment: { horizontal: 'right' } });
  row++;

  if (org?.address) {
    setCellStyle(ws.getRow(row), 1, org.address, { font: FONT_MUTED });
  }
  setCellStyle(ws.getRow(row), 3, 'Date', { font: FONT_LABEL, alignment: { horizontal: 'right' } });
  setCellStyle(ws.getRow(row), 4, format(new Date(quote.created_at), 'dd MMM yyyy'), {
    font: FONT_BODY,
    alignment: { horizontal: 'right' },
  });
  row++;

  if (org?.phone) {
    setCellStyle(ws.getRow(row), 1, org.phone, { font: FONT_MUTED });
  }
  if (quote.valid_until) {
    setCellStyle(ws.getRow(row), 3, 'Valid Until', { font: FONT_LABEL, alignment: { horizontal: 'right' } });
    setCellStyle(ws.getRow(row), 4, format(new Date(quote.valid_until), 'dd MMM yyyy'), {
      font: FONT_BODY,
      alignment: { horizontal: 'right' },
    });
  }
  row++;

  const emailAbn = [org?.email, org?.abn ? `ABN: ${org.abn}` : null].filter(Boolean).join('  |  ');
  if (emailAbn) {
    setCellStyle(ws.getRow(row), 1, emailAbn, { font: FONT_MUTED });
  }
  row++;

  // Blank row
  row++;

  // ─── Client / Prepared By Block ──────────────────────────────────

  setCellStyle(ws.getRow(row), 1, 'QUOTE TO', { font: FONT_SECTION });
  setCellStyle(ws.getRow(row), 3, 'PREPARED BY', { font: FONT_SECTION });
  row++;

  const clientLines = [
    quote.client_name,
    quote.client_address,
    quote.client_email,
    quote.client_phone,
  ].filter(Boolean) as string[];

  const ownerLines = [
    owner?.full_name,
    owner?.email,
    owner?.phone,
  ].filter(Boolean) as string[];

  const maxLines = Math.max(clientLines.length, ownerLines.length, 1);
  for (let i = 0; i < maxLines; i++) {
    if (clientLines[i]) {
      setCellStyle(ws.getRow(row), 1, clientLines[i], { font: FONT_BODY });
    }
    if (ownerLines[i]) {
      setCellStyle(ws.getRow(row), 3, ownerLines[i], { font: FONT_BODY });
    }
    row++;
  }

  // Blank row
  row++;

  // ─── Quote Title ─────────────────────────────────────────────────

  if (quote.title) {
    ws.mergeCells(`A${row}:D${row}`);
    setCellStyle(ws.getRow(row), 1, quote.title, {
      font: { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1B2A4A' } },
    });
    row++;
    row++; // blank row after title
  }

  // ─── Description / Scope ─────────────────────────────────────────

  const descText = stripHtml(quote.description);
  if (descText) {
    ws.mergeCells(`A${row}:D${row}`);
    setCellStyle(ws.getRow(row), 1, descText, {
      font: FONT_BODY,
      alignment: { wrapText: true, vertical: 'top' },
    });
    // Estimate row height based on text length
    const lines = descText.split('\n').length;
    ws.getRow(row).height = Math.max(15, lines * 14);
    row++;
    row++; // blank row
  }

  // ─── Line Items Table ────────────────────────────────────────────

  // Separate standard vs optional items
  const standardItems = lineItems.filter(item => !item.is_optional);
  const optionalItems = lineItems.filter(item => item.is_optional);

  // Table header row
  const headerRow = ws.getRow(row);
  const headers = ['Description', 'Qty', 'Unit Price', 'Amount'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = FONT_HEADER;
    cell.fill = NAVY;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
  });
  headerRow.height = 24;
  row++;

  // Render items helper
  const renderItems = (items: LineItem[]) => {
    let itemIndex = 0;
    for (const parent of items) {
      const hasChildren = parent.subItems.length > 0;
      const parentRow = ws.getRow(row);
      parentRow.height = 20;

      // Parent description
      setCellStyle(parentRow, 1, parent.description, {
        font: FONT_BOLD,
        fill: LIGHT_GREY,
        border: THIN_BORDER,
        alignment: { vertical: 'middle' },
      });

      if (hasChildren) {
        // Parent with children: show aggregated total, no qty/unit price
        const aggTotal = parent.subItems
          .filter(c => !c.is_optional)
          .reduce((s, c) => s + c.line_total, 0);

        setCellStyle(parentRow, 2, '', { fill: LIGHT_GREY, border: THIN_BORDER });
        setCellStyle(parentRow, 3, '', { fill: LIGHT_GREY, border: THIN_BORDER });
        setCellStyle(parentRow, 4, aggTotal, {
          font: FONT_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });
      } else {
        // Standalone parent item
        setCellStyle(parentRow, 2, parent.quantity, {
          font: FONT_BODY,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: '0.00',
          alignment: { horizontal: 'right' },
        });
        setCellStyle(parentRow, 3, parent.sell_price, {
          font: FONT_BODY,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });
        setCellStyle(parentRow, 4, parent.line_total, {
          font: FONT_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });
      }
      row++;

      // Children
      if (hasChildren) {
        for (let ci = 0; ci < parent.subItems.length; ci++) {
          const child = parent.subItems[ci];
          const childRow = ws.getRow(row);
          const stripeFill = ci % 2 === 1 ? SUBTLE_STRIPE : undefined;

          setCellStyle(childRow, 1, `    ${child.description}`, {
            font: FONT_BODY,
            fill: stripeFill,
            border: THIN_BORDER,
            alignment: { vertical: 'middle' },
          });
          setCellStyle(childRow, 2, child.quantity, {
            font: FONT_BODY,
            fill: stripeFill,
            border: THIN_BORDER,
            numFmt: '0.00',
            alignment: { horizontal: 'right' },
          });
          setCellStyle(childRow, 3, child.sell_price, {
            font: FONT_BODY,
            fill: stripeFill,
            border: THIN_BORDER,
            numFmt: CURRENCY_FMT,
            alignment: { horizontal: 'right' },
          });
          setCellStyle(childRow, 4, child.line_total, {
            font: FONT_BODY,
            fill: stripeFill,
            border: THIN_BORDER,
            numFmt: CURRENCY_FMT,
            alignment: { horizontal: 'right' },
          });
          row++;
        }
      }

      itemIndex++;
    }
  };

  renderItems(standardItems);

  // ─── Optional Items ──────────────────────────────────────────────

  if (optionalItems.length > 0) {
    row++; // blank row

    // Optional header
    ws.mergeCells(`A${row}:D${row}`);
    setCellStyle(ws.getRow(row), 1, 'OPTIONAL ITEMS', {
      font: FONT_SECTION,
    });
    row++;

    // Repeat table header for optional section
    const optHeaderRow = ws.getRow(row);
    headers.forEach((h, i) => {
      const cell = optHeaderRow.getCell(i + 1);
      cell.value = h;
      cell.font = FONT_HEADER;
      cell.fill = NAVY;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
    });
    optHeaderRow.height = 24;
    row++;

    renderItems(optionalItems);
  }

  // ─── Totals ──────────────────────────────────────────────────────

  row++; // blank row

  // Subtotal
  const subtotalRow = ws.getRow(row);
  setCellStyle(subtotalRow, 3, 'Subtotal', {
    font: FONT_BOLD,
    alignment: { horizontal: 'right' },
  });
  setCellStyle(subtotalRow, 4, quote.subtotal, {
    font: FONT_BODY,
    numFmt: CURRENCY_FMT,
    alignment: { horizontal: 'right' },
  });
  row++;

  // GST
  const gstRow = ws.getRow(row);
  setCellStyle(gstRow, 3, `GST (${quote.tax_rate}%)`, {
    font: FONT_BOLD,
    alignment: { horizontal: 'right' },
  });
  setCellStyle(gstRow, 4, quote.tax_amount, {
    font: FONT_BODY,
    numFmt: CURRENCY_FMT,
    alignment: { horizontal: 'right' },
  });
  row++;

  // Grand Total
  const totalRow = ws.getRow(row);
  totalRow.height = 28;
  setCellStyle(totalRow, 3, 'TOTAL', {
    font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1B2A4A' } },
    fill: TOTAL_BG,
    border: THIN_BORDER,
    alignment: { horizontal: 'right', vertical: 'middle' },
  });
  setCellStyle(totalRow, 4, quote.total_amount, {
    font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1B2A4A' } },
    fill: TOTAL_BG,
    border: THIN_BORDER,
    numFmt: CURRENCY_FMT,
    alignment: { horizontal: 'right', vertical: 'middle' },
  });
  row++;

  // ─── Notes ───────────────────────────────────────────────────────

  const notesText = stripHtml(quote.notes);
  if (notesText) {
    row++; // blank row
    ws.mergeCells(`A${row}:D${row}`);
    setCellStyle(ws.getRow(row), 1, 'NOTES', { font: FONT_SECTION });
    row++;

    ws.mergeCells(`A${row}:D${row}`);
    setCellStyle(ws.getRow(row), 1, notesText, {
      font: FONT_BODY,
      alignment: { wrapText: true, vertical: 'top' },
    });
    const noteLines = notesText.split('\n').length;
    ws.getRow(row).height = Math.max(15, noteLines * 14);
    row++;
  }

  // ─── Terms & Conditions ──────────────────────────────────────────

  const termsText = stripHtml(quote.terms_and_conditions);
  if (termsText) {
    row++; // blank row
    ws.mergeCells(`A${row}:D${row}`);
    setCellStyle(ws.getRow(row), 1, 'TERMS & CONDITIONS', { font: FONT_SECTION });
    row++;

    ws.mergeCells(`A${row}:D${row}`);
    setCellStyle(ws.getRow(row), 1, termsText, {
      font: { name: 'Calibri', size: 9, color: { argb: 'FF667085' } },
      alignment: { wrapText: true, vertical: 'top' },
    });
    const termLines = termsText.split('\n').length;
    ws.getRow(row).height = Math.max(15, termLines * 14);
    row++;
  }

  // ─── Print Setup ─────────────────────────────────────────────────

  ws.headerFooter.oddFooter = `&C&8Page &P of &N  |  ${quote.quote_number}`;

  // ─── Generate & Download ─────────────────────────────────────────

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const clientSlug = quote.client_name || 'Quote';
  const fileName = `${quote.quote_number} - ${clientSlug}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
