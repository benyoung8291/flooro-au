import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganization } from './useUserProfile';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface SubscriptionStatus {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscription_end: string | null;
  cancel_at_period_end?: boolean;
}

export interface TierLimits {
  projects: number;
  teamMembers: number;
  storageMB: number;
  features: string[];
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    projects: 3,
    teamMembers: 2,
    storageMB: 100,
    features: ['basic_export'],
  },
  pro: {
    projects: 25,
    teamMembers: 10,
    storageMB: 1000,
    features: ['basic_export', 'pdf_reports', 'tile_patterns', '3d_viewer'],
  },
  enterprise: {
    projects: -1, // unlimited
    teamMembers: -1,
    storageMB: 10000,
    features: ['basic_export', 'pdf_reports', 'tile_patterns', '3d_viewer', 'seam_optimization', 'cross_room_optimizer', 'white_label'],
  },
};

export const TIER_PRICES = {
  free: { amount: 0, label: '$0' },
  pro: { amount: 49, label: '$49/mo' },
  enterprise: { amount: 199, label: '$199/mo' },
};

export function useSubscription() {
  const { user, session } = useAuth();
  const { data: organization } = useUserOrganization();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setStatus(data as SubscriptionStatus);
    } catch (err: any) {
      console.error('Failed to check subscription:', err);
      setError(err.message);
      // Default to organization's tier or free
      setStatus({
        subscribed: false,
        tier: (organization?.subscription_tier as SubscriptionTier) || 'free',
        subscription_end: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, organization?.subscription_tier]);

  // Check subscription on mount and when session changes
  useEffect(() => {
    if (session?.access_token) {
      checkSubscription();
    }
  }, [session?.access_token, checkSubscription]);

  // Return the current tier (from status if available, fallback to org)
  const currentTier: SubscriptionTier = status?.tier || (organization?.subscription_tier as SubscriptionTier) || 'free';
  const limits = TIER_LIMITS[currentTier];

  return {
    status,
    currentTier,
    limits,
    isLoading,
    error,
    refresh: checkSubscription,
  };
}

export function useCreateCheckout() {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const createCheckout = async (tier: 'pro' | 'enterprise' = 'pro') => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  return { createCheckout, isLoading };
}

export function useCustomerPortal() {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const openPortal = async () => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  return { openPortal, isLoading };
}

export function useCanAccessFeature(feature: string): boolean {
  const { limits } = useSubscription();
  return limits.features.includes(feature);
}

export function useUsageLimits() {
  const { limits, currentTier } = useSubscription();
  
  return {
    projectLimit: limits.projects,
    teamMemberLimit: limits.teamMembers,
    storageLimitMB: limits.storageMB,
    isUnlimited: (limit: number) => limit === -1,
    tier: currentTier,
  };
}
