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
  onSubmitDimension: (lengthMm: number) => void;
  onClose: () => void;
  visible: boolean;
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
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate current segment length for display
  const currentLengthMm = lastPoint && cursorPosition && scale
    ? distance(lastPoint, cursorPosition) / scale.pixelsPerMm
    : null;

  // Format length for display
  const formatLength = (mm: number): string => {
    switch (dimensionUnit) {
      case 'mm': return `${Math.round(mm)}mm`;
      case 'cm': return `${(mm / 10).toFixed(1)}cm`;
      case 'm': return `${(mm / 1000).toFixed(3)}m`;
      case 'imperial':
        const inches = mm / 25.4;
        const feet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return feet > 0 ? `${feet}'${remainingInches.toFixed(1)}"` : `${remainingInches.toFixed(1)}"`;
      default: return `${(mm / 1000).toFixed(3)}m`;
    }
  };

  // Focus input when overlay becomes visible
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      setInputValue('');
    }
  }, [visible]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const lengthMm = parseDimensionInput(inputValue, dimensionUnit);
    if (lengthMm !== null && lengthMm > 0) {
      onSubmitDimension(lengthMm);
      setInputValue('');
    }
  }, [inputValue, dimensionUnit, onSubmitDimension]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!visible || !isDrawing || !lastPoint) {
    return null;
  }

  const unitHint = dimensionUnit === 'imperial' ? "e.g., 3'6\" or 42\"" : `e.g., 3.5${dimensionUnit}`;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-panel p-3 rounded-lg shadow-lg border border-border/50">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          {/* Current length display */}
          {currentLengthMm !== null && (
            <div className="text-sm text-muted-foreground font-mono min-w-[80px]">
              {formatLength(currentLengthMm)}
            </div>
          )}
          
          {/* Length input */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={unitHint}
              className="w-32 h-8 text-sm font-mono pr-6"
              autoComplete="off"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1 rounded">
              ↵
            </kbd>
          </div>
          
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
        
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          Type length + Enter to place point • L to toggle
        </p>
      </div>
    </div>
  );
}
