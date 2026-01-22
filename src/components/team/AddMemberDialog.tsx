import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTeamMember, MemberRole } from '@/hooks/useTeamMembers';
import { useCanAddTeamMember } from '@/hooks/useUsageLimits';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, AlertTriangle } from 'lucide-react';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createMember = useCreateTeamMember();
  const { canAdd, remaining } = useCanAddTeamMember();
  
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<MemberRole>('user');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
      return;
    }

    if (!canAdd) {
      toast({ 
        title: 'Team member limit reached', 
        description: 'Upgrade your plan to add more team members.',
        variant: 'destructive' 
      });
      return;
    }

    try {
      await createMember.mutateAsync({
        email: email.trim(),
        full_name: fullName.trim() || undefined,
        role,
      });
      
      toast({ 
        title: 'Member added!',
        description: `${email} has been added to your team. They will receive access when they sign up.`,
      });
      
      // Reset form
      setEmail('');
      setFullName('');
      setRole('user');
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // If user can't add members, show upgrade prompt
  if (!canAdd) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Team Member Limit Reached
            </DialogTitle>
            <DialogDescription>
              You've reached your team member limit on your current plan.
              Upgrade to add more members.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <Crown className="h-12 w-12 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground mb-4">
              Unlock more team members and features with a Pro or Enterprise plan.
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a new member to your organization. They will receive access when they sign up with this email.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access, can manage team</SelectItem>
                <SelectItem value="user">User - Can create and edit projects</SelectItem>
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMember.isPending}>
              {createMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
