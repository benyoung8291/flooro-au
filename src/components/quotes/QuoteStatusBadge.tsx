import { cn } from '@/lib/utils';
import type { QuoteStatus } from '@/hooks/useQuotes';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; dotClass: string }> = {
  draft: { label: 'Draft', dotClass: 'bg-muted-foreground' },
  sent: { label: 'Sent', dotClass: 'bg-blue-500' },
  accepted: { label: 'Accepted', dotClass: 'bg-green-500' },
  declined: { label: 'Declined', dotClass: 'bg-destructive' },
  expired: { label: 'Expired', dotClass: 'bg-orange-500' },
};

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

export function QuoteStatusBadge({ status, className }: QuoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground', className)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', config.dotClass)} />
      {config.label}
    </span>
  );
}
