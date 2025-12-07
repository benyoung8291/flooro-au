import { forwardRef } from 'react';
import { StripPlanResult } from '@/lib/rollGoods';
import { Room } from '@/lib/canvas/types';
import { formatArea, formatLength } from '@/lib/reports/calculations';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

interface InstallerWorksheetProps {
  stripPlan: StripPlanResult;
  materialName: string;
  rollWidth: number;
  patternRepeat: number;
  room: Room;
  fillDirection: number;
}

export const InstallerWorksheet = forwardRef<HTMLDivElement, InstallerWorksheetProps>(
  function InstallerWorksheet(
    { stripPlan, materialName, rollWidth, patternRepeat, room, fillDirection },
    ref
  ) {
    const hasPattern = patternRepeat > 0;
    const bbox = stripPlan.roomBoundingBox;
    
    return (
      <div ref={ref} className="p-6 bg-white text-black font-sans text-sm print:p-4">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold">INSTALLER CUT SHEET</h1>
          <div className="flex justify-between mt-2">
            <div>
              <p className="font-medium text-lg">{room.name}</p>
              <p className="text-gray-600">{materialName}</p>
            </div>
            <div className="text-right">
              <p><span className="text-gray-600">Date:</span> {new Date().toLocaleDateString()}</p>
              <p><span className="text-gray-600">Roll Width:</span> {(rollWidth / 1000).toFixed(2)}m</p>
            </div>
          </div>
        </div>

        {/* Room Info Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-500 uppercase">Room Size</p>
            <p className="text-lg font-mono font-bold">
              {(bbox.width / 1000).toFixed(2)} × {(bbox.height / 1000).toFixed(2)}m
            </p>
          </div>
          <div className="border border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-500 uppercase">Room Area</p>
            <p className="text-lg font-mono font-bold">{formatArea(stripPlan.roomAreaM2)}</p>
          </div>
          <div className="border border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-500 uppercase">Material Required</p>
            <p className="text-lg font-mono font-bold">{formatArea(stripPlan.totalMaterialAreaM2)}</p>
          </div>
          <div className="border border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-500 uppercase">Total Roll</p>
            <p className="text-lg font-mono font-bold">{formatLength(stripPlan.totalRollLengthM)}</p>
          </div>
        </div>

        {/* Direction and Pattern Info */}
        <div className="flex gap-6 mb-6">
          {/* Direction Indicator */}
          <div className="border border-gray-300 p-4 flex items-center gap-4">
            <div className="w-16 h-16 border-2 border-black relative">
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${fillDirection}deg)` }}
              >
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line x1="0" y1="10" x2="35" y2="10" stroke="black" strokeWidth="2" />
                  <polygon points="35,10 28,5 28,15" fill="black" />
                </svg>
              </div>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs">N</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Lay Direction</p>
              <p className="font-bold">{fillDirection}°</p>
              <p className="text-xs text-gray-600">
                {stripPlan.layoutDirection === 'horizontal' ? 'Horizontal strips' : 'Vertical strips'}
              </p>
            </div>
          </div>

          {/* Pattern Info */}
          {hasPattern && (
            <div className="border border-gray-300 p-4 flex-1">
              <p className="text-xs text-gray-500 uppercase mb-2">Pattern Information</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-gray-600">Pattern Repeat:</span> <span className="font-mono font-bold">{(patternRepeat / 1000).toFixed(2)}m</span></p>
                <p><span className="text-gray-600">Match Type:</span> <span className="font-bold">Straight Match</span></p>
              </div>
              <p className="text-xs text-gray-600 mt-2">⚠️ Ensure pattern alignment at all seams</p>
            </div>
          )}
        </div>

        <Separator className="bg-black h-0.5 my-4" />

        {/* Cut List */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3">CUT LIST</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-bold">Strip #</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-bold">Length</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-bold">Width</th>
                {hasPattern && (
                  <th className="border border-gray-300 px-3 py-2 text-left font-bold">Pattern Offset</th>
                )}
                <th className="border border-gray-300 px-3 py-2 text-left font-bold">Position</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-12">✓</th>
              </tr>
            </thead>
            <tbody>
              {stripPlan.strips.map((strip, index) => (
                <tr key={strip.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-3 py-2 font-bold">
                    #{index + 1}
                    {index === 0 && hasPattern && <span className="ml-2 text-xs text-gray-500">(REF)</span>}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 font-mono">
                    {(strip.length / 1000).toFixed(3)}m
                  </td>
                  <td className="border border-gray-300 px-3 py-2 font-mono">
                    {(strip.width / 1000).toFixed(3)}m
                  </td>
                  {hasPattern && (
                    <td className="border border-gray-300 px-3 py-2 font-mono">
                      {index === 0 ? '—' : `${(strip.patternOffset / 1000).toFixed(3)}m`}
                    </td>
                  )}
                  <td className="border border-gray-300 px-3 py-2 text-xs text-gray-600">
                    X: {(strip.x / 1000).toFixed(2)}m, Y: {(strip.y / 1000).toFixed(2)}m
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <div className="w-5 h-5 border-2 border-gray-400 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td className="border border-gray-300 px-3 py-2">TOTAL</td>
                <td className="border border-gray-300 px-3 py-2 font-mono">
                  {formatLength(stripPlan.totalRollLengthM)}
                </td>
                <td className="border border-gray-300 px-3 py-2" colSpan={hasPattern ? 4 : 3}>
                  {stripPlan.strips.length} strips / {stripPlan.seamLines.length} seams
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Seam Positions */}
        {stripPlan.seamLines.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-lg mb-3">SEAM POSITIONS</h2>
            <div className="grid grid-cols-4 gap-3">
              {stripPlan.seamLines.map((seam, index) => (
                <div key={seam.id} className="border border-gray-300 p-2 text-center">
                  <p className="text-xs text-gray-500">Seam {index + 1}</p>
                  <p className="font-mono font-bold">
                    {stripPlan.layoutDirection === 'horizontal'
                      ? `Y: ${(seam.y1 / 1000).toFixed(2)}m`
                      : `X: ${(seam.x1 / 1000).toFixed(2)}m`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Room Layout Diagram */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3">ROOM LAYOUT</h2>
          <InstallerRoomDiagram stripPlan={stripPlan} fillDirection={fillDirection} />
        </div>

        <Separator className="bg-black h-0.5 my-4" />

        {/* Pre-Installation Checklist */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3">PRE-INSTALLATION CHECKLIST</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Subfloor checked for moisture',
              'Subfloor leveled and clean',
              'Material acclimated (48hrs)',
              'Room temperature 18-25°C',
              'All cuts measured and marked',
              'Adhesive ready (if applicable)',
              'Seam sealer available',
              'Roller available for finishing',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 border border-gray-400" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes Section */}
        <div className="border-t-2 border-black pt-4">
          <h2 className="font-bold text-lg mb-2">NOTES</h2>
          <div className="border border-gray-300 h-24" />
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Generated by Flooro • {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  }
);

function InstallerRoomDiagram({ stripPlan, fillDirection }: { stripPlan: StripPlanResult; fillDirection: number }) {
  const width = 350;
  const height = 200;
  const padding = 25;
  
  const bbox = stripPlan.roomBoundingBox;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  
  const scaleX = availableWidth / Math.max(bbox.width, 1);
  const scaleY = availableHeight / Math.max(bbox.height, 1);
  const uniformScale = Math.min(scaleX, scaleY);

  const toSvgX = (mm: number) => padding + (mm - bbox.minX) * uniformScale;
  const toSvgY = (mm: number) => padding + (mm - bbox.minY) * uniformScale;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md border border-gray-300 bg-white">
      {/* Room outline */}
      <rect
        x={padding}
        y={padding}
        width={bbox.width * uniformScale}
        height={bbox.height * uniformScale}
        fill="none"
        stroke="black"
        strokeWidth="2"
      />

      {/* Strips */}
      {stripPlan.strips.map((strip, index) => {
        const isHorizontal = strip.rotation === 0;
        const x = toSvgX(strip.x);
        const y = toSvgY(strip.y);
        const w = isHorizontal ? strip.length * uniformScale : strip.width * uniformScale;
        const h = isHorizontal ? strip.width * uniformScale : strip.length * uniformScale;

        return (
          <g key={strip.id}>
            <rect
              x={x}
              y={y}
              width={Math.max(w, 0)}
              height={Math.max(h, 0)}
              fill={index % 2 === 0 ? '#e0e0e0' : '#f0f0f0'}
              stroke="black"
              strokeWidth="1"
            />
            <text
              x={x + w / 2}
              y={y + h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-bold"
              fill="black"
            >
              #{index + 1}
            </text>
          </g>
        );
      })}

      {/* Seam lines */}
      {stripPlan.seamLines.map((seam, index) => (
        <g key={seam.id}>
          <line
            x1={toSvgX(seam.x1)}
            y1={toSvgY(seam.y1)}
            x2={toSvgX(seam.x2)}
            y2={toSvgY(seam.y2)}
            stroke="red"
            strokeWidth="2"
          />
          <text
            x={(toSvgX(seam.x1) + toSvgX(seam.x2)) / 2}
            y={(toSvgY(seam.y1) + toSvgY(seam.y2)) / 2 - 5}
            textAnchor="middle"
            className="text-[8px] font-bold"
            fill="red"
          >
            S{index + 1}
          </text>
        </g>
      ))}

      {/* Direction arrow */}
      <g transform={`translate(${width - 30}, ${height - 30}) rotate(${fillDirection})`}>
        <line x1="-12" y1="0" x2="12" y2="0" stroke="black" strokeWidth="2" />
        <polygon points="12,0 6,-4 6,4" fill="black" />
      </g>
      <text x={width - 30} y={height - 8} textAnchor="middle" className="text-[8px]">DIR</text>

      {/* Dimensions */}
      <text
        x={padding + (bbox.width * uniformScale) / 2}
        y={height - 5}
        textAnchor="middle"
        className="text-[10px]"
        fill="black"
      >
        {(bbox.width / 1000).toFixed(2)}m
      </text>
      <text
        x={5}
        y={padding + (bbox.height * uniformScale) / 2}
        textAnchor="middle"
        transform={`rotate(-90, 5, ${padding + (bbox.height * uniformScale) / 2})`}
        className="text-[10px]"
        fill="black"
      >
        {(bbox.height / 1000).toFixed(2)}m
      </text>
    </svg>
  );
}