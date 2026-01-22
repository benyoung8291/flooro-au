import { useUserOrganization, useHasRole } from '@/hooks/useUserProfile';
import { useSubscription, useCreateCheckout, useCustomerPortal, TIER_LIMITS, TIER_PRICES, SubscriptionTier } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, CheckCircle2, ArrowUpRight, Loader2, Crown, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export function BillingSettings() {
  const { toast } = useToast();
  const { data: organization } = useUserOrganization();
  const { status, currentTier, isLoading: subLoading, refresh } = useSubscription();
  const { createCheckout, isLoading: checkoutLoading } = useCreateCheckout();
  const { openPortal, isLoading: portalLoading } = useCustomerPortal();
  const isAdmin = useHasRole('admin');

  const handleUpgrade = async (tier: 'pro' | 'enterprise') => {
    try {
      await createCheckout(tier);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openPortal();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const tiers: { key: SubscriptionTier; name: string; icon: React.ReactNode }[] = [
    { key: 'free', name: 'Free', icon: null },
    { key: 'pro', name: 'Pro', icon: <Sparkles className="h-4 w-4" /> },
    { key: 'enterprise', name: 'Enterprise', icon: <Crown className="h-4 w-4" /> },
  ];

  if (subLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold capitalize">{currentTier}</h3>
                {status?.subscribed && (
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-primary">
                {TIER_PRICES[currentTier].label}
              </p>
              {status?.subscription_end && (
                <p className="text-sm text-muted-foreground mt-1">
                  {status.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                  {format(new Date(status.subscription_end), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            {status?.subscribed && isAdmin && (
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                )}
                Manage Subscription
              </Button>
            )}
          </div>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Included features:</h4>
            <ul className="space-y-1">
              {TIER_LIMITS[currentTier].features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {formatFeatureName(feature)}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium mb-2">Usage limits:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Projects</p>
                <p className="font-bold">
                  {TIER_LIMITS[currentTier].projects === -1 ? 'Unlimited' : TIER_LIMITS[currentTier].projects}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Team Members</p>
                <p className="font-bold">
                  {TIER_LIMITS[currentTier].teamMembers === -1 ? 'Unlimited' : TIER_LIMITS[currentTier].teamMembers}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Storage</p>
                <p className="font-bold">
                  {TIER_LIMITS[currentTier].storageMB >= 1000 
                    ? `${TIER_LIMITS[currentTier].storageMB / 1000} GB` 
                    : `${TIER_LIMITS[currentTier].storageMB} MB`}
                </p>
              </div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-4" 
            onClick={refresh}
            disabled={subLoading}
          >
            Refresh Status
          </Button>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {currentTier !== 'enterprise' && isAdmin && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>
              Get more projects, team members, and advanced features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pro Plan */}
              {currentTier === 'free' && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-bold">Pro</h3>
                  </div>
                  <p className="text-2xl font-bold mb-2">{TIER_PRICES.pro.label}</p>
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li>• 25 projects</li>
                    <li>• 10 team members</li>
                    <li>• 1 GB storage</li>
                    <li>• PDF reports</li>
                    <li>• Tile patterns</li>
                  </ul>
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade('pro')}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Upgrade to Pro
                  </Button>
                </div>
              )}

              {/* Enterprise Plan */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-warning" />
                  <h3 className="font-bold">Enterprise</h3>
                </div>
                <p className="text-2xl font-bold mb-2">{TIER_PRICES.enterprise.label}</p>
                <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                  <li>• Unlimited projects</li>
                  <li>• Unlimited team members</li>
                  <li>• 10 GB storage</li>
                  <li>• All Pro features</li>
                  <li>• Priority support</li>
                </ul>
                <Button 
                  className="w-full" 
                  variant={currentTier === 'pro' ? 'default' : 'outline'}
                  onClick={() => handleUpgrade('enterprise')}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {currentTier === 'pro' ? 'Upgrade to Enterprise' : 'Get Enterprise'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatFeatureName(feature: string): string {
  const names: Record<string, string> = {
    basic_export: 'Basic Export',
    pdf_reports: 'PDF Reports',
    tile_patterns: 'Tile Patterns',
    '3d_viewer': '3D Viewer',
    seam_optimization: 'Seam Optimization',
    cross_room_optimizer: 'Cross-Room Optimizer',
    white_label: 'White Label',
  };
  return names[feature] || feature;
}
