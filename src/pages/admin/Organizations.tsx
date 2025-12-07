import { format } from 'date-fns';
import { Building2, Users, FolderOpen, Crown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllOrganizations } from '@/hooks/useServiceBureau';

const tierConfig = {
  free: { label: 'Free', className: 'bg-muted text-muted-foreground' },
  pro: { label: 'Pro', className: 'bg-primary/15 text-primary' },
  enterprise: { label: 'Enterprise', className: 'bg-accent/15 text-accent' },
};

export default function Organizations() {
  const { data: organizations, isLoading } = useAllOrganizations();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Organizations</h2>
        <p className="text-muted-foreground">
          Manage all organizations on the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Organizations
          </CardTitle>
          <CardDescription>
            {organizations?.length ?? 0} organizations registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !organizations?.length ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No organizations yet</h3>
              <p className="text-muted-foreground">
                Organizations will appear here when users create them.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <FolderOpen className="h-4 w-4" />
                        Projects
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Members
                      </div>
                    </TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            {org.logo_url ? (
                              <img 
                                src={org.logo_url} 
                                alt={org.name} 
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            {org.address && (
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {org.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={tierConfig[org.subscription_tier].className}>
                          {org.subscription_tier === 'enterprise' && (
                            <Crown className="h-3 w-3 mr-1" />
                          )}
                          {tierConfig[org.subscription_tier].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {org.project_count}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {org.member_count}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(org.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
