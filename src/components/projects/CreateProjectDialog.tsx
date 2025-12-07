import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '@/hooks/useProjects';
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
import { Loader2 } from 'lucide-react';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProject = useCreateProject();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: 'Project name required', variant: 'destructive' });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Start a new floor plan measurement project.
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
