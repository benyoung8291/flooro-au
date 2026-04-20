import { useState, useEffect, useRef, useCallback } from 'react';
import { CanvasPoint, DimensionUnit, ScaleCalibration } from '@/lib/canvas/types';
import { parseDimensionInput, distance } from '@/lib/canvas/geometry';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface DimensionInputOverlayProps {
  isDrawing: boolean;
  lastPoint: CanvasPoint | null;
  cursorPosition: CanvasPoint | null;
  scale: ScaleCalibration | null;
  dimensionUnit: DimensionUnit;
  onSubmitDimension: (lengthMm: number, angleDeg?: number) => void;
  onClose: () => void;
  visible: boolean;
}

const RECENT_VALUES_KEY = 'flooro_recent_dim_values';
const MAX_RECENT = 5;

function loadRecentValues(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_VALUES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentValue(value: string) {
  try {
    const current = loadRecentValues().filter((v) => v !== value);
    const next = [value, ...current].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_VALUES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function DimensionInputOverlay({
  isDrawing,
  lastPoint,
  cursorPosition,
  scale,
  dimensionUnit,
  onSubmitDimension,
  onClose,
  visible,
}: DimensionInputOverlayProps) {
  const [lengthValue, setLengthValue] = useState('');
  const [angleValue, setAngleValue] = useState('');
  const [recentValues, setRecentValues] = useState<string[]>(() => loadRecentValues());
  const lengthInputRef = useRef<HTMLInputElement>(null);
  const angleInputRef = useRef<HTMLInputElement>(null);

  const currentLengthMm = lastPoint && cursorPosition && scale
    ? distance(lastPoint, cursorPosition) / scale.pixelsPerMm
    : null;

  const formatLength = (mm: number): string => {
    switch (dimensionUnit) {
      case 'mm': return `${Math.round(mm)}mm`;
      case 'cm': return `${(mm / 10).toFixed(1)}cm`;
      case 'm': return `${(mm / 1000).toFixed(3)}m`;
      case 'imperial': {
        const inches = mm / 25.4;
        const feet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return feet > 0 ? `${feet}'${remainingInches.toFixed(1)}"` : `${remainingInches.toFixed(1)}"`;
      }
      default: return `${(mm / 1000).toFixed(3)}m`;
    }
  };

  // Focus length input when overlay becomes visible
  useEffect(() => {
    if (visible && lengthInputRef.current) {
      lengthInputRef.current.focus();
      setLengthValue('');
      setAngleValue('');
    }
  }, [visible]);

  // Listen for type-as-you-draw seed events from EditorCanvas
  useEffect(() => {
    const handleSeed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') {
        setLengthValue(detail);
        // Defer focus until after open animation
        setTimeout(() => {
          if (lengthInputRef.current) {
            lengthInputRef.current.focus();
            // Place cursor at end
            const end = lengthInputRef.current.value.length;
            lengthInputRef.current.setSelectionRange(end, end);
          }
        }, 0);
      }
    };
    window.addEventListener('dim-input-seed', handleSeed);
    return () => window.removeEventListener('dim-input-seed', handleSeed);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const lengthMm = parseDimensionInput(lengthValue, dimensionUnit);
    if (lengthMm !== null && lengthMm > 0) {
      const angleDeg = angleValue.trim() ? parseFloat(angleValue) : undefined;
      onSubmitDimension(lengthMm, angleDeg);
      saveRecentValue(lengthValue);
      setRecentValues(loadRecentValues());
      setLengthValue('');
      setAngleValue('');
    }
  }, [lengthValue, angleValue, dimensionUnit, onSubmitDimension]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    // Tab between length and angle handled by browser default
  }, [onClose]);

  const handleChipClick = (value: string) => {
    setLengthValue(value);
    if (lengthInputRef.current) lengthInputRef.current.focus();
  };

  if (!visible || !isDrawing || !lastPoint) {
    return null;
  }

  const unitHint = dimensionUnit === 'imperial' ? "e.g., 3'6\" or 42\"" : `e.g., 3.5${dimensionUnit}`;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-panel p-3 rounded-lg shadow-lg border border-border/50 min-w-[320px]">
        {/* Recent values chips */}
        {recentValues.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Recent:</span>
            {recentValues.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleChipClick(v)}
                className="px-1.5 py-0.5 text-[11px] font-mono bg-muted hover:bg-accent text-foreground rounded border border-border/50 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Current length display */}
          {currentLengthMm !== null && (
            <div className="text-xs text-muted-foreground font-mono min-w-[70px]">
              {formatLength(currentLengthMm)}
            </div>
          )}

          {/* Length input */}
          <div className="relative">
            <Input
              ref={lengthInputRef}
              type="text"
              value={lengthValue}
              onChange={(e) => setLengthValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={unitHint}
              className="w-32 h-8 text-sm font-mono"
              autoComplete="off"
              aria-label="Length"
            />
          </div>

          {/* Angle input */}
          <div className="relative">
            <Input
              ref={angleInputRef}
              type="text"
              value={angleValue}
              onChange={(e) => setAngleValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="° (opt)"
              className="w-20 h-8 text-sm font-mono"
              autoComplete="off"
              aria-label="Angle in degrees"
              title="Angle relative to last segment (degrees, optional)"
            />
          </div>

          <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">↵</kbd>

          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Type length • Tab for angle • Enter to place • Esc to close
        </p>
      </div>
    </div>
  );
}
