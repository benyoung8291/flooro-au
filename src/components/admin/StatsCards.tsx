import { FolderOpen, Building2, Users, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminStats } from '@/hooks/useServiceBureau';
import { Skeleton } from '@/components/ui/skeleton';

export function StatsCards() {
  const { data: stats, isLoading } = useAdminStats();

  const cards = [
    {
      title: 'Total Projects',
      value: stats?.totalProjects ?? 0,
      icon: FolderOpen,
      iconClassName: 'text-primary',
    },
    {
      title: 'Organizations',
      value: stats?.totalOrganizations ?? 0,
      icon: Building2,
      iconClassName: 'text-muted-foreground',
    },
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      iconClassName: 'text-muted-foreground',
    },
    {
      title: 'Pro/Enterprise',
      value: (stats?.tierBreakdown?.pro ?? 0) + (stats?.tierBreakdown?.enterprise ?? 0),
      icon: CreditCard,
      iconClassName: 'text-success',
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
        </Card>
      ))}
    </div>
  );
}
