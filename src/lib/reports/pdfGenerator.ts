import { ReportSummary, formatCurrency, formatArea, formatLength } from './calculations';
import { generateSeamDiagramSvg, svgToDataUrl } from './seamDiagramSvg';
import { ClientDetails } from '@/components/reports/ClientDetailsForm';
import { CompanyBranding } from '@/components/reports/CompanyBrandingForm';
import { Material } from '@/hooks/useMaterials';
import { Room, ProjectMaterial } from '@/lib/canvas/types';

export interface PDFGeneratorOptions {
  projectName: string;
  projectAddress?: string;
  report: ReportSummary;
  clientDetails?: ClientDetails;
  companyBranding?: CompanyBranding;
  includeSeamDiagrams?: boolean;
  includeFinishesSchedule?: boolean;
  quoteValidityDays?: number;
  rooms?: Room[];
  materials?: Material[];
  projectMaterials?: ProjectMaterial[];
}

// Generate HTML content for the PDF
export function generateReportHTML(options: PDFGeneratorOptions): string {
  const { 
    projectName, 
    projectAddress, 
    report, 
    clientDetails,
    companyBranding,
    includeSeamDiagrams = true,
    includeFinishesSchedule = true,
    quoteValidityDays = 30,
    rooms = [],
    materials = [],
    projectMaterials = []
  } = options;
  
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const quoteNumber = `Q-${Date.now().toString(36).toUpperCase()}`;

  // Generate seam diagrams for rooms with strip plans
  const seamDiagrams = includeSeamDiagrams 
    ? report.roomCalculations
        .filter(room => room.stripPlan)
        .map(room => ({
          roomName: room.roomName,
          svg: svgToDataUrl(generateSeamDiagramSvg(room.stripPlan!, 280, 180))
        }))
    : [];

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
          font-size: 13px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #0066cc;
        }
        .company-info {
          flex: 1;
        }
        .company-logo {
          max-width: 120px;
          max-height: 60px;
          margin-bottom: 8px;
        }
        .company-name {
          font-size: 22px;
          font-weight: 700;
          color: #0066cc;
          margin-bottom: 4px;
        }
        .company-details {
          font-size: 11px;
          color: #666;
          line-height: 1.4;
        }
        .quote-info {
          text-align: right;
          min-width: 180px;
        }
        .quote-title {
          font-size: 24px;
          font-weight: 700;
          color: #0066cc;
          margin-bottom: 8px;
        }
        .quote-number {
          font-size: 12px;
          color: #666;
        }
        .quote-date {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-box {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #0066cc;
        }
        .info-box h3 {
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .info-box p {
          font-size: 13px;
          margin: 2px 0;
        }
        .info-box .name {
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 4px;
        }
        h2 {
          font-size: 14px;
          color: #333;
          margin: 24px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e5e5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
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
          font-size: 11px;
          text-transform: uppercase;
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
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .summary-box .total {
          font-size: 36px;
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
          font-size: 11px;
          opacity: 0.8;
        }
        .summary-item .value {
          font-size: 16px;
          font-weight: 600;
        }
        .seam-diagrams {
          margin-top: 30px;
          page-break-before: auto;
        }
        .seam-diagram-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .seam-diagram-item {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .seam-diagram-item h4 {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
        }
        .seam-diagram-item img {
          max-width: 100%;
          border-radius: 4px;
        }
        .terms-section {
          margin-top: 30px;
          padding: 16px;
          background: #fffbeb;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
        }
        .terms-section h3 {
          font-size: 12px;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 8px;
        }
        .terms-section p {
          font-size: 11px;
          color: #78350f;
          line-height: 1.5;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          font-size: 11px;
          color: #666;
          text-align: center;
        }
        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }
        .signature-box {
          border-top: 1px solid #333;
          padding-top: 8px;
        }
        .signature-box .label {
          font-size: 11px;
          color: #666;
        }
        .signature-box .line {
          height: 40px;
        }
        @media print {
          body {
            padding: 20px;
          }
          .summary-box {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .info-box {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .seam-diagrams {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          ${companyBranding?.logoUrl ? `<img src="${companyBranding.logoUrl}" alt="Logo" class="company-logo">` : ''}
          <div class="company-name">${companyBranding?.companyName || 'Flooro'}</div>
          <div class="company-details">
            ${companyBranding?.companyAddress ? `${companyBranding.companyAddress}<br>` : ''}
            ${companyBranding?.companyPhone ? `📞 ${companyBranding.companyPhone}` : ''}
            ${companyBranding?.companyEmail ? ` • ✉ ${companyBranding.companyEmail}` : ''}
            ${companyBranding?.companyWebsite ? `<br>🌐 ${companyBranding.companyWebsite}` : ''}
          </div>
        </div>
        <div class="quote-info">
          <div class="quote-title">ESTIMATE</div>
          <div class="quote-number">${quoteNumber}</div>
          <div class="quote-date">${date}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Project Details</h3>
          <p class="name">${projectName}</p>
          ${projectAddress ? `<p>📍 ${projectAddress}</p>` : ''}
        </div>
        ${clientDetails?.clientName ? `
          <div class="info-box">
            <h3>Bill To</h3>
            <p class="name">${clientDetails.clientName}</p>
            ${clientDetails.clientAddress ? `<p>${clientDetails.clientAddress}</p>` : ''}
            ${clientDetails.clientPhone ? `<p>📞 ${clientDetails.clientPhone}</p>` : ''}
            ${clientDetails.clientEmail ? `<p>✉ ${clientDetails.clientEmail}</p>` : ''}
          </div>
        ` : ''}
      </div>

      <h2>Room Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Code</th>
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
              <td style="font-family: 'SF Mono', Monaco, monospace; font-weight: 600; color: #0066cc;">—</td>
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

      ${includeFinishesSchedule ? generateFinishesScheduleHTML(rooms, materials, projectMaterials) : ''}

      <div class="summary-box">
        <h3>Total Estimate</h3>
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

      ${seamDiagrams.length > 0 ? `
        <div class="seam-diagrams">
          <h2>Seam & Cut Diagrams</h2>
          <div class="seam-diagram-grid">
            ${seamDiagrams.map(diagram => `
              <div class="seam-diagram-item">
                <h4>${diagram.roomName}</h4>
                <img src="${diagram.svg}" alt="${diagram.roomName} seam diagram">
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${companyBranding?.termsAndConditions ? `
        <div class="terms-section">
          <h3>Terms & Conditions</h3>
          <p>${companyBranding.termsAndConditions.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      ${clientDetails?.notes ? `
        <div style="margin-top: 20px; padding: 12px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
          <h3 style="font-size: 12px; font-weight: 600; color: #0369a1; margin-bottom: 4px;">Notes</h3>
          <p style="font-size: 11px; color: #0c4a6e;">${clientDetails.notes.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      <div class="signature-section">
        <div class="signature-box">
          <div class="line"></div>
          <div class="label">Customer Signature / Date</div>
        </div>
        <div class="signature-box">
          <div class="line"></div>
          <div class="label">Company Representative / Date</div>
        </div>
      </div>

      <div class="footer">
        <p>This estimate is valid for ${quoteValidityDays} days from the date of issue. Prices may vary based on material availability.</p>
        <p style="margin-top: 8px;">Generated by ${companyBranding?.companyName || 'Flooro'} • ${date}</p>
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

// Generate finishes schedule HTML for PDF
function generateFinishesScheduleHTML(rooms: Room[], materials: Material[], projectMaterials: ProjectMaterial[] = []): string {
  const projectMaterialMap = new Map(projectMaterials.map(pm => [pm.id, pm]));
  const libraryMaterialMap = new Map(materials.map(m => [m.id, m]));
  const entriesMap = new Map<string, {
    code: string;
    materialName: string;
    range?: string;
    colour?: string;
    backing?: string;
    type: string;
    rooms: string[];
    totalArea: number;
  }>();

  // Build entries from rooms using project materials for codes
  for (const room of rooms) {
    if (!room.materialId) continue;

    const projectMaterial = projectMaterialMap.get(room.materialId);
    const libraryMaterial = libraryMaterialMap.get(room.materialId);
    
    // Code comes from project material only
    const materialCode = projectMaterial?.materialCode;
    if (!materialCode) continue;

    const key = projectMaterial.id;
    const existing = entriesMap.get(key);
    const specs = projectMaterial.specs as any;

    if (existing) {
      existing.rooms.push(room.name);
    } else {
      entriesMap.set(key, {
        code: materialCode,
        materialName: projectMaterial.name,
        range: specs?.range || libraryMaterial?.specs.range,
        colour: specs?.colour || libraryMaterial?.specs.colour,
        backing: specs?.backing || libraryMaterial?.specs.backing,
        type: projectMaterial.type,
        rooms: [room.name],
        totalArea: 0,
      });
    }
  }

  const entries = Array.from(entriesMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  if (entries.length === 0) return '';

  return `
    <h2>Finishes Schedule</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 60px;">Code</th>
          <th>Material</th>
          <th>Details</th>
          <th>Rooms</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(entry => `
          <tr>
            <td style="font-family: 'SF Mono', Monaco, monospace; font-weight: 600; color: #0066cc;">${entry.code}</td>
            <td>
              <div style="font-weight: 500;">${entry.materialName}</div>
              ${entry.range ? `<div style="font-size: 10px; color: #666;">${entry.range}</div>` : ''}
            </td>
            <td style="font-size: 11px; color: #666;">
              ${[
                entry.colour ? `Colour: ${entry.colour}` : '',
                entry.backing ? `Backing: ${entry.backing}` : ''
              ].filter(Boolean).join('<br>') || '—'}
            </td>
            <td style="font-size: 11px;">${entry.rooms.join(', ')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}