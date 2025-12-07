import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FolderOpen, LayoutGrid, List } from 'lucide-react';

export function ProjectList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.address?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteProject.mutateAsync(deleteId);
      toast({ title: 'Project deleted' });
    } catch (error: any) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    }
    setDeleteId(null);
  };

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Projects</h2>
        <Button onClick={() => navigate('/projects/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Search and View Toggle */}
      {projects && projects.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center border border-border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Project Grid/List */}
      {filteredProjects && filteredProjects.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-2'
        }>
          {filteredProjects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onDelete={setDeleteId}
            />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No projects match your search.
        </div>
      ) : (
        <EmptyState onCreateClick={() => navigate('/projects/new')} />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All measurements and data in this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <FolderOpen className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Create your first project to start measuring floor plans and estimating materials.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="w-4 h-4 mr-2" />
        Create First Project
      </Button>
    </div>
  );
}

function ProjectListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
