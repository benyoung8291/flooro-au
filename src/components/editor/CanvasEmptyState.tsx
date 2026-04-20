import { Image, Ruler, Pencil, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasEmptyStateProps {
  hasBackground: boolean;
  hasScale: boolean;
  hasRooms: boolean;
  isMobile?: boolean;
}

/**
 * Inline guidance card shown on empty canvas. Walks users through the three
 * setup steps in order: upload floor plan → calibrate scale → draw rooms.
 * Auto-hides once at least one room exists.
 */
export function CanvasEmptyState({
  hasBackground,
  hasScale,
  hasRooms,
  isMobile,
}: CanvasEmptyStateProps) {
  if (hasRooms) return null;

  const steps = [
    {
      icon: Image,
      label: 'Upload floor plan',
      hint: 'PDF or photo',
      done: hasBackground,
    },
    {
      icon: Ruler,
      label: 'Calibrate scale',
      hint: 'Press S, then click two points on a known dimension',
      done: hasScale,
    },
    {
      icon: Pencil,
      label: 'Draw rooms',
      hint: 'Press D for polyline, R for rectangle',
      done: false,
    },
  ];

  const activeIndex = steps.findIndex(s => !s.done);

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center p-4">
      <div className={cn(
        'pointer-events-auto rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-xl p-5 max-w-sm',
        isMobile && 'max-w-[calc(100vw-2rem)]'
      )}>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Getting started
        </p>
        <h2 className="text-lg font-semibold mb-4">Set up your project</h2>

        <ol className="space-y-2.5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeIndex;
            return (
              <li
                key={step.label}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-2.5 -mx-1 transition-colors',
                  isActive && 'bg-primary/5 ring-1 ring-primary/20',
                  step.done && 'opacity-60'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    step.done
                      ? 'bg-primary/10 text-primary'
                      : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.done ? (
                    <span className="text-xs font-bold">✓</span>
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    step.done && 'line-through'
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.hint}</p>
                </div>
                {isActive && (
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-2 animate-pulse" />
                )}
              </li>
            );
          })}
        </ol>

        <p className="text-[11px] text-muted-foreground mt-4 text-center">
          Press <kbd className="px-1.5 py-0.5 font-mono bg-muted border border-border rounded">?</kbd> for all shortcuts
        </p>
      </div>
    </div>
  );
}
