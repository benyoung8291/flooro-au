import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile, useCreateOrganization } from '@/hooks/useUserProfile';
import {
  useDomainOrganizations,
  useMyAccessRequests,
  useCreateAccessRequest,
} from '@/hooks/useAccessRequests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, ArrowRight, Users, Clock, Plus } from 'lucide-react';

type Step = 'loading' | 'domain-match' | 'create-org' | 'request-sent';

export default function Onboarding() {
  const [step, setStep] = useState<Step>('loading');
  const [orgName, setOrgName] = useState('');
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: domainOrgs, isLoading: domainLoading } = useDomainOrganizations();
  const { data: myRequests, isLoading: requestsLoading } = useMyAccessRequests();
  const createOrg = useCreateOrganization();
  const createRequest = useCreateAccessRequest();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Guard: redirect if user already has an org
  useEffect(() => {
    if (profile && profile.organization_id) {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  // Determine initial step once data loads
  useEffect(() => {
    if (domainLoading || requestsLoading) return;

    // If user has a pending request, show waiting state
    const pendingRequest = myRequests?.find((r) => r.status === 'pending');
    if (pendingRequest) {
      setStep('request-sent');
      return;
    }

    // If domain orgs found, show the match screen
    if (domainOrgs && domainOrgs.length > 0) {
      setStep('domain-match');
      return;
    }

    // Otherwise, go straight to create org
    setStep('create-org');
  }, [domainOrgs, myRequests, domainLoading, requestsLoading]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      toast({ title: 'Organisation name required', variant: 'destructive' });
      return;
    }

    try {
      const org = await createOrg.mutateAsync(orgName.trim());
      // Optimistic cache update to prevent redirect loop
      if (user) {
        queryClient.setQueryData(['profile', user.id], (old: any) => ({
          ...old,
          organization_id: org.id,
        }));
      }
      toast({ title: 'Organisation created!', description: 'Welcome to Flooro.' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Failed to create organisation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRequestAccess = async (orgId: string) => {
    if (!user) return;

    try {
      await createRequest.mutateAsync({
        organizationId: orgId,
        email: user.email || '',
        fullName: profile?.full_name || undefined,
      });
      toast({
        title: 'Request sent!',
        description: 'The organisation admin will review your request.',
      });
      setStep('request-sent');
    } catch (error: any) {
      toast({
        title: 'Failed to send request',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === 'request-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-slide-up">
          <Card className="glass-panel border-border/50">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold">
                Request pending
              </CardTitle>
              <CardDescription>
                Your access request has been sent to the organisation admin. You'll be notified when it's approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep('create-org')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create my own organisation instead
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'domain-match') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-slide-up">
          <Card className="glass-panel border-border/50">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold">
                Join your team
              </CardTitle>
              <CardDescription>
                We found {domainOrgs!.length === 1 ? 'an organisation' : 'organisations'} using your email domain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {domainOrgs!.map((org) => (
                <div
                  key={org.org_id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{org.org_name}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleRequestAccess(org.org_id)}
                    disabled={createRequest.isPending}
                  >
                    {createRequest.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Request Access'
                    )}
                  </Button>
                </div>
              ))}

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep('create-org')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create a new organisation
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This will create a separate organisation account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // step === 'create-org'
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-slide-up">
        <Card className="glass-panel border-border/50">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold">
              Create your organisation
            </CardTitle>
            <CardDescription>
              Hi {profile?.full_name || 'there'}! Set up your organisation to start managing flooring projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organisation Name</Label>
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

              {/* Show back link if they came from domain match */}
              {domainOrgs && domainOrgs.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setStep('domain-match')}
                >
                  ← Back to join existing organisation
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
