import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';

export default function Admin() {
  const location = useLocation();
  const isRootAdmin = location.pathname === '/admin';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 gap-4 bg-card">
            <SidebarTrigger />
            <h1 className="font-semibold text-foreground">Platform Admin</h1>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {isRootAdmin ? <AdminDashboard /> : <Outlet />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
