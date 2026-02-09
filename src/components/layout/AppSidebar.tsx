import { useIsPlatformAdmin } from '@/hooks/useUserProfile';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  FolderOpen,
  Package,
  BookOpen,
  FileText,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  end?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Projects', icon: FolderOpen, path: '/dashboard', end: true },
    ],
  },
  {
    label: 'Estimating',
    items: [
      { label: 'Materials', icon: Package, path: '/materials' },
      { label: 'Price Book', icon: BookOpen, path: '/price-book' },
    ],
  },
  {
    label: 'Quoting',
    items: [
      { label: 'Quotes', icon: FileText, path: '/quotes' },
    ],
  },
];

const ADMIN_GROUP: NavGroup = {
  label: 'Admin',
  items: [
    { label: 'Organizations', icon: Building2, path: '/admin/organizations' },
  ],
};

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const isMobile = useIsMobile();
  const isPlatformAdmin = useIsPlatformAdmin();

  const groups = isPlatformAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 h-14 shrink-0', collapsed && !isMobile && 'justify-center px-2')}>
        <img src="/favicon.png" alt="Flooro" className="w-8 h-8 shrink-0" />
        {(!collapsed || isMobile) && (
          <span className="text-lg font-semibold text-foreground tracking-tight">Flooro</span>
        )}
      </div>

      <Separator />

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && (!collapsed || isMobile) && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
            )}
            {group.label && collapsed && !isMobile && (
              <Separator className="mb-2" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path + item.label}
                  to={item.path}
                  end={item.end}
                  onClick={() => isMobile && onMobileClose()}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    collapsed && !isMobile && 'justify-center px-2'
                  )}
                  activeClassName="bg-primary/10 text-primary border-l-2 border-primary"
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section: Settings + collapse */}
      <div className="mt-auto px-2 pb-3 space-y-1">
        <Separator className="mb-2" />
        <NavLink
          to="/settings"
          onClick={() => isMobile && onMobileClose()}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            collapsed && !isMobile && 'justify-center px-2'
          )}
          activeClassName="bg-primary/10 text-primary border-l-2 border-primary"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Settings</span>}
        </NavLink>

        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              'w-full justify-start gap-3 text-muted-foreground hover:text-foreground',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronsLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile: use Sheet overlay
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent side="left" className="w-64 p-0 bg-card border-r border-border">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-card border-r border-border shrink-0 transition-all duration-200 h-full',
        collapsed ? 'w-[60px]' : 'w-60'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
