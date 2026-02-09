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

const CALC_BG: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF0F4FF' },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  left: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  right: { style: 'thin', color: { argb: 'FFD0D5DD' } },
};

const CURRENCY_FMT = '$#,##0.00';
const PERCENT_FMT = '0.00"%"';

const FONT_BODY: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10 };
const FONT_BOLD: Partial<ExcelJS.Font> = { ...FONT_BODY, bold: true };
const FONT_HEADER: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
const FONT_COMPANY: Partial<ExcelJS.Font> = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1B2A4A' } };
const FONT_SECTION: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1B2A4A' } };
const FONT_MUTED: Partial<ExcelJS.Font> = { name: 'Calibri', size: 9, color: { argb: 'FF667085' } };
const FONT_LABEL: Partial<ExcelJS.Font> = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF667085' } };
const FONT_FORMULA: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF3B5998' } };
const FONT_FORMULA_BOLD: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, bold: true, italic: true, color: { argb: 'FF3B5998' } };

// ─── Helpers ─────────────────────────────────────────────────────────

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
  value: string | number | ExcelJS.CellFormulaValue,
  opts?: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
    border?: Partial<ExcelJS.Borders>;
  }
) {
  const cell = row.getCell(col);
  cell.value = value as any;
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
    properties: { defaultColWidth: 14, outlineLevelCol: 0, outlineLevelRow: 1 },
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Column widths: A-G
  ws.columns = [
    { width: 44 },  // A – Description
    { width: 10 },  // B – Qty
    { width: 14 },  // C – Cost
    { width: 12 },  // D – Margin %
    { width: 14 },  // E – Sell
    { width: 16 },  // F – Line Cost
    { width: 16 },  // G – Line Sell
  ];

  let row = 1;

  // ─── Company Header ──────────────────────────────────────────────

  const companyName = org?.name || 'Your Company';
  setCellStyle(ws.getRow(row), 1, companyName, { font: FONT_COMPANY });
  setCellStyle(ws.getRow(row), 6, 'Quote No.', { font: FONT_LABEL, alignment: { horizontal: 'right' } });
  setCellStyle(ws.getRow(row), 7, quote.quote_number, { font: FONT_BOLD, alignment: { horizontal: 'right' } });
  row++;

  if (org?.address) {
    setCellStyle(ws.getRow(row), 1, org.address, { font: FONT_MUTED });
  }
  setCellStyle(ws.getRow(row), 6, 'Date', { font: FONT_LABEL, alignment: { horizontal: 'right' } });
  setCellStyle(ws.getRow(row), 7, format(new Date(quote.created_at), 'dd MMM yyyy'), {
    font: FONT_BODY,
    alignment: { horizontal: 'right' },
  });
  row++;

  if (org?.phone) {
    setCellStyle(ws.getRow(row), 1, org.phone, { font: FONT_MUTED });
  }
  if (quote.valid_until) {
    setCellStyle(ws.getRow(row), 6, 'Valid Until', { font: FONT_LABEL, alignment: { horizontal: 'right' } });
    setCellStyle(ws.getRow(row), 7, format(new Date(quote.valid_until), 'dd MMM yyyy'), {
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
  setCellStyle(ws.getRow(row), 5, 'PREPARED BY', { font: FONT_SECTION });
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
      setCellStyle(ws.getRow(row), 5, ownerLines[i], { font: FONT_BODY });
    }
    row++;
  }

  // Blank row
  row++;

  // ─── Quote Title ─────────────────────────────────────────────────

  if (quote.title) {
    ws.mergeCells(`A${row}:G${row}`);
    setCellStyle(ws.getRow(row), 1, quote.title, {
      font: { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1B2A4A' } },
    });
    row++;
    row++; // blank row after title
  }

  // ─── Description / Scope ─────────────────────────────────────────

  const descText = stripHtml(quote.description);
  if (descText) {
    ws.mergeCells(`A${row}:G${row}`);
    setCellStyle(ws.getRow(row), 1, descText, {
      font: FONT_BODY,
      alignment: { wrapText: true, vertical: 'top' },
    });
    const lines = descText.split('\n').length;
    ws.getRow(row).height = Math.max(15, lines * 14);
    row++;
    row++; // blank row
  }

  // ─── Line Items Table ────────────────────────────────────────────

  const standardItems = lineItems.filter(item => !item.is_optional);
  const optionalItems = lineItems.filter(item => item.is_optional);

  const HEADERS = ['Description', 'Qty', 'Cost', 'Margin %', 'Sell', 'Line Cost', 'Line Sell'];

  function writeTableHeader() {
    const headerRow = ws.getRow(row);
    HEADERS.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = FONT_HEADER;
      cell.fill = NAVY;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
    });
    headerRow.height = 24;
    row++;
  }

  // Track parent row numbers for totals formulas
  const standardParentRows: number[] = [];
  const optionalParentRows: number[] = [];

  function renderItems(items: LineItem[], parentRowTracker: number[]) {
    for (const parent of items) {
      const hasChildren = parent.subItems.length > 0;
      const parentRowNum = row;
      parentRowTracker.push(parentRowNum);
      const parentExcelRow = ws.getRow(row);
      parentExcelRow.height = 20;

      // Description (col A)
      setCellStyle(parentExcelRow, 1, parent.description, {
        font: FONT_BOLD,
        fill: LIGHT_GREY,
        border: THIN_BORDER,
        alignment: { vertical: 'middle' },
      });

      if (hasChildren) {
        // Parent with children: blank qty, formulas for aggregation
        // B (Qty) – blank
        setCellStyle(parentExcelRow, 2, '', { fill: LIGHT_GREY, border: THIN_BORDER });

        row++;

        // Render children first to know the row range
        const firstChildRow = row;
        for (let ci = 0; ci < parent.subItems.length; ci++) {
          const child = parent.subItems[ci];
          const childExcelRow = ws.getRow(row);
          const stripeFill = ci % 2 === 1 ? SUBTLE_STRIPE : undefined;

          // A – Description (indented)
          setCellStyle(childExcelRow, 1, `    ${child.description}`, {
            font: FONT_BODY,
            fill: stripeFill,
            border: THIN_BORDER,
            alignment: { vertical: 'middle' },
          });

          // B – Qty (editable value)
          setCellStyle(childExcelRow, 2, child.quantity, {
            font: FONT_BODY,
            fill: stripeFill,
            border: THIN_BORDER,
            numFmt: '0.00',
            alignment: { horizontal: 'right' },
          });

          // C – Cost (editable value)
          setCellStyle(childExcelRow, 3, child.cost_price, {
            font: FONT_BODY,
            fill: stripeFill,
            border: THIN_BORDER,
            numFmt: CURRENCY_FMT,
            alignment: { horizontal: 'right' },
          });

          // D – Margin % (editable value)
          setCellStyle(childExcelRow, 4, child.margin_percentage, {
            font: FONT_BODY,
            fill: stripeFill,
            border: THIN_BORDER,
            numFmt: '0.00',
            alignment: { horizontal: 'right' },
          });

          // E – Sell = Cost * (1 + Margin/100)
          setCellStyle(childExcelRow, 5, {
            formula: `C${row}*(1+D${row}/100)`,
            result: child.sell_price,
          }, {
            font: FONT_FORMULA,
            fill: stripeFill || CALC_BG,
            border: THIN_BORDER,
            numFmt: CURRENCY_FMT,
            alignment: { horizontal: 'right' },
          });

          // F – Line Cost = Qty * Cost
          setCellStyle(childExcelRow, 6, {
            formula: `B${row}*C${row}`,
            result: child.quantity * child.cost_price,
          }, {
            font: FONT_FORMULA,
            fill: stripeFill || CALC_BG,
            border: THIN_BORDER,
            numFmt: CURRENCY_FMT,
            alignment: { horizontal: 'right' },
          });

          // G – Line Sell = Qty * Sell
          setCellStyle(childExcelRow, 7, {
            formula: `B${row}*E${row}`,
            result: child.line_total,
          }, {
            font: FONT_FORMULA,
            fill: stripeFill || CALC_BG,
            border: THIN_BORDER,
            numFmt: CURRENCY_FMT,
            alignment: { horizontal: 'right' },
          });

          // Set outline level for grouping
          childExcelRow.outlineLevel = 1;

          row++;
        }
        const lastChildRow = row - 1;

        // Now fill in parent row formulas (C-G) referencing child range
        // C – Cost = SUM of Line Cost (total cost for the group)
        setCellStyle(parentExcelRow, 3, {
          formula: `SUM(F${firstChildRow}:F${lastChildRow})`,
          result: parent.subItems.reduce((s, c) => s + c.quantity * c.cost_price, 0),
        }, {
          font: FONT_FORMULA_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });

        // D – Margin % = IF(F>0, (G-F)/F*100, 0)
        const totalCost = parent.subItems.reduce((s, c) => s + c.quantity * c.cost_price, 0);
        const totalSell = parent.subItems.filter(c => !c.is_optional).reduce((s, c) => s + c.line_total, 0);
        const marginResult = totalCost > 0 ? ((totalSell - totalCost) / totalCost) * 100 : 0;
        setCellStyle(parentExcelRow, 4, {
          formula: `IF(F${parentRowNum}>0,(G${parentRowNum}-F${parentRowNum})/F${parentRowNum}*100,0)`,
          result: marginResult,
        }, {
          font: FONT_FORMULA_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: '0.00',
          alignment: { horizontal: 'right' },
        });

        // E – Sell = SUM of Line Sell (total sell for the group)
        setCellStyle(parentExcelRow, 5, {
          formula: `SUM(G${firstChildRow}:G${lastChildRow})`,
          result: totalSell,
        }, {
          font: FONT_FORMULA_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });

        // F – Line Cost = SUM of children's Line Cost
        setCellStyle(parentExcelRow, 6, {
          formula: `SUM(F${firstChildRow}:F${lastChildRow})`,
          result: totalCost,
        }, {
          font: FONT_FORMULA_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });

        // G – Line Sell = SUM of children's Line Sell
        setCellStyle(parentExcelRow, 7, {
          formula: `SUM(G${firstChildRow}:G${lastChildRow})`,
          result: totalSell,
        }, {
          font: FONT_FORMULA_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });
      } else {
        // Standalone parent item (no children) — behaves like a child row with editable values + formulas

        // B – Qty (editable)
        setCellStyle(parentExcelRow, 2, parent.quantity, {
          font: FONT_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: '0.00',
          alignment: { horizontal: 'right' },
        });

        // C – Cost (editable)
        setCellStyle(parentExcelRow, 3, parent.cost_price, {
          font: FONT_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });

        // D – Margin % (editable)
        setCellStyle(parentExcelRow, 4, parent.margin_percentage, {
          font: FONT_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: '0.00',
          alignment: { horizontal: 'right' },
        });

        // E – Sell = Cost * (1 + Margin/100)
        setCellStyle(parentExcelRow, 5, {
          formula: `C${row}*(1+D${row}/100)`,
          result: parent.sell_price,
        }, {
          font: FONT_FORMULA_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });

        // F – Line Cost = Qty * Cost
        setCellStyle(parentExcelRow, 6, {
          formula: `B${row}*C${row}`,
          result: parent.quantity * parent.cost_price,
        }, {
          font: FONT_FORMULA_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });

        // G – Line Sell = Qty * Sell
        setCellStyle(parentExcelRow, 7, {
          formula: `B${row}*E${row}`,
          result: parent.line_total,
        }, {
          font: FONT_FORMULA_BOLD,
          fill: LIGHT_GREY,
          border: THIN_BORDER,
          numFmt: CURRENCY_FMT,
          alignment: { horizontal: 'right' },
        });

        row++;
      }
    }
  }

  writeTableHeader();
  renderItems(standardItems, standardParentRows);

  // ─── Optional Items ──────────────────────────────────────────────

  if (optionalItems.length > 0) {
    row++; // blank row

    ws.mergeCells(`A${row}:G${row}`);
    setCellStyle(ws.getRow(row), 1, 'OPTIONAL ITEMS', { font: FONT_SECTION });
    row++;

    writeTableHeader();
    renderItems(optionalItems, optionalParentRows);
  }

  // ─── Totals ──────────────────────────────────────────────────────

  row++; // blank row

  // Build SUM references for standard parent rows
  // For Line Sell (col G) and Line Cost (col F) we sum the parent rows
  const lineSellRefs = standardParentRows.map(r => `G${r}`).join(',');
  const lineCostRefs = standardParentRows.map(r => `F${r}`).join(',');

  // Subtotal (Line Sell)
  const subtotalRowNum = row;
  const subtotalExcelRow = ws.getRow(row);
  setCellStyle(subtotalExcelRow, 5, 'Subtotal', {
    font: FONT_BOLD,
    alignment: { horizontal: 'right' },
    border: THIN_BORDER,
  });
  ws.mergeCells(`E${row}:F${row}`);
  setCellStyle(subtotalExcelRow, 7, {
    formula: standardParentRows.length > 0 ? `SUM(${lineSellRefs})` : '0',
    result: quote.subtotal,
  }, {
    font: FONT_FORMULA_BOLD,
    numFmt: CURRENCY_FMT,
    alignment: { horizontal: 'right' },
    border: THIN_BORDER,
  });
  row++;

  // Total Cost
  const totalCostRowNum = row;
  const totalCostExcelRow = ws.getRow(row);
  setCellStyle(totalCostExcelRow, 5, 'Total Cost', {
    font: FONT_BOLD,
    alignment: { horizontal: 'right' },
    border: THIN_BORDER,
  });
  ws.mergeCells(`E${row}:F${row}`);
  setCellStyle(totalCostExcelRow, 7, {
    formula: standardParentRows.length > 0 ? `SUM(${lineCostRefs})` : '0',
    result: quote.total_cost,
  }, {
    font: FONT_FORMULA_BOLD,
    numFmt: CURRENCY_FMT,
    alignment: { horizontal: 'right' },
    border: THIN_BORDER,
  });
  row++;

  // Overall Margin %
  const marginExcelRow = ws.getRow(row);
  setCellStyle(marginExcelRow, 5, 'Margin %', {
    font: FONT_BOLD,
    alignment: { horizontal: 'right' },
    border: THIN_BORDER,
  });
  ws.mergeCells(`E${row}:F${row}`);
  setCellStyle(marginExcelRow, 7, {
    formula: `IF(G${totalCostRowNum}>0,(G${subtotalRowNum}-G${totalCostRowNum})/G${totalCostRowNum}*100,0)`,
    result: quote.total_margin,
  }, {
    font: FONT_FORMULA_BOLD,
    numFmt: '0.00',
    alignment: { horizontal: 'right' },
    border: THIN_BORDER,
  });
  row++;

  // GST
  const gstRowNum = row;
  const gstExcelRow = ws.getRow(row);
  setCellStyle(gstExcelRow, 5, `GST (${quote.tax_rate}%)`, {
    font: FONT_BOLD,
    alignment: { horizontal: 'right' },
    border: THIN_BORDER,
  });
  ws.mergeCells(`E${row}:F${row}`);
  setCellStyle(gstExcelRow, 7, {
    formula: `G${subtotalRowNum}*${quote.tax_rate}/100`,
    result: quote.tax_amount,
  }, {
    font: FONT_FORMULA_BOLD,
    numFmt: CURRENCY_FMT,
    alignment: { horizontal: 'right' },
    border: THIN_BORDER,
  });
  row++;

  // Grand Total
  const totalExcelRow = ws.getRow(row);
  totalExcelRow.height = 28;
  setCellStyle(totalExcelRow, 5, 'TOTAL', {
    font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1B2A4A' } },
    fill: TOTAL_BG,
    border: THIN_BORDER,
    alignment: { horizontal: 'right', vertical: 'middle' },
  });
  ws.mergeCells(`E${row}:F${row}`);
  setCellStyle(totalExcelRow, 7, {
    formula: `G${subtotalRowNum}+G${gstRowNum}`,
    result: quote.total_amount,
  }, {
    font: { name: 'Calibri', size: 12, bold: true, italic: true, color: { argb: 'FF1B2A4A' } },
    fill: TOTAL_BG,
    border: THIN_BORDER,
    numFmt: CURRENCY_FMT,
    alignment: { horizontal: 'right', vertical: 'middle' },
  });
  row++;

  // ─── Notes ───────────────────────────────────────────────────────

  const notesText = stripHtml(quote.notes);
  if (notesText) {
    row++;
    ws.mergeCells(`A${row}:G${row}`);
    setCellStyle(ws.getRow(row), 1, 'NOTES', { font: FONT_SECTION });
    row++;

    ws.mergeCells(`A${row}:G${row}`);
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
    row++;
    ws.mergeCells(`A${row}:G${row}`);
    setCellStyle(ws.getRow(row), 1, 'TERMS & CONDITIONS', { font: FONT_SECTION });
    row++;

    ws.mergeCells(`A${row}:G${row}`);
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
