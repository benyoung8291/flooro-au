import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile, useCreateOrganization } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const [orgName, setOrgName] = useState('');
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const createOrg = useCreateOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast({ title: 'Organization name required', variant: 'destructive' });
      return;
    }

    try {
      await createOrg.mutateAsync(orgName.trim());
      toast({ title: 'Organization created!', description: 'Welcome to Flooro.' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ 
        title: 'Failed to create organization', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-slide-up">
        <Card className="glass-panel border-border/50">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold">
              Create your organization
            </CardTitle>
            <CardDescription>
              Hi {profile?.full_name || 'there'}! Set up your organization to start managing flooring projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  type="text"
                  placeholder="Acme Flooring Co."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This is typically your company or team name.
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={createOrg.isPending || !orgName.trim()}
              >
                {createOrg.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
