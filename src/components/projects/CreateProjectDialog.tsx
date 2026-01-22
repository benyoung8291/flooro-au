import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '@/hooks/useProjects';
import { useCanCreateProject } from '@/hooks/useUsageLimits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, AlertTriangle } from 'lucide-react';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const { canCreate, remaining } = useCanCreateProject();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: 'Project name required', variant: 'destructive' });
      return;
    }

    if (!canCreate) {
      toast({ 
        title: 'Project limit reached', 
        description: 'Upgrade your plan to create more projects.',
        variant: 'destructive' 
      });
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        address: address.trim() || undefined,
      });
      
      toast({ title: 'Project created!' });
      onOpenChange(false);
      setName('');
      setAddress('');
      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      toast({ title: 'Failed to create project', description: error.message, variant: 'destructive' });
    }
  };

  // If user can't create projects, show upgrade prompt
  if (!canCreate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Project Limit Reached
            </DialogTitle>
            <DialogDescription>
              You've reached your project limit on your current plan.
              Upgrade to create more projects.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <Crown className="h-12 w-12 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground mb-4">
              Unlock more projects and features with a Pro or Enterprise plan.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate('/settings?tab=billing')}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Start a new floor plan measurement project.
              {remaining !== Infinity && remaining <= 3 && (
                <span className="block mt-1 text-warning">
                  {remaining} project{remaining === 1 ? '' : 's'} remaining on your plan
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="e.g., Smith Residence - Kitchen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-address">Address (optional)</Label>
              <Input
                id="project-address"
                placeholder="e.g., 123 Main St, City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending || !name.trim()}>
              {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
