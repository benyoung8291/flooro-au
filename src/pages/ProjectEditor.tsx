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
import { AutoTakeoffDialog } from '@/components/editor/AutoTakeoffDialog';
import { ImageControls } from '@/components/editor/ImageControls';
import { MobileNav } from '@/components/editor/MobileNav';
import { MobileToolFAB } from '@/components/editor/MobileToolFAB';
import { MobileSidebarDrawer } from '@/components/editor/MobileSidebarDrawer';
import { ThreeDViewer } from '@/components/editor/ThreeDViewer';
import { KeyboardShortcutsPanel } from '@/components/editor/KeyboardShortcutsPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ReportPreviewDialog } from '@/components/reports/ReportPreviewDialog';
import { generateReport } from '@/lib/reports/calculations';
import { Room, ScaleCalibration, BackgroundImage, RoomAccessories, DimensionUnit } from '@/lib/canvas/types';
import { AccessoryQuickAddDialog } from '@/components/materials/AccessoryQuickAddDialog';
import { 
  ArrowLeft, 
  Save, 
  MoreVertical,
  Phone,
  Loader2,
  PanelRightClose,
  PanelRight,
  ClipboardList
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
  const [showFinishesLegend, setShowFinishesLegend] = useState(false);
  const [accessoryDialogOpen, setAccessoryDialogOpen] = useState(false);
  const [shortcutsPanelOpen, setShortcutsPanelOpen] = useState(false);
  const [pendingMaterialRoom, setPendingMaterialRoom] = useState<{
    roomId: string;
    material: { id: string; name: string; type: string; specs?: any };
  } | null>(null);
  
  // Dimension display preferences with localStorage persistence
  const [showDimensionLabels, setShowDimensionLabels] = useState(() => {
    return localStorage.getItem('flooro_show_dimensions') !== 'false';
  });
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>(() => {
    return (localStorage.getItem('flooro_dimension_unit') as DimensionUnit) || 'm';
  });

  // Persist dimension preferences
  useEffect(() => {
    localStorage.setItem('flooro_show_dimensions', String(showDimensionLabels));
  }, [showDimensionLabels]);

  useEffect(() => {
    localStorage.setItem('flooro_dimension_unit', dimensionUnit);
  }, [dimensionUnit]);

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
        case '?':
          setShortcutsPanelOpen(true);
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
  const selectedRoomId = (localData.selectedRoomId as string | null) || null;
  const dropAllocations = (localData.dropAllocations as Record<string, unknown>) || {};

  // Handle drop allocations change
  const handleDropAllocationsChange = useCallback((allocations: Record<string, unknown>) => {
    setLocalData(prev => ({ ...prev, dropAllocations: allocations }));
    setHasUnsavedChanges(true);
  }, []);

  // Room management handlers
  const handleSelectRoom = useCallback((roomId: string | null) => {
    setLocalData(prev => ({ ...prev, selectedRoomId: roomId }));
  }, []);

  // Room navigation handlers
  const handleNavigatePrevRoom = useCallback(() => {
    const currentRooms = (localData.rooms as Room[]) || [];
    const currentSelectedId = (localData.selectedRoomId as string | null);
    if (currentRooms.length === 0) return;
    const currentIndex = currentRooms.findIndex(r => r.id === currentSelectedId);
    const prevIndex = currentIndex <= 0 ? currentRooms.length - 1 : currentIndex - 1;
    setLocalData(prev => ({ ...prev, selectedRoomId: currentRooms[prevIndex].id }));
  }, [localData.rooms, localData.selectedRoomId]);

  const handleNavigateNextRoom = useCallback(() => {
    const currentRooms = (localData.rooms as Room[]) || [];
    const currentSelectedId = (localData.selectedRoomId as string | null);
    if (currentRooms.length === 0) return;
    const currentIndex = currentRooms.findIndex(r => r.id === currentSelectedId);
    const nextIndex = currentIndex >= currentRooms.length - 1 ? 0 : currentIndex + 1;
    setLocalData(prev => ({ ...prev, selectedRoomId: currentRooms[nextIndex].id }));
  }, [localData.rooms, localData.selectedRoomId]);

  // Extended keyboard shortcuts for room navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const currentRooms = (localData.rooms as Room[]) || [];
      const currentSelectedId = (localData.selectedRoomId as string | null);
      
      switch (e.key) {
        case 'r':
          if (currentSelectedId) {
            const selectedRoom = currentRooms.find(r => r.id === currentSelectedId);
            if (selectedRoom) {
              const currentDirection = selectedRoom.fillDirection || 0;
              const newDirection = (currentDirection + 45) % 360;
              setLocalData(prev => {
                const rooms = (prev.rooms as Room[]) || [];
                return {
                  ...prev,
                  rooms: rooms.map(room => 
                    room.id === currentSelectedId ? { ...room, fillDirection: newDirection } : room
                  )
                };
              });
              setHasUnsavedChanges(true);
            }
          }
          break;
        case '[':
          e.preventDefault();
          handleNavigatePrevRoom();
          break;
        case ']':
          e.preventDefault();
          handleNavigateNextRoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localData.rooms, localData.selectedRoomId, handleNavigatePrevRoom, handleNavigateNextRoom]);

  const handleUpdateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    setLocalData(prev => {
      const currentRooms = (prev.rooms as Room[]) || [];
      const updatedRooms = currentRooms.map(room => 
        room.id === roomId ? { ...room, ...updates } : room
      );
      return { ...prev, rooms: updatedRooms };
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleDeleteRoom = useCallback((roomId: string) => {
    setLocalData(prev => {
      const currentRooms = (prev.rooms as Room[]) || [];
      return { 
        ...prev, 
        rooms: currentRooms.filter(room => room.id !== roomId),
        selectedRoomId: prev.selectedRoomId === roomId ? null : prev.selectedRoomId
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleRenameRoom = useCallback((roomId: string, name: string) => {
    handleUpdateRoom(roomId, { name });
  }, [handleUpdateRoom]);

  const handleMaterialSelect = useCallback((material: { id: string }) => {
    if (!selectedRoomId) {
      toast({
        title: "Select a room first",
        description: "Tap on a room in the canvas or select one from the Layers tab.",
        variant: "default",
      });
      return;
    }
    
    // Assign material immediately
    handleUpdateRoom(selectedRoomId, { materialId: material.id });
    
    // Check "don't ask again" preference
    const skipAccessories = localStorage.getItem('flooro_skip_accessory_prompt') === 'true';
    
    // Find full material data
    const fullMaterial = materials?.find(m => m.id === material.id);
    const roomName = rooms.find(r => r.id === selectedRoomId)?.name || 'room';
    
    // Show accessory dialog for roll/tile materials unless skipped
    if (fullMaterial && !skipAccessories && (fullMaterial.type === 'roll' || fullMaterial.type === 'tile')) {
      const specs = fullMaterial.specs as any;
      setPendingMaterialRoom({
        roomId: selectedRoomId,
        material: {
          id: fullMaterial.id,
          name: fullMaterial.name,
          type: fullMaterial.type,
          specs,
        },
      });
      setAccessoryDialogOpen(true);
    } else {
      toast({
        title: "Material assigned",
        description: `Material applied to ${roomName}`,
      });
    }
  }, [selectedRoomId, handleUpdateRoom, toast, rooms, materials]);

  const handleApplyAccessories = useCallback((accessories: Partial<RoomAccessories>) => {
    if (pendingMaterialRoom) {
      const currentRoom = rooms.find(r => r.id === pendingMaterialRoom.roomId);
      handleUpdateRoom(pendingMaterialRoom.roomId, {
        accessories: { ...currentRoom?.accessories, ...accessories },
      });
      toast({
        title: "Material & accessories applied",
        description: `Applied to ${currentRoom?.name || 'room'}`,
      });
    }
    setAccessoryDialogOpen(false);
    setPendingMaterialRoom(null);
  }, [pendingMaterialRoom, handleUpdateRoom, rooms, toast]);

  const handleSkipAccessories = useCallback(() => {
    if (pendingMaterialRoom) {
      const roomName = rooms.find(r => r.id === pendingMaterialRoom.roomId)?.name || 'room';
      toast({
        title: "Material assigned",
        description: `Material applied to ${roomName}`,
      });
    }
    setAccessoryDialogOpen(false);
    setPendingMaterialRoom(null);
  }, [pendingMaterialRoom, rooms, toast]);

  const handleRotateFillDirection = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      const currentDirection = room.fillDirection || 0;
      const newDirection = (currentDirection + 45) % 360;
      handleUpdateRoom(roomId, { fillDirection: newDirection });
    }
  }, [rooms, handleUpdateRoom]);
  
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

  // Handle AI auto-takeoff results
  const handleAutoTakeoffResults = useCallback((
    detectedRooms: Room[], 
    detectedScale?: ScaleCalibration, 
    detectedBackgroundImage?: BackgroundImage
  ) => {
    setLocalData(prev => {
      const existingRooms = (prev.rooms as Room[]) || [];
      return {
        ...prev,
        rooms: [...existingRooms, ...detectedRooms],
        ...(detectedScale ? { scale: detectedScale } : {}),
        ...(detectedBackgroundImage ? { backgroundImage: detectedBackgroundImage } : {}),
      };
    });
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
                showDimensionLabels={showDimensionLabels}
                onToggleDimensionLabels={() => setShowDimensionLabels(!showDimensionLabels)}
                dimensionUnit={dimensionUnit}
                onDimensionUnitChange={setDimensionUnit}
              />
              {!isViewer && !is3DMode && (
                <>
                  <FloorPlanUpload
                    projectId={projectId!}
                    onImageUploaded={handleSetBackgroundImage}
                  />
                  <AutoTakeoffDialog
                    projectId={projectId!}
                    onRoomsDetected={handleAutoTakeoffResults}
                  />
                </>
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

          {/* Desktop Finishes Legend Toggle - positioned to avoid sidebar overlap */}
          {!isMobile && rooms.some(r => r.materialCode) && !is3DMode && (
            <div className={`absolute top-4 z-10 transition-all duration-200 ${sidebarCollapsed ? 'right-16' : 'right-[19rem]'}`}>
              <Button
                variant={showFinishesLegend ? 'default' : 'secondary'}
                size="icon"
                onClick={() => setShowFinishesLegend(!showFinishesLegend)}
                title="Toggle Finishes Legend"
              >
                <ClipboardList className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Canvas or 3D View */}
          {is3DMode ? (
            <ThreeDViewer
              rooms={rooms}
              scale={scale}
              materials={materials}
            />
          ) : (
            <EditorCanvas
              activeTool={activeTool}
              jsonData={localData}
              onDataChange={handleDataChange}
              materialTypes={new Map((materials || []).map(m => [m.id, m.type]))}
              materials={materials || []}
              backgroundImage={backgroundImage}
              onSetBackgroundImage={handleSetBackgroundImage}
              onUpdateBackgroundImage={handleUpdateBackgroundImage}
              onRemoveBackgroundImage={handleRemoveBackgroundImage}
              showFinishesLegend={showFinishesLegend}
              showDimensionLabels={showDimensionLabels}
              dimensionUnit={dimensionUnit}
            />
          )}
        </div>

        {/* Desktop Right Sidebar */}
        {!isMobile && (
          <EditorSidebar 
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            scale={scale}
            onSelectRoom={handleSelectRoom}
            onDeleteRoom={handleDeleteRoom}
            onRenameRoom={handleRenameRoom}
            onUpdateRoom={handleUpdateRoom}
            onNavigatePrevRoom={handleNavigatePrevRoom}
            onNavigateNextRoom={handleNavigateNextRoom}
            onMaterialSelect={handleMaterialSelect}
            projectName={project.name}
            projectAddress={project.address || undefined}
            dropAllocations={dropAllocations as any}
            onDropAllocationsChange={handleDropAllocationsChange as any}
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
          selectedRoomId={selectedRoomId}
          scale={scale}
          onSelectRoom={handleSelectRoom}
          onDeleteRoom={handleDeleteRoom}
          onRenameRoom={handleRenameRoom}
          onUpdateRoom={handleUpdateRoom}
          onMaterialSelect={handleMaterialSelect}
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
        rooms={rooms}
        materials={materials || []}
      />

      {/* Accessory Quick-Add Dialog */}
      {pendingMaterialRoom && (
        <AccessoryQuickAddDialog
          open={accessoryDialogOpen}
          onOpenChange={setAccessoryDialogOpen}
          materialType={pendingMaterialRoom.material.type}
          materialSubtype={pendingMaterialRoom.material.specs?.subtype}
          materialName={pendingMaterialRoom.material.name}
          room={rooms.find(r => r.id === pendingMaterialRoom.roomId) || rooms[0]}
          onApplyAccessories={handleApplyAccessories}
          onSkip={handleSkipAccessories}
        />
      )}

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        open={shortcutsPanelOpen}
        onOpenChange={setShortcutsPanelOpen}
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
