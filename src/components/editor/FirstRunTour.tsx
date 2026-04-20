import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Keyboard, Ruler, Percent, ChevronRight, ChevronLeft } from 'lucide-react';

const TOUR_STORAGE_KEY = 'flooro_first_run_tour_v1_seen';

interface TourStep {
  icon: React.ElementType;
  title: string;
  body: string;
  shortcut?: string;
}

const steps: TourStep[] = [
  {
    icon: Keyboard,
    title: 'Faster takeoff with shortcuts',
    body: 'Press D to draw, R for a rectangle, S to set scale, and [ ] to jump between rooms. Hold Shift to ortho-lock.',
    shortcut: '?',
  },
  {
    icon: Ruler,
    title: 'Right-angle lock & inline editing',
    body: 'Press A to constrain new edges to 90°/45°. Click any dimension label on a finished room to type a new exact length.',
    shortcut: 'A',
  },
  {
    icon: Percent,
    title: 'Smart waste & cut optimizer',
    body: 'Each room shows a "Try X%" chip with the recommended waste based on shape complexity. The Material Efficiency card shows cross-room offcut savings.',
  },
  {
    icon: Sparkles,
    title: 'Mobile-ready on site',
    body: 'On phones you get a contextual chip bar for the selected room, a tap-to-edit dimension hit area, and a swipe-up takeoff sheet. Take a photo of the plan straight from the camera.',
  },
];

/**
 * Lightweight first-run tour highlighting the new Phase 1-3 features. Shown
 * once per browser; dismissable with localStorage flag.
 */
export function FirstRunTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    if (!seen) {
      // Defer slightly so the editor renders first
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) dismiss();
    setOpen(next);
  };

  const step = steps[stepIndex];
  const Icon = step.icon;
  const isLast = stepIndex === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              What's new
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {stepIndex + 1} / {steps.length}
            </span>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </div>
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-2">
            {step.body}
          </DialogDescription>
        </DialogHeader>

        {step.shortcut && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Try it now:
            <kbd className="px-2 py-0.5 font-mono bg-muted border border-border rounded">
              {step.shortcut}
            </kbd>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStepIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepIndex(s => s - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (isLast) dismiss();
                else setStepIndex(s => s + 1);
              }}
            >
              {isLast ? 'Get started' : 'Next'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
