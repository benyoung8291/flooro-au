import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject, useRequestService } from '@/hooks/useProjects';
import { useHasRole } from '@/hooks/useUserProfile';
import { useMaterials } from '@/hooks/useMaterials';
import { EditorCanvas, EditorTool } from '@/components/editor/EditorCanvas';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorSidebar } from '@/components/editor/EditorSidebar';
import { FloorPlanUpload } from '@/components/editor/FloorPlanUpload';
import { ImageControls } from '@/components/editor/ImageControls';
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
  
  const { data: project, isLoading } = useProject(projectId);
  const { data: materials } = useMaterials();
  const updateProject = useUpdateProject();
  const requestService = useRequestService();
  const isViewer = useHasRole('viewer');

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localData, setLocalData] = useState<Record<string, unknown>>({});
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);

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
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-foreground">{project.name}</h1>
            <Badge variant="secondary" className={`text-xs ${status.className}`}>
              {status.label}
            </Badge>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-xs">
                Unsaved
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Request Service Button */}
          {!project.service_requested && (
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
              size="sm"
              onClick={handleSave}
              disabled={updateProject.isPending || !hasUnsavedChanges}
            >
              {updateProject.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          )}

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setReportPreviewOpen(true)}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem>Share Project</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings`)}>
                Project Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative">
          {/* Floating Toolbar */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <EditorToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
            />
            {!isViewer && (
              <FloorPlanUpload
                projectId={projectId!}
                onImageUploaded={handleSetBackgroundImage}
              />
            )}
          </div>

          {/* Image Controls (when background image exists) */}
          {backgroundImage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <ImageControls
                image={backgroundImage}
                onUpdate={handleUpdateBackgroundImage}
                onRemove={handleRemoveBackgroundImage}
              />
            </div>
          )}

          {/* Sidebar Toggle (when collapsed) */}
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

          {/* Canvas */}
          <EditorCanvas
            activeTool={activeTool}
            jsonData={localData}
            onDataChange={handleDataChange}
            backgroundImage={backgroundImage}
            onSetBackgroundImage={handleSetBackgroundImage}
            onUpdateBackgroundImage={handleUpdateBackgroundImage}
            onRemoveBackgroundImage={handleRemoveBackgroundImage}
          />
        </div>

        {/* Right Sidebar */}
        <EditorSidebar 
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          rooms={rooms}
          scale={scale}
          projectName={project.name}
          projectAddress={project.address || undefined}
        />
      </div>

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
