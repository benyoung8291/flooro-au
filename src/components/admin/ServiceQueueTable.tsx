import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MoreHorizontal, Eye, ArrowUpRight, CheckCircle2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useServiceQueue, useUpdateProjectStatus, ServiceProject } from '@/hooks/useServiceBureau';
import { useToast } from '@/hooks/use-toast';

const statusConfig = {
  draft: { label: 'Draft', className: 'status-draft' },
  pending_service: { label: 'Pending', className: 'status-pending' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
};

export function ServiceQueueTable() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: projects, isLoading } = useServiceQueue();
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No pending requests</h3>
        <p className="text-muted-foreground">All service requests have been processed.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
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
              <TableCell className="text-muted-foreground">
                {project.address || '—'}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={statusConfig[project.status].className}>
                  {statusConfig[project.status].label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(project.created_at), 'MMM d, yyyy')}
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
