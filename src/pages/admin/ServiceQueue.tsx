import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, ArrowUpRight, CheckCircle2, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllProjects, useUpdateProjectStatus, ServiceProject } from '@/hooks/useServiceBureau';
import { useToast } from '@/hooks/use-toast';

const statusConfig = {
  draft: { label: 'Draft', className: 'status-draft' },
  pending_service: { label: 'Pending', className: 'status-pending' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
};

export default function ServiceQueue() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: projects, isLoading } = useAllProjects(statusFilter);
  const updateStatus = useUpdateProjectStatus();

  const handleStatusChange = async (projectId: string, newStatus: ServiceProject['status']) => {
    try {
      await updateStatus.mutateAsync({ projectId, status: newStatus });
      toast({
        title: 'Status updated',
        description: `Project status changed to ${statusConfig[newStatus].label}`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update project status',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Service Queue</h2>
        <p className="text-muted-foreground">
          Manage all projects and service requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>
                {projects?.length ?? 0} projects total
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_service">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !projects?.length ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No projects found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' 
                  ? 'Try changing the filter to see more projects.'
                  : 'No projects have been created yet.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.organization?.name ?? 'Unknown'}
                      </TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {project.address || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig[project.status].className}>
                          {statusConfig[project.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {project.service_requested ? (
                          <Badge variant="outline" className="text-primary border-primary">
                            Requested
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(project.updated_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/projects/${project.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {project.status === 'pending_service' && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(project.id, 'in_progress')}
                              >
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                Start Processing
                              </DropdownMenuItem>
                            )}
                            {project.status === 'in_progress' && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(project.id, 'completed')}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Completed
                              </DropdownMenuItem>
                            )}
                            {project.status === 'draft' && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(project.id, 'pending_service')}
                              >
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                Move to Pending
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
