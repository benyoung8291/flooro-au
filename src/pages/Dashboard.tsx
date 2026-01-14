import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile, useUserOrganization, useIsPlatformAdmin } from '@/hooks/useUserProfile';
import { useProjectStats } from '@/hooks/useProjects';
import { ProjectList } from '@/components/projects/ProjectList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  FolderOpen, 
  Clock, 
  CheckCircle2, 
  Settings,
  LogOut,
  Shield,
  Package
} from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: organization, isLoading: orgLoading } = useUserOrganization();
  const isPlatformAdmin = useIsPlatformAdmin();
  const stats = useProjectStats();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profileLoading && profile && !profile.organization_id) {
      navigate('/onboarding');
    }
  }, [profile, profileLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (profileLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Flooro" className="w-9 h-9" />
            <span className="text-xl font-semibold text-foreground">Flooro</span>
            {organization && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground font-medium">{organization.name}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isPlatformAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                <Shield className="w-4 h-4 mr-2" />
                Service Bureau
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/materials')}>
              <Package className="w-4 h-4 mr-2" />
              Materials
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground">
            Manage your flooring estimation projects
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard 
            icon={<FolderOpen className="w-5 h-5" />}
            label="Total Projects"
            value={stats.total.toString()}
          />
          <StatsCard 
            icon={<Clock className="w-5 h-5" />}
            label="Pending Service"
            value={stats.pending.toString()}
            highlight={stats.pending > 0}
          />
          <StatsCard 
            icon={<Clock className="w-5 h-5" />}
            label="In Progress"
            value={stats.inProgress.toString()}
          />
          <StatsCard 
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Completed"
            value={stats.completed.toString()}
          />
        </div>

        {/* Projects List */}
        <ProjectList />
      </main>
    </div>
  );
}

function StatsCard({ 
  icon, 
  label, 
  value, 
  highlight = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-warning/50 bg-warning/5' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            highlight ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'
          }`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <header className="border-b border-border bg-card h-16 flex items-center px-4">
        <Skeleton className="h-9 w-32" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-48 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </main>
    </>
  );
}
