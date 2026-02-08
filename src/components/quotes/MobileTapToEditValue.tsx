import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MobileTapToEditValueProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  onChange: (val: number) => void;
}

export function MobileTapToEditValue({
  label,
  value,
  prefix = '',
  suffix = '',
  onChange,
}: MobileTapToEditValueProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setEditValue(value === 0 ? '' : value.toFixed(2));
    setIsEditing(true);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = useCallback(() => {
    const num = parseFloat(editValue) || 0;
    onChange(num);
    setIsEditing(false);
  }, [editValue, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1">
        <span className="text-muted-foreground">{label}:</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={editValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
            setEditValue(raw);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-16 h-6 px-1 text-xs font-mono text-right rounded border border-input bg-background outline-none ring-1 ring-ring"
        />
      </div>
    );
  }

  const displayValue = value === 0 ? '—' : `${prefix}${value.toFixed(2)}${suffix}`;

  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        'inline-flex items-center gap-1 py-0.5 px-1 rounded transition-colors',
        'hover:bg-muted/60 active:bg-muted',
        'text-foreground font-mono tabular-nums'
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span>{displayValue}</span>
    </button>
  );
}
