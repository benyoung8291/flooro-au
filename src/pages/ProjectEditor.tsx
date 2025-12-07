import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject, useRequestService } from '@/hooks/useProjects';
import { useHasRole } from '@/hooks/useUserProfile';
import { useMaterials } from '@/hooks/useMaterials';
import { useIsMobile } from '@/hooks/use-mobile';
import { EditorCanvas, EditorTool } from '@/components/editor/EditorCanvas';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorSidebar } from '@/components/editor/EditorSidebar';
import { FloorPlanUpload } from '@/components/editor/FloorPlanUpload';
import { ImageControls } from '@/components/editor/ImageControls';
import { MobileNav } from '@/components/editor/MobileNav';
import { MobileToolFAB } from '@/components/editor/MobileToolFAB';
import { MobileSidebarDrawer } from '@/components/editor/MobileSidebarDrawer';
import { ThreeDViewer } from '@/components/editor/ThreeDViewer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ReportPreviewDialog } from '@/components/reports/ReportPreviewDialog';
import { generateReport } from '@/lib/reports/calculations';
import { Room, ScaleCalibration, BackgroundImage } from '@/lib/canvas/types';
import { 
  ArrowLeft, 
  Save, 
  MoreVertical,
  Phone,
  Loader2,
  PanelRightClose,
  PanelRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusLabels: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'status-draft' },
  pending_service: { label: 'Pending Service', className: 'status-pending' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
};

