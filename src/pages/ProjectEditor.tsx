import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject, useRequestService } from '@/hooks/useProjects';
import { useHasRole } from '@/hooks/useUserProfile';
import { useMaterials, Material } from '@/hooks/useMaterials';
import { useIsMobile } from '@/hooks/use-mobile';
import { EditorCanvas, EditorTool } from '@/components/editor/EditorCanvas';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { TakeoffPanel } from '@/components/editor/TakeoffPanel';
import { FloorPlanUpload } from '@/components/editor/FloorPlanUpload';
import { AutoTakeoffDialog } from '@/components/editor/AutoTakeoffDialog';
import { ImageControls } from '@/components/editor/ImageControls';
import { MobileNav } from '@/components/editor/MobileNav';
import { MobileToolFAB } from '@/components/editor/MobileToolFAB';
import { MobileSidebarDrawer } from '@/components/editor/MobileSidebarDrawer';
import { ThreeDViewer } from '@/components/editor/ThreeDViewer';
import { KeyboardShortcutsPanel } from '@/components/editor/KeyboardShortcutsPanel';
import { PageTabs } from '@/components/editor/PageTabs';
import { ProjectProgressBar } from '@/components/editor/ProjectProgressBar';
import { RoomsOverviewDialog } from '@/components/editor/RoomsOverviewDialog';
import { SaveStatusIndicator, SaveStatus } from '@/components/editor/SaveStatusIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ReportPreviewDialog } from '@/components/reports/ReportPreviewDialog';
import { QuoteSummaryDialog } from '@/components/reports/QuoteSummaryDialog';
import { FinishesScheduleDialog } from '@/components/reports/FinishesScheduleDialog';
import { generateReport } from '@/lib/reports/calculations';
import { calculateStripPlan, extractRollMaterialSpecs } from '@/lib/rollGoods';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { Room, ScaleCalibration, BackgroundImage, RoomAccessories, DimensionUnit, FloorPlanPage } from '@/lib/canvas/types';
import { AccessoryQuickAddDialog } from '@/components/materials/AccessoryQuickAddDialog';
import { 
  ArrowLeft, 
  Save, 
  MoreVertical,
  Phone,
  Loader2,
  LayoutGrid,
  FileText,
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [quoteSummaryOpen, setQuoteSummaryOpen] = useState(false);
  const [roomsOverviewOpen, setRoomsOverviewOpen] = useState(false);
  const [finishesScheduleOpen, setFinishesScheduleOpen] = useState(false);
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

  // Sync local data with project data - only on initial load
  // Also handles migration from legacy single-page format to multi-page
  const hasLoadedProjectRef = useRef(false);
  useEffect(() => {
    if (project?.json_data && !hasLoadedProjectRef.current) {
      hasLoadedProjectRef.current = true;
      let data = project.json_data as Record<string, unknown>;
      
      // Migrate legacy format (rooms at root) to multi-page format
      if (data.rooms && !data.pages) {
        const legacyPage: FloorPlanPage = {
          id: crypto.randomUUID(),
          name: 'Floor Plan 1',
          sortOrder: 0,
          backgroundImage: (data.backgroundImage as BackgroundImage) || null,
          rooms: (data.rooms as Room[]) || [],
          scale: (data.scale as ScaleCalibration) || null,
        };
        data = {
          ...data,
          pages: [legacyPage],
          activePageId: legacyPage.id,
        };
      }
      
      setLocalData(data);
    }
  }, [project?.json_data]);

  // Reset load flag when project ID changes
  useEffect(() => {
    hasLoadedProjectRef.current = false;
  }, [projectId]);

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
        case 'q':
          setQuoteSummaryOpen(true);
          break;
        case 'l':
          setRoomsOverviewOpen(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDataChange = useCallback((data: Record<string, unknown>) => {
    setLocalData(prev => {
      const prevPages = (prev.pages as FloorPlanPage[]) || [];
      const prevActivePageId = prev.activePageId as string | null;
      
      if (prevPages.length > 0 && prevActivePageId) {
        // Multi-page mode: update the active page with canvas data
        const updatedPages = prevPages.map(page => {
          if (page.id === prevActivePageId) {
            return {
              ...page,
              rooms: (data.rooms as Room[]) ?? page.rooms,
              scale: (data.scale as ScaleCalibration) ?? page.scale,
              backgroundImage: (data.backgroundImage as BackgroundImage) ?? page.backgroundImage,
            };
          }
          return page;
        });
        return { ...prev, pages: updatedPages, selectedRoomId: data.selectedRoomId };
      } else {
        // Legacy mode
        return { ...prev, ...data };
      }
    });
    setHasUnsavedChanges(true);
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges || !projectId || isViewer) return;
    
    setSaveStatus('unsaved');
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (2 second debounce)
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await updateProject.mutateAsync({
          id: projectId,
          updates: { json_data: localData as any },
        });
        setSaveStatus('saved');
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        
        // Reset to idle after showing "Saved" for 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error: any) {
        setSaveStatus('unsaved');
        toast({ title: 'Auto-save failed', description: error.message, variant: 'destructive' });
      }
    }, 2000);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, localData, projectId, isViewer, updateProject, toast]);

  const handleSave = async () => {
    if (!projectId || isViewer || !hasUnsavedChanges) return;

    // Cancel any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    setSaveStatus('saving');
    try {
      await updateProject.mutateAsync({
        id: projectId,
        updates: { json_data: localData as any },
      });
      setSaveStatus('saved');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      // Reset to idle after showing "Saved" for 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      setSaveStatus('unsaved');
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

  // Get pages and active page data
  const pages = (localData.pages as FloorPlanPage[]) || [];
  const activePageId = (localData.activePageId as string | null) || (pages.length > 0 ? pages[0]?.id : null);
  const activePage = pages.find(p => p.id === activePageId) || null;
  
  // Extract rooms, scale, and background image from active page (or legacy root data)
  const rooms = activePage?.rooms || (localData.rooms as Room[]) || [];
  const scale = activePage?.scale || (localData.scale as ScaleCalibration) || null;
  const backgroundImage = activePage?.backgroundImage || (localData.backgroundImage as BackgroundImage) || null;
  const selectedRoomId = (localData.selectedRoomId as string | null) || null;
  const dropAllocations = (localData.dropAllocations as Record<string, unknown>) || {};

  // Create page-specific data to pass to EditorCanvas
  const canvasData = useMemo(() => {
    if (pages.length > 0 && activePageId && activePage) {
      return {
        rooms: activePage.rooms,
        scale: activePage.scale,
        backgroundImage: activePage.backgroundImage,
        selectedRoomId: localData.selectedRoomId,
      };
    }
    // Legacy mode - use root-level data
    return {
      rooms: (localData.rooms as Room[]) || [],
      scale: (localData.scale as ScaleCalibration) || null,
      backgroundImage: (localData.backgroundImage as BackgroundImage) || null,
      selectedRoomId: localData.selectedRoomId,
    };
  }, [pages, activePageId, activePage, localData.rooms, localData.scale, localData.backgroundImage, localData.selectedRoomId]);

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
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const activePageId = prev.activePageId as string | null;
      
      if (pages.length > 0 && activePageId) {
        // Multi-page mode: update room in active page
        const updatedPages = pages.map(page => {
          if (page.id === activePageId) {
            return {
              ...page,
              rooms: page.rooms.map(room => 
                room.id === roomId ? { ...room, ...updates } : room
              ),
            };
          }
          return page;
        });
        return { ...prev, pages: updatedPages };
      } else {
        // Legacy mode: update root-level rooms
        const currentRooms = (prev.rooms as Room[]) || [];
        const updatedRooms = currentRooms.map(room => 
          room.id === roomId ? { ...room, ...updates } : room
        );
        return { ...prev, rooms: updatedRooms };
      }
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleDeleteRoom = useCallback((roomId: string) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const activePageId = prev.activePageId as string | null;
      
      if (pages.length > 0 && activePageId) {
        // Multi-page mode
        const updatedPages = pages.map(page => {
          if (page.id === activePageId) {
            return {
              ...page,
              rooms: page.rooms.filter(room => room.id !== roomId),
            };
          }
          return page;
        });
        return { 
          ...prev, 
          pages: updatedPages,
          selectedRoomId: prev.selectedRoomId === roomId ? null : prev.selectedRoomId
        };
      } else {
        // Legacy mode
        const currentRooms = (prev.rooms as Room[]) || [];
        return { 
          ...prev, 
          rooms: currentRooms.filter(room => room.id !== roomId),
          selectedRoomId: prev.selectedRoomId === roomId ? null : prev.selectedRoomId
        };
      }
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
    
    handleMaterialSelectForRoom(material, selectedRoomId);
  }, [selectedRoomId, toast]);

  // Handler for TakeoffPanel that receives roomId directly
  const handleMaterialSelectForRoom = useCallback((material: { id: string }, roomId: string) => {
    // Assign material immediately
    handleUpdateRoom(roomId, { materialId: material.id });
    
    // Check "don't ask again" preference
    const skipAccessories = localStorage.getItem('flooro_skip_accessory_prompt') === 'true';
    
    // Find full material data
    const fullMaterial = materials?.find(m => m.id === material.id);
    const roomName = rooms.find(r => r.id === roomId)?.name || 'room';
    
    // Show accessory dialog for roll/tile materials unless skipped
    if (fullMaterial && !skipAccessories && (fullMaterial.type === 'roll' || fullMaterial.type === 'tile')) {
      const specs = fullMaterial.specs as any;
      setPendingMaterialRoom({
        roomId: roomId,
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
  }, [handleUpdateRoom, toast, rooms, materials]);

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

  // Calculate strip plans for rooms with roll materials
  const stripPlans = useMemo(() => {
    const plans = new Map<string, StripPlanResult>();
    
    if (!scale || !materials) return plans;
    
    rooms.forEach(room => {
      if (!room.materialId) return;
      
      const material = materials.find(m => m.id === room.materialId);
      if (!material || material.type !== 'roll') return;
      
      try {
        const rollSpecs = extractRollMaterialSpecs(material.specs as Record<string, unknown>);
        const plan = calculateStripPlan(room, rollSpecs, scale, {
          fillDirection: room.fillDirection || 0,
          firstSeamOffset: room.seamOptions?.firstSeamOffset || 0,
          manualSeams: room.seamOptions?.manualSeams || [],
          avoidSeamZones: room.seamOptions?.avoidZones || [],
        });
        
        plans.set(room.id, plan);
      } catch (error) {
        console.warn(`Failed to calculate strip plan for room ${room.id}:`, error);
      }
    });
    
    return plans;
  }, [rooms, materials, scale]);

  // Recalculate strip plan callback (triggers via room update)
  const handleRecalculateStripPlan = useCallback((roomId: string) => {
    // The useMemo will automatically recalculate when room data changes
    // This is triggered by updating room data which already happens
  }, []);

  // Background image handlers - work with active page
  const handleSetBackgroundImage = useCallback((image: BackgroundImage) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const activePageId = prev.activePageId as string | null;
      
      if (pages.length > 0 && activePageId) {
        const updatedPages = pages.map(page => 
          page.id === activePageId ? { ...page, backgroundImage: image } : page
        );
        return { ...prev, pages: updatedPages };
      }
      return { ...prev, backgroundImage: image };
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleUpdateBackgroundImage = useCallback((updates: Partial<BackgroundImage>) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const activePageId = prev.activePageId as string | null;
      
      if (pages.length > 0 && activePageId) {
        const updatedPages = pages.map(page => {
          if (page.id === activePageId && page.backgroundImage) {
            return { ...page, backgroundImage: { ...page.backgroundImage, ...updates } };
          }
          return page;
        });
        return { ...prev, pages: updatedPages };
      }
      
      return {
        ...prev,
        backgroundImage: prev.backgroundImage
          ? { ...(prev.backgroundImage as BackgroundImage), ...updates }
          : null,
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleRemoveBackgroundImage = useCallback(() => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const activePageId = prev.activePageId as string | null;
      
      if (pages.length > 0 && activePageId) {
        const updatedPages = pages.map(page => 
          page.id === activePageId ? { ...page, backgroundImage: null } : page
        );
        return { ...prev, pages: updatedPages };
      }
      return { ...prev, backgroundImage: null };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Handle AI auto-takeoff results - ALWAYS creates a new page
  const handleAutoTakeoffResults = useCallback((
    detectedRooms: Room[], 
    detectedScale?: ScaleCalibration, 
    detectedBackgroundImage?: BackgroundImage
  ) => {
    setLocalData(prev => {
      const existingPages = (prev.pages as FloorPlanPage[]) || [];
      
      // Create a new page for the auto-takeoff results
      const newPage: FloorPlanPage = {
        id: crypto.randomUUID(),
        name: `Floor Plan ${existingPages.length + 1}`,
        sortOrder: existingPages.length,
        backgroundImage: detectedBackgroundImage ? {
          ...detectedBackgroundImage,
          locked: true, // Always lock floor plan
        } : null,
        rooms: detectedRooms,
        scale: detectedScale || null,
      };
      
      return {
        ...prev,
        pages: [...existingPages, newPage],
        activePageId: newPage.id,
        selectedRoomId: null,
      };
    });
    setHasUnsavedChanges(true);
    
    toast({
      title: 'New floor plan page created',
      description: `${detectedRooms.length} rooms detected and added to a new page.`,
    });
  }, [toast]);

  // Bulk assign material to multiple rooms
  const handleBulkAssignMaterial = useCallback((roomIds: string[], materialId: string) => {
    setLocalData(prev => {
      const currentRooms = (prev.rooms as Room[]) || [];
      const updatedRooms = currentRooms.map(room => 
        roomIds.includes(room.id) ? { ...room, materialId } : room
      );
      return { ...prev, rooms: updatedRooms };
    });
    setHasUnsavedChanges(true);
    toast({
      title: 'Materials assigned',
      description: `Applied to ${roomIds.length} room${roomIds.length !== 1 ? 's' : ''}`,
    });
  }, [toast]);

  // Page management handlers
  const handleSelectPage = useCallback((pageId: string) => {
    setLocalData(prev => ({ ...prev, activePageId: pageId, selectedRoomId: null }));
  }, []);

  const handleAddPage = useCallback(() => {
    const newPage: FloorPlanPage = {
      id: crypto.randomUUID(),
      name: `Floor Plan ${pages.length + 1}`,
      sortOrder: pages.length,
      backgroundImage: null,
      rooms: [],
      scale: null,
    };
    setLocalData(prev => ({
      ...prev,
      pages: [...(prev.pages as FloorPlanPage[] || []), newPage],
      activePageId: newPage.id,
      selectedRoomId: null,
    }));
    setHasUnsavedChanges(true);
    toast({ title: 'New page added' });
  }, [pages.length, toast]);

  const handleRenamePage = useCallback((pageId: string, newName: string) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      return {
        ...prev,
        pages: pages.map(p => p.id === pageId ? { ...p, name: newName } : p),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleDeletePage = useCallback((pageId: string) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      if (pages.length <= 1) return prev; // Don't delete last page
      
      const remaining = pages.filter(p => p.id !== pageId);
      const newActiveId = prev.activePageId === pageId ? remaining[0]?.id : prev.activePageId;
      
      return {
        ...prev,
        pages: remaining,
        activePageId: newActiveId,
        selectedRoomId: null,
      };
    });
    setHasUnsavedChanges(true);
    toast({ title: 'Page deleted' });
  }, [toast]);

  const handleDuplicatePage = useCallback((pageId: string) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const sourcePage = pages.find(p => p.id === pageId);
      if (!sourcePage) return prev;
      
      const newPage: FloorPlanPage = {
        ...sourcePage,
        id: crypto.randomUUID(),
        name: `${sourcePage.name} (Copy)`,
        sortOrder: pages.length,
        rooms: sourcePage.rooms.map(r => ({ ...r, id: crypto.randomUUID() })),
      };
      
      return {
        ...prev,
        pages: [...pages, newPage],
        activePageId: newPage.id,
        selectedRoomId: null,
      };
    });
    setHasUnsavedChanges(true);
    toast({ title: 'Page duplicated' });
  }, [toast]);

  // Handle progress bar step clicks
  const handleProgressStepClick = useCallback((stepId: string) => {
    switch (stepId) {
      case 'floorplan':
        // Focus on floor plan upload
        break;
      case 'scale':
        setActiveTool('scale');
        break;
      case 'rooms':
        setActiveTool('draw');
        break;
      case 'materials':
        setSidebarCollapsed(false);
        break;
      case 'accessories':
        setSidebarCollapsed(false);
        break;
      case 'quote':
        setQuoteSummaryOpen(true);
        break;
    }
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
                <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
              </>
            )}
          </div>

          {/* Progress Bar - Desktop Only */}
          {!isMobile && (
            <div className="hidden lg:block ml-4">
              <ProjectProgressBar
                rooms={rooms}
                scale={scale}
                backgroundImage={backgroundImage}
                onStepClick={handleProgressStepClick}
              />
            </div>
          )}
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

          {/* Rooms Overview Button - Desktop Only */}
          {!isMobile && rooms.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoomsOverviewOpen(true)}
              className="hidden md:flex"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Rooms
              <Badge variant="secondary" className="ml-2 text-xs">
                {rooms.length}
              </Badge>
            </Button>
          )}

          {/* Quote Button - Desktop Only */}
          {!isMobile && rooms.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuoteSummaryOpen(true)}
              className="hidden md:flex"
            >
              <FileText className="w-4 h-4 mr-2" />
              Quote
            </Button>
          )}

          {/* Save Button - Manual/Immediate save */}
          {!isViewer && (
            <Button 
              size={isMobile ? 'icon' : 'sm'}
              variant={hasUnsavedChanges ? 'default' : 'ghost'}
              onClick={handleSave}
              disabled={saveStatus === 'saving' || !hasUnsavedChanges}
              title="Save now (Ctrl+S)"
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {!isMobile && <span className="ml-2">Save</span>}
                </>
              )}
            </Button>
          )}

          {/* Mobile Save Status */}
          {isMobile && <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />}

          {!isMobile && <ThemeToggle />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setQuoteSummaryOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                View Quote (Q)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoomsOverviewOpen(true)}>
                <LayoutGrid className="w-4 h-4 mr-2" />
                All Rooms (L)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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

      {/* Page Tabs - show when pages exist */}
      {!isMobile && pages.length >= 1 && (
        <PageTabs
          pages={pages}
          activePageId={activePageId}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
          onRenamePage={handleRenamePage}
          onDeletePage={handleDeletePage}
          onDuplicatePage={handleDuplicatePage}
        />
      )}

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
                onShowShortcuts={() => setShortcutsPanelOpen(true)}
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

          {/* Canvas or 3D View */}
          {is3DMode ? (
            <ThreeDViewer
              rooms={rooms}
              scale={scale}
              materials={materials}
            />
          ) : (
            <EditorCanvas
              key={activePageId || 'legacy'}
              activeTool={activeTool}
              jsonData={canvasData}
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
              stripPlans={stripPlans}
              showSeamLines={true}
            />
          )}
        </div>

        {/* Desktop Right Sidebar - TakeoffPanel */}
        {!isMobile && (
          <TakeoffPanel 
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            scale={scale}
            onSelectRoom={handleSelectRoom}
            onDeleteRoom={handleDeleteRoom}
            onRenameRoom={handleRenameRoom}
            onUpdateRoom={handleUpdateRoom}
            onMaterialSelect={handleMaterialSelectForRoom}
            projectName={project.name}
            stripPlans={stripPlans}
            onOpenFinishesSchedule={() => setFinishesScheduleOpen(true)}
            onOpenQuoteSummary={() => setQuoteSummaryOpen(true)}
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

      {/* Quote Summary Dialog */}
      <QuoteSummaryDialog
        open={quoteSummaryOpen}
        onOpenChange={setQuoteSummaryOpen}
        rooms={rooms}
        materials={materials || []}
        scale={scale}
        projectName={project.name}
        projectAddress={project.address || undefined}
        onExportPDF={() => {
          setQuoteSummaryOpen(false);
          setReportPreviewOpen(true);
        }}
      />

      {/* Rooms Overview Dialog */}
      <RoomsOverviewDialog
        open={roomsOverviewOpen}
        onOpenChange={setRoomsOverviewOpen}
        rooms={rooms}
        materials={materials || []}
        scale={scale}
        selectedRoomId={selectedRoomId}
        onSelectRoom={handleSelectRoom}
        onDeleteRoom={handleDeleteRoom}
        onUpdateRoom={handleUpdateRoom}
        onBulkAssignMaterial={handleBulkAssignMaterial}
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

      {/* Finishes Schedule Dialog */}
      <FinishesScheduleDialog
        open={finishesScheduleOpen}
        onOpenChange={setFinishesScheduleOpen}
        roomCalculations={report.roomCalculations}
        materials={materials || []}
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
