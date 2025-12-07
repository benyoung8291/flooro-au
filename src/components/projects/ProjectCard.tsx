import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/hooks/useProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  MapPin, 
  Clock,
  ExternalLink 
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'status-draft' },
  pending_service: { label: 'Pending Service', className: 'status-pending' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();
  const status = statusConfig[project.status] || statusConfig.draft;

  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div 
            className="flex-1 min-w-0"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {project.name}
              </h3>
              <Badge variant="secondary" className={`text-xs ${status.className}`}>
                {status.label}
              </Badge>
            </div>
            
            {project.address && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{project.address}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/settings`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