export default function ProjectEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  
  const { data: project, isLoading } = useProject(projectId);
  const { data: materials } = useMaterials();
  const updateProject = useUpdateProject();
  const requestService = useRequestService();
  const isViewer = useHasRole('viewer');

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localData, setLocalData] = useState<Record<string, unknown>>({});
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);

  // Sync local data with project data
  useEffect(() => {
    if (project?.json_data) {
      setLocalData(project.json_data as Record<string, unknown>);
    }
  }, [project?.json_data]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 'd': setActiveTool('draw'); break;
        case 'h': setActiveTool('hole'); break;
        case 'o': setActiveTool('door'); break;
        case 's': 
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSave();
          } else {
            setActiveTool('scale');
          }
          break;
        case ' ': 
          e.preventDefault();
          setActiveTool('pan'); 
          break;
        case '2':
          setIs3DMode(false);
          break;
        case '3':
          setIs3DMode(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDataChange = useCallback((data: Record<string, unknown>) => {
    setLocalData(prev => ({ ...prev, ...data }));
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = async () => {
    if (!projectId || isViewer) return;

    try {
      await updateProject.mutateAsync({
        id: projectId,
        updates: { json_data: localData as any },
      });
      setHasUnsavedChanges(false);
      toast({ title: 'Project saved' });
    } catch (error: any) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    }
  };

  const handleRequestService = async () => {
    if (!projectId) return;

    try {
      await requestService.mutateAsync(projectId);
      toast({ 
        title: 'Service requested!', 
        description: 'Our team will measure your floor plan shortly.' 
      });
    } catch (error: any) {
      toast({ title: 'Request failed', description: error.message, variant: 'destructive' });
    }
  };

  // Extract rooms, scale, and background image from localData for report generation
  const rooms = (localData.rooms as Room[]) || [];
  const scale = (localData.scale as ScaleCalibration) || null;
  const backgroundImage = (localData.backgroundImage as BackgroundImage) || null;
  
  const report = useMemo(
    () => generateReport(rooms, materials || [], scale),
    [rooms, materials, scale]
  );

  // Background image handlers
  const handleSetBackgroundImage = useCallback((image: BackgroundImage) => {
    setLocalData(prev => ({ ...prev, backgroundImage: image }));
    setHasUnsavedChanges(true);
  }, []);

  const handleUpdateBackgroundImage = useCallback((updates: Partial<BackgroundImage>) => {
    setLocalData(prev => ({
      ...prev,
      backgroundImage: prev.backgroundImage
        ? { ...(prev.backgroundImage as BackgroundImage), ...updates }
        : null,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleRemoveBackgroundImage = useCallback(() => {
    setLocalData(prev => ({ ...prev, backgroundImage: null }));
    setHasUnsavedChanges(true);
  }, []);

  if (isLoading) {
    return <EditorSkeleton />;
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-4">This project may have been deleted or you don't have access.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const status = statusLabels[project.status] || statusLabels.draft;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0 safe-area-top">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-foreground truncate text-sm md:text-base">{project.name}</h1>
            {!isMobile && (
              <>
                <Badge variant="secondary" className={`text-xs ${status.className}`}>
                  {status.label}
                </Badge>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-xs">
                    Unsaved
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Request Service Button - Hidden on mobile */}
          {!isMobile && !project.service_requested && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRequestService}
              disabled={requestService.isPending}
            >
              {requestService.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Phone className="w-4 h-4 mr-2" />
              )}
              Request Measurement Service
            </Button>
          )}

          {/* Save Button */}
          {!isViewer && (
            <Button 
              size={isMobile ? 'icon' : 'sm'}
              onClick={handleSave}
              disabled={updateProject.isPending || !hasUnsavedChanges}
            >
              {updateProject.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {!isMobile && <span className="ml-2">Save</span>}
                </>
              )}
            </Button>
          )}

          {!isMobile && <ThemeToggle />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setReportPreviewOpen(true)}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem>Share Project</DropdownMenuItem>
              {isMobile && !project.service_requested && (
                <DropdownMenuItem onClick={handleRequestService}>
                  Request Measurement Service
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings`)}>
                Project Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className={`flex-1 flex overflow-hidden ${isMobile ? 'pb-16' : ''}`}>
        {/* Canvas Area */}
        <div className="flex-1 relative">
          {/* Desktop Floating Toolbar */}
          {!isMobile && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <EditorToolbar
                activeTool={activeTool}
                onToolChange={setActiveTool}
                is3DMode={is3DMode}
                onToggle3D={() => setIs3DMode(!is3DMode)}
              />
              {!isViewer && !is3DMode && (
                <FloorPlanUpload
                  projectId={projectId!}
                  onImageUploaded={handleSetBackgroundImage}
                />
              )}
            </div>
          )}

          {/* Image Controls (when background image exists) - Responsive */}
          {backgroundImage && !is3DMode && (
            <div className={`absolute z-10 ${isMobile ? 'top-2 left-2 right-2' : 'top-4 left-1/2 -translate-x-1/2'}`}>
              <ImageControls
                image={backgroundImage}
                onUpdate={handleUpdateBackgroundImage}
                onRemove={handleRemoveBackgroundImage}
              />
            </div>
          )}

          {/* Desktop Sidebar Toggle */}
          {!isMobile && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-10"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <PanelRight className="w-4 h-4" />
              ) : (
                <PanelRightClose className="w-4 h-4" />
              )}
            </Button>
          )}

          {/* Canvas or 3D View */}
          {is3DMode ? (
            <ThreeDViewer
              rooms={rooms}
              scale={scale}
              materials={materials?.map(m => ({ id: m.id, type: m.type, name: m.name }))}
            />
          ) : (
            <EditorCanvas
              activeTool={activeTool}
              jsonData={localData}
              onDataChange={handleDataChange}
              backgroundImage={backgroundImage}
              onSetBackgroundImage={handleSetBackgroundImage}
              onUpdateBackgroundImage={handleUpdateBackgroundImage}
              onRemoveBackgroundImage={handleRemoveBackgroundImage}
            />
          )}
        </div>

        {/* Desktop Right Sidebar */}
        {!isMobile && (
          <EditorSidebar 
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            rooms={rooms}
            scale={scale}
            projectName={project.name}
            projectAddress={project.address || undefined}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNav
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onOpenMenu={() => setMobileDrawerOpen(true)}
        />
      )}

      {/* Mobile Floating Action Button */}
      {isMobile && (
        <MobileToolFAB
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <MobileSidebarDrawer
          open={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          rooms={rooms}
          scale={scale}
          projectName={project.name}
          projectAddress={project.address || undefined}
        />
      )}

      {/* Report Preview Dialog */}
      <ReportPreviewDialog
        open={reportPreviewOpen}
        onOpenChange={setReportPreviewOpen}
        projectName={project.name}
        projectAddress={project.address || undefined}
        report={report}
      />
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 border-b border-border flex items-center px-4 gap-4">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-6 w-48" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
      </header>
      <div className="flex-1 flex">
        <div className="flex-1 bg-muted/30" />
        <div className="w-72 border-l border-border">
          <Skeleton className="h-full" />
        </div>
      </div>
    </div>
  );
}
