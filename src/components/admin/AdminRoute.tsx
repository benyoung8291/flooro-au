import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPlatformAdmin } from '@/hooks/useUserProfile';
import { Loader2 } from 'lucide-react';

export function AdminRoute() {
  const { user, loading: authLoading } = useAuth();
  const isPlatformAdmin = useIsPlatformAdmin();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
