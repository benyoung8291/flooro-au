import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { StatsCards } from '@/components/admin/StatsCards';
import { ServiceQueueTable } from '@/components/admin/ServiceQueueTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of service requests and platform activity
        </p>
      </div>

      <StatsCards />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Service Requests</CardTitle>
            <CardDescription>
              Projects awaiting processing from the service bureau
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/queue">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ServiceQueueTable />
        </CardContent>
      </Card>
    </div>
  );
}
