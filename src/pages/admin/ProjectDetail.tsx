import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Calendar, 
  FileText, 
  Save,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useAdminProject, 
  useUpdateProjectStatus, 
  useUpdateInternalNotes 
} from '@/hooks/useServiceBureau';
import { useToast } from '@/hooks/use-toast';

const statusConfig = {
  draft: { label: 'Draft', className: 'status-draft' },
  pending_service: { label: 'Pending', className: 'status-pending' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: project, isLoading } = useAdminProject(projectId);
  const updateStatus = useUpdateProjectStatus();
  const updateNotes = useUpdateInternalNotes();

  const [internalNotes, setInternalNotes] = useState('');
  const [hasEditedNotes, setHasEditedNotes] = useState(false);

  // Initialize internal notes when project loads
  if (project && !hasEditedNotes && internalNotes !== (project.internal_notes ?? '')) {
    setInternalNotes(project.internal_notes ?? '');
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!projectId) return;
    try {
      await updateStatus.mutateAsync({ 
        projectId, 
        status: newStatus as 'draft' | 'pending_service' | 'in_progress' | 'completed' 
      });
      toast({
        title: 'Status updated',
        description: `Project status changed to ${statusConfig[newStatus as keyof typeof statusConfig].label}`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update project status',
        variant: 'destructive',
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!projectId) return;
    try {
      await updateNotes.mutateAsync({ projectId, internal_notes: internalNotes });
      setHasEditedNotes(false);
      toast({
        title: 'Notes saved',
        description: 'Internal notes have been updated',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Project not found</h3>
        <p className="text-muted-foreground mb-4">
          The project you're looking for doesn't exist or you don't have access.
        </p>
        <Button onClick={() => navigate('/admin/queue')}>
          Back to Queue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{project.organization?.name ?? 'Unknown Organization'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={statusConfig[project.status].className}>
            {statusConfig[project.status].label}
          </Badge>
          {project.service_requested && (
            <Badge variant="outline" className="text-primary border-primary">
              Service Requested
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Details about the project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Address</div>
                <div className="text-muted-foreground">
                  {project.address || 'No address provided'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Created</div>
                <div className="text-muted-foreground">
                  {format(new Date(project.created_at), 'MMMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>

            {project.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Client Notes</div>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {project.notes}
                  </div>
                </div>
              </div>
            )}

            {project.floor_plan_url && (
              <div className="pt-2">
                <Button variant="outline" asChild className="w-full">
                  <a href={project.floor_plan_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Floor Plan
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>Manage project status and notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={project.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_service">Pending Service</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Internal Notes
                <span className="text-muted-foreground font-normal ml-1">
                  (not visible to client)
                </span>
              </label>
              <Textarea
                placeholder="Add internal notes about this project..."
                value={internalNotes}
                onChange={(e) => {
                  setInternalNotes(e.target.value);
                  setHasEditedNotes(true);
                }}
                rows={5}
              />
              {hasEditedNotes && (
                <Button 
                  onClick={handleSaveNotes} 
                  className="mt-2"
                  disabled={updateNotes.isPending}
                >
                  {updateNotes.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Notes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Data Preview */}
      {project.json_data && Object.keys(project.json_data).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Data</CardTitle>
            <CardDescription>Raw project data from the editor</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono max-h-96">
              {JSON.stringify(project.json_data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
