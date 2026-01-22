import { StatsCards } from '@/components/admin/StatsCards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAllOrganizations } from '@/hooks/useServiceBureau';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminDashboard() {
  const { data: organizations, isLoading } = useAllOrganizations();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of platform activity and organizations
        </p>
      </div>

      <StatsCards />

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            All organizations on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !organizations?.length ? (
            <p className="text-muted-foreground text-center py-8">No organizations yet</p>
          ) : (
            <div className="space-y-3">
              {organizations.slice(0, 10).map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {org.project_count} projects · {org.member_count} members
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {org.subscription_tier}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
