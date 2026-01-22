import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wraps content that requires a specific feature.
 * Shows the children if the user has access, otherwise shows upgrade prompt.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { limits, currentTier } = useSubscription();
  const hasAccess = limits.features.includes(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <FeatureLockedPlaceholder feature={feature} />;
}

interface FeatureLockedPlaceholderProps {
  feature: string;
}

function FeatureLockedPlaceholder({ feature }: FeatureLockedPlaceholderProps) {
  const navigate = useNavigate();
  const featureNames: Record<string, string> = {
    pdf_reports: 'PDF Reports',
    tile_patterns: 'Tile Patterns',
    '3d_viewer': '3D Viewer',
    seam_optimization: 'Seam Optimization',
    cross_room_optimizer: 'Cross-Room Optimizer',
    white_label: 'White Label Branding',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50 text-center">
      <Lock className="h-8 w-8 text-muted-foreground mb-3" />
      <h3 className="font-semibold mb-1">
        {featureNames[feature] || feature} is a Pro Feature
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Upgrade your plan to unlock this feature
      </p>
      <Button size="sm" onClick={() => navigate('/settings?tab=billing')}>
        <Crown className="h-4 w-4 mr-2" />
        Upgrade Now
      </Button>
    </div>
  );
}

interface LimitGateProps {
  type: 'projects' | 'teamMembers' | 'storage';
  currentUsage: number;
  children: ReactNode;
  onLimitReached?: () => void;
}

/**
 * Wraps actions that are subject to usage limits.
 * Shows the children if under limit, otherwise shows upgrade prompt.
 */
export function LimitGate({ type, currentUsage, children, onLimitReached }: LimitGateProps) {
  const { limits } = useSubscription();
  const limit = type === 'projects' ? limits.projects 
    : type === 'teamMembers' ? limits.teamMembers 
    : limits.storageMB;
  
  const isUnlimited = limit === -1;
  const isUnderLimit = isUnlimited || currentUsage < limit;

  if (isUnderLimit) {
    return <>{children}</>;
  }

  return <LimitReachedButton type={type} limit={limit} onLimitReached={onLimitReached} />;
}

interface LimitReachedButtonProps {
  type: 'projects' | 'teamMembers' | 'storage';
  limit: number;
  onLimitReached?: () => void;
}

function LimitReachedButton({ type, limit, onLimitReached }: LimitReachedButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  const typeLabels = {
    projects: 'projects',
    teamMembers: 'team members',
    storage: 'storage',
  };

  const handleClick = () => {
    onLimitReached?.();
    setShowDialog(true);
  };

  return (
    <>
      <Button variant="outline" onClick={handleClick}>
        <Lock className="h-4 w-4 mr-2" />
        Limit Reached
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-warning" />
              Upgrade Required
            </DialogTitle>
            <DialogDescription>
              You've reached your limit of {limit} {typeLabels[type]} on your current plan.
              Upgrade to add more.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate('/settings?tab=billing')}>
              View Plans
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface UpgradePromptProps {
  title?: string;
  description?: string;
  className?: string;
}

/**
 * A standalone upgrade prompt component for use in empty states or CTAs.
 */
export function UpgradePrompt({ 
  title = "Unlock More Features",
  description = "Upgrade your plan to access advanced features and increase limits.",
  className = ""
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const { currentTier } = useSubscription();

  if (currentTier === 'enterprise') {
    return null;
  }

  return (
    <div className={`p-4 border rounded-lg bg-primary/5 border-primary/20 ${className}`}>
      <div className="flex items-start gap-3">
        <Crown className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button size="sm" onClick={() => navigate('/settings?tab=billing')}>
          Upgrade
        </Button>
      </div>
    </div>
  );
}
