import { Badge } from '@/components/ui/badge';
import type { QuoteStatus } from '@/hooks/useQuotes';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'default' },
  declined: { label: 'Declined', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'outline' },
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  accepted: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  declined: 'bg-destructive/15 text-destructive border-destructive/30',
  expired: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
};

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

export function QuoteStatusBadge({ status, className }: QuoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <Badge
      variant="outline"
      className={`${STATUS_COLORS[status] || ''} ${className || ''}`}
    >
      {config.label}
    </Badge>
  );
}
