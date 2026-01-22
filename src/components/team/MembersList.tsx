import { useState } from 'react';
import { useTeamMembers, useDeleteTeamMember, useUpdateTeamMember, OrganizationMember } from '@/hooks/useTeamMembers';
import { useHasRole } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, UserPlus, Shield, User, Eye, Trash2, Ban, CheckCircle2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddMemberDialog } from './AddMemberDialog';
import { format } from 'date-fns';

const roleConfig = {
  admin: { label: 'Admin', icon: Shield, className: 'bg-primary/10 text-primary' },
  user: { label: 'User', icon: User, className: 'bg-secondary text-secondary-foreground' },
  viewer: { label: 'Viewer', icon: Eye, className: 'bg-muted text-muted-foreground' },
};

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20' },
  suspended: { label: 'Suspended', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function MembersList() {
  const { toast } = useToast();
  const { data: members, isLoading } = useTeamMembers();
  const deleteMember = useDeleteTeamMember();
  const updateMember = useUpdateTeamMember();
  const isAdmin = useHasRole('admin');
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);

  const handleDelete = async () => {
    if (!selectedMember) return;
    
    try {
      await deleteMember.mutateAsync(selectedMember.id);
      toast({ title: 'Member removed', description: 'Team member has been removed.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setDeleteDialogOpen(false);
    setSelectedMember(null);
  };

  const handleStatusChange = async (member: OrganizationMember, newStatus: 'active' | 'suspended') => {
    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        updates: { status: newStatus },
      });
      toast({ 
        title: newStatus === 'active' ? 'Member activated' : 'Member suspended',
        description: `${member.email} has been ${newStatus === 'active' ? 'activated' : 'suspended'}.`,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRoleChange = async (member: OrganizationMember, newRole: 'admin' | 'user' | 'viewer') => {
    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        updates: { role: newRole },
      });
      toast({ 
        title: 'Role updated',
        description: `${member.email} is now a ${roleConfig[newRole].label}.`,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage who has access to your organization
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!members?.length ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No team members yet</h3>
              <p className="text-muted-foreground mb-4">Add team members to collaborate on projects.</p>
              {isAdmin && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Member
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const role = roleConfig[member.role] || roleConfig.user;
                  const status = statusConfig[member.status] || statusConfig.pending;
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.full_name || 'Unnamed'}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={role.className}>
                          <role.icon className="h-3 w-3 mr-1" />
                          {role.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(member.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRoleChange(member, 'admin')}>
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(member, 'user')}>
                                <User className="h-4 w-4 mr-2" />
                                Make User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(member, 'viewer')}>
                                <Eye className="h-4 w-4 mr-2" />
                                Make Viewer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {member.status === 'suspended' ? (
                                <DropdownMenuItem onClick={() => handleStatusChange(member, 'active')}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleStatusChange(member, 'suspended')}>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddMemberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedMember?.email} from your organization. 
              They will lose access to all projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
