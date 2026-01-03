import { Loader2, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  className?: string;
}

export function SaveStatusIndicator({ status, lastSaved, className }: SaveStatusIndicatorProps) {
  if (status === 'idle') {
    // Show subtle "All saved" if we have a last saved time
    if (lastSaved) {
      return (
        <div className={cn("flex items-center gap-1.5 text-muted-foreground/60 text-xs", className)}>
          <Check className="w-3 h-3" />
          <span className="hidden sm:inline">Saved</span>
        </div>
      );
    }
    return null;
  }

  if (status === 'saving') {
    return (
      <div className={cn("flex items-center gap-1.5 text-muted-foreground text-xs animate-in fade-in", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="hidden sm:inline">Saving...</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className={cn("flex items-center gap-1.5 text-green-600 dark:text-green-500 text-xs animate-in fade-in", className)}>
        <Check className="w-3 h-3" />
        <span className="hidden sm:inline">Saved</span>
      </div>
    );
  }

  // unsaved
  return (
    <div className={cn("flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-xs animate-in fade-in", className)}>
      <Circle className="w-2 h-2 fill-current" />
      <span className="hidden sm:inline">Unsaved</span>
    </div>
  );
}
