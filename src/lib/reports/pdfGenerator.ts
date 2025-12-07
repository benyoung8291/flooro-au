import { ReportSummary, formatCurrency, formatArea, formatLength } from './calculations';

interface PDFGeneratorOptions {
  projectName: string;
  projectAddress?: string;
  clientName?: string;
  report: ReportSummary;
  companyName?: string;
  companyLogo?: string;
}

// Generate HTML content for the PDF
export function generateReportHTML(options: PDFGeneratorOptions): string {
  const { projectName, projectAddress, clientName, report, companyName } = options;
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${projectName} - Flooring Estimate</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.5;
          color: #1a1a1a;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e5e5;
        }
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #0066cc;
        }
        .report-date {
          text-align: right;
          color: #666;
        }
        .project-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .project-info h1 {
          font-size: 20px;
          margin-bottom: 8px;
        }
        .project-info p {
          color: #666;
          font-size: 14px;
        }
        h2 {
          font-size: 16px;
          color: #333;
          margin: 24px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e5e5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
        }
        th, td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #e5e5e5;
        }
        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
        }
        td.number {
          text-align: right;
          font-family: 'SF Mono', Monaco, monospace;
        }
        .summary-box {
          background: linear-gradient(135deg, #0066cc, #0052a3);
          color: white;
          padding: 24px;
          border-radius: 8px;
          margin-top: 30px;
        }
        .summary-box h3 {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .summary-box .total {
          font-size: 32px;
          font-weight: 700;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.2);
        }
        .summary-item {
          text-align: center;
        }
        .summary-item .label {
          font-size: 12px;
          opacity: 0.8;
        }
        .summary-item .value {
          font-size: 18px;
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        @media print {
          body {
            padding: 20px;
          }
          .summary-box {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${companyName || 'Flooro'}</div>
        <div class="report-date">
          <strong>Estimate Report</strong><br>
          ${date}
        </div>
      </div>

      <div class="project-info">
        <h1>${projectName}</h1>
        ${projectAddress ? `<p>📍 ${projectAddress}</p>` : ''}
        ${clientName ? `<p>👤 ${clientName}</p>` : ''}
      </div>

      <h2>Room Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Room</th>
            <th>Material</th>
            <th>Net Area</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${report.roomCalculations.map(room => `
            <tr>
              <td>${room.roomName}</td>
              <td>${room.materialName || '—'}</td>
              <td class="number">${formatArea(room.netAreaM2)}</td>
              <td class="number">${room.quantity.toFixed(room.unit === 'tiles' ? 0 : 2)} ${room.unit}</td>
              <td class="number">${room.unitPrice > 0 ? formatCurrency(room.unitPrice) : '—'}</td>
              <td class="number">${room.totalCost > 0 ? formatCurrency(room.totalCost) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${report.materialSummary.length > 0 ? `
        <h2>Material Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Type</th>
              <th>Total Quantity</th>
              <th>Unit Price</th>
              <th>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            ${report.materialSummary.map(item => `
              <tr>
                <td>${item.materialName}</td>
                <td style="text-transform: capitalize">${item.materialType}</td>
                <td class="number">${item.totalQuantity.toFixed(item.unit === 'tiles' ? 0 : 2)} ${item.unit}</td>
                <td class="number">${formatCurrency(item.unitPrice)}</td>
                <td class="number">${formatCurrency(item.totalCost)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="summary-box">
        <h3>TOTAL ESTIMATE</h3>
        <div class="total">${formatCurrency(report.totalCost)}</div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">Net Area</div>
            <div class="value">${formatArea(report.totalNetArea)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Gross Area</div>
            <div class="value">${formatArea(report.totalGrossArea)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Perimeter</div>
            <div class="value">${formatLength(report.totalPerimeter)}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>This estimate is valid for 30 days. Prices may vary based on material availability.</p>
        <p>Generated by Flooro • ${date}</p>
      </div>
    </body>
    </html>
  `;
}

// Open print dialog with the report
export function exportToPDF(options: PDFGeneratorOptions): void {
  const html = generateReportHTML(options);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
