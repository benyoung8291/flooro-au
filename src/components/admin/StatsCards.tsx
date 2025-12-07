import { Clock, Loader2, CheckCircle2, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceStats } from '@/hooks/useServiceBureau';
import { Skeleton } from '@/components/ui/skeleton';

export function StatsCards() {
  const { data: stats, isLoading } = useServiceStats();

  const cards = [
    {
      title: 'Pending Requests',
      value: stats?.pending ?? 0,
      icon: Clock,
      className: 'status-pending',
      iconClassName: 'text-warning',
    },
    {
      title: 'In Progress',
      value: stats?.inProgress ?? 0,
      icon: Loader2,
      className: 'status-progress',
      iconClassName: 'text-primary',
    },
    {
      title: 'Completed',
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      className: 'status-completed',
      iconClassName: 'text-success',
    },
    {
      title: 'Organizations',
      value: stats?.organizations ?? 0,
      icon: Building2,
      className: 'bg-secondary text-secondary-foreground',
      iconClassName: 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.iconClassName}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{card.value}</div>
            )}
          </CardContent>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${card.className}`}
          />
        </Card>
      ))}
    </div>
  );
}
