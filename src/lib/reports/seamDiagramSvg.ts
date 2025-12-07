import { StripPlanResult } from '@/lib/rollGoods';

/**
 * Generate an SVG string for a seam diagram that can be embedded in PDF
 */
export function generateSeamDiagramSvg(
  stripPlan: StripPlanResult,
  width: number = 300,
  height: number = 200
): string {
  const bbox = stripPlan.roomBoundingBox;
  const padding = 30;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  
  const scaleX = availableWidth / Math.max(bbox.width, 1);
  const scaleY = availableHeight / Math.max(bbox.height, 1);
  const uniformScale = Math.min(scaleX, scaleY);

  const toSvgX = (mm: number) => padding + (mm - bbox.minX) * uniformScale;
  const toSvgY = (mm: number) => padding + (mm - bbox.minY) * uniformScale;
  const toSvgWidth = (mm: number) => mm * uniformScale;
  const toSvgHeight = (mm: number) => mm * uniformScale;

  const getStripColor = (index: number) => {
    return index % 2 === 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.3)';
  };

  // Build SVG string
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background: #f8fafc; border-radius: 4px;">`;

  // Background grid pattern
  svg += `
    <defs>
      <pattern id="grid-${stripPlan.roomId}" width="15" height="15" patternUnits="userSpaceOnUse">
        <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#grid-${stripPlan.roomId})"/>
  `;

  // Room outline
  svg += `
    <rect 
      x="${padding}" 
      y="${padding}" 
      width="${toSvgWidth(bbox.width)}" 
      height="${toSvgHeight(bbox.height)}" 
      fill="none" 
      stroke="#1e293b" 
      stroke-width="2" 
      stroke-dasharray="4 2"
    />
  `;

  // Strips
  stripPlan.strips.forEach((strip, index) => {
    const isHorizontal = strip.rotation === 0;
    const x = toSvgX(strip.x);
    const y = toSvgY(strip.y);
    const w = isHorizontal ? toSvgWidth(strip.length) : toSvgWidth(strip.width);
    const h = isHorizontal ? toSvgHeight(strip.width) : toSvgHeight(strip.length);

    svg += `
      <rect 
        x="${x}" 
        y="${y}" 
        width="${Math.max(w, 0)}" 
        height="${Math.max(h, 0)}" 
        fill="${getStripColor(index)}" 
        stroke="#3b82f6" 
        stroke-width="1"
      />
      <text 
        x="${x + w / 2}" 
        y="${y + h / 2}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        font-size="10" 
        font-weight="600" 
        fill="#1e40af"
      >#${index + 1}</text>
    `;
  });

  // Seam lines
  stripPlan.seamLines.forEach((seam) => {
    svg += `
      <line 
        x1="${toSvgX(seam.x1)}" 
        y1="${toSvgY(seam.y1)}" 
        x2="${toSvgX(seam.x2)}" 
        y2="${toSvgY(seam.y2)}" 
        stroke="#dc2626" 
        stroke-width="2" 
        ${seam.type === 'cross' ? 'stroke-dasharray="4 2"' : ''}
      />
    `;
  });

  // Labels
  svg += `
    <text x="${padding}" y="${height - 8}" font-size="9" fill="#64748b">
      ${stripPlan.strips.length} strips • ${stripPlan.seamLines.length} seams • ${stripPlan.utilizationPercent.toFixed(0)}% utilization
    </text>
  `;

  svg += `</svg>`;
  return svg;
}

/**
 * Convert SVG string to base64 data URL for embedding in HTML
 */
export function svgToDataUrl(svg: string): string {
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}