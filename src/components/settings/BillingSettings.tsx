import { useUserOrganization } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle2, ArrowUpRight } from 'lucide-react';

const tierFeatures = {
  free: {
    name: 'Free',
    price: '$0',
    features: ['3 projects', '2 team members', '100 MB storage', 'Basic export'],
  },
  pro: {
    name: 'Pro',
    price: '$49/mo',
    features: ['25 projects', '10 team members', '1 GB storage', 'PDF reports', 'Tile patterns'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited projects', 'Unlimited team members', '10 GB storage', 'All features', 'Priority support'],
  },
};

export function BillingSettings() {
  const { data: organization } = useUserOrganization();
  const currentTier = organization?.subscription_tier || 'free';
  const tierInfo = tierFeatures[currentTier as keyof typeof tierFeatures];

  return (
    <div className="space-y-6">
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
                <h3 className="text-xl font-bold">{tierInfo.name}</h3>
                <Badge variant="secondary" className="capitalize">
                  {currentTier}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-primary">{tierInfo.price}</p>
            </div>
            <Button variant="outline">
              Manage Subscription
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Included features:</h4>
            <ul className="space-y-1">
              {tierInfo.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {currentTier === 'free' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Upgrade to Pro</CardTitle>
            <CardDescription>
              Get more projects, team members, and advanced features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Upgrade Now - $49/month
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
