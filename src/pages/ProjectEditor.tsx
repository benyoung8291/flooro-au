import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useHasRole } from '@/hooks/useUserProfile';
import { useMaterials, Material, useCreateMaterial, MaterialSubtype } from '@/hooks/useMaterials';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { EditorCanvas, EditorTool } from '@/components/editor/EditorCanvas';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { TakeoffPanel } from '@/components/editor/TakeoffPanel';
import { FloorPlanUpload } from '@/components/editor/FloorPlanUpload';
import { ImageControls } from '@/components/editor/ImageControls';
import { MobileNav } from '@/components/editor/MobileNav';
import { MobileToolFAB } from '@/components/editor/MobileToolFAB';
import { MobileSidebarDrawer } from '@/components/editor/MobileSidebarDrawer';
import { MobileRoomActionBar } from '@/components/editor/MobileRoomActionBar';
import { MobileTakeoffSheet } from '@/components/editor/MobileTakeoffSheet';
import { ThreeDViewer } from '@/components/editor/ThreeDViewer';
import { KeyboardShortcutsPanel } from '@/components/editor/KeyboardShortcutsPanel';
import { PageTabs } from '@/components/editor/PageTabs';
import { ProjectProgressBar } from '@/components/editor/ProjectProgressBar';
import { RoomsOverviewDialog } from '@/components/editor/RoomsOverviewDialog';
import { SaveStatusIndicator, SaveStatus } from '@/components/editor/SaveStatusIndicator';
import { CanvasStatusBar } from '@/components/editor/CanvasStatusBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ReportPreviewDialog } from '@/components/reports/ReportPreviewDialog';
// QuoteSummaryDialog removed — replaced by standalone /quotes pages
import { FinishesScheduleDialog } from '@/components/reports/FinishesScheduleDialog';
import { generateReport } from '@/lib/reports/calculations';
import { calculateStripPlan, extractRollMaterialSpecs } from '@/lib/rollGoods';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { Room, ScaleCalibration, BackgroundImage, RoomAccessories, DimensionUnit, FloorPlanPage, ProjectMaterial } from '@/lib/canvas/types';
import { AccessoryQuickAddDialog } from '@/components/materials/AccessoryQuickAddDialog';
import { 
  ArrowLeft, 
  Save, 
  MoreVertical,
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
  active: { label: 'Active', className: 'status-progress' },
  archived: { label: 'Archived', className: 'status-completed' },
};

export default function ProjectEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const previousToolRef = useRef<EditorTool>('select');
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const handleToolChangeRef = useRef<((tool: EditorTool) => void)>((() => {}) as (tool: EditorTool) => void);
  
  const { data: project, isLoading } = useProject(projectId);
  const { data: materials } = useMaterials();
  const updateProject = useUpdateProject();
  const isViewer = useHasRole('viewer');

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerTab, setMobileDrawerTab] = useState<string | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localData, setLocalData] = useState<Record<string, unknown>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  // quoteSummaryOpen removed — quotes are now a standalone page
  const [roomsOverviewOpen, setRoomsOverviewOpen] = useState(false);
  const [finishesScheduleOpen, setFinishesScheduleOpen] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [showFinishesLegend, setShowFinishesLegend] = useState(false);
  const [accessoryDialogOpen, setAccessoryDialogOpen] = useState(false);
  const [linkedQuoteId, setLinkedQuoteId] = useState<string | null>(null);
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
    setLinkedQuoteId(null);
  }, [projectId]);

  // Check for linked quote
  useEffect(() => {
    if (!projectId) return;
    const checkLinkedQuote = async () => {
      const { data } = await (supabase as any)
        .from('quotes')
        .select('id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setLinkedQuoteId(data.id);
    };
    checkLinkedQuote();
  }, [projectId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 'd': handleToolChangeRef.current('draw'); break;
        case 'h': setActiveTool('hole'); break;
        case 'o': setActiveTool('door'); break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSaveRef.current?.();
          } else {
            setActiveTool('scale');
          }
          break;
        case 'm': setActiveTool('merge'); break;
        case 'x': setActiveTool('split'); break;
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
          navigate(linkedQuoteId ? `/quotes/${linkedQuoteId}` : '/quotes');
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

  // Keep handleSaveRef in sync so keyboard shortcut always calls latest version
  useEffect(() => { handleSaveRef.current = handleSave; });

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
  const projectMaterials = (localData.projectMaterials as ProjectMaterial[]) || [];

  // Wrapper that enforces scale-before-draw rule
  const handleToolChange = useCallback((tool: EditorTool) => {
    if ((tool === 'draw' || tool === 'rectangle') && !scale) {
      toast({
        title: 'Set scale first',
        description: 'Calibrate your floor plan scale before drawing rooms so measurements are accurate.',
      });
      setActiveTool('scale');
      return;
    }
    setActiveTool(tool);
  }, [scale, toast]);

  // Keep ref in sync so keyboard shortcuts always use latest version
  useEffect(() => { handleToolChangeRef.current = handleToolChange; });

  const handleProjectMaterialsChange = useCallback((materials: ProjectMaterial[]) => {
    setLocalData(prev => ({ ...prev, projectMaterials: materials }));
    setHasUnsavedChanges(true);
  }, []);

  // Save project material to library
  const createMaterial = useCreateMaterial();
  const handleSaveProjectMaterialToLibrary = useCallback(async (pm: ProjectMaterial) => {
    await createMaterial.mutateAsync({
      name: pm.name,
      type: pm.type,
      subtype: pm.subtype as MaterialSubtype | undefined,
      specs: pm.specs,
    });
  }, [createMaterial]);

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
    const pages = (localData.pages as FloorPlanPage[]) || [];
    const activeId = (localData.activePageId as string | null) || (pages.length > 0 ? pages[0]?.id : null);
    const activePg = pages.find(p => p.id === activeId) || null;
    const currentRooms = activePg?.rooms || (localData.rooms as Room[]) || [];
    const currentSelectedId = (localData.selectedRoomId as string | null);
    if (currentRooms.length === 0) return;
    const currentIndex = currentRooms.findIndex(r => r.id === currentSelectedId);
    const prevIndex = currentIndex <= 0 ? currentRooms.length - 1 : currentIndex - 1;
    setLocalData(prev => ({ ...prev, selectedRoomId: currentRooms[prevIndex].id }));
  }, [localData.pages, localData.activePageId, localData.rooms, localData.selectedRoomId]);

  const handleNavigateNextRoom = useCallback(() => {
    const pages = (localData.pages as FloorPlanPage[]) || [];
    const activeId = (localData.activePageId as string | null) || (pages.length > 0 ? pages[0]?.id : null);
    const activePg = pages.find(p => p.id === activeId) || null;
    const currentRooms = activePg?.rooms || (localData.rooms as Room[]) || [];
    const currentSelectedId = (localData.selectedRoomId as string | null);
    if (currentRooms.length === 0) return;
    const currentIndex = currentRooms.findIndex(r => r.id === currentSelectedId);
    const nextIndex = currentIndex >= currentRooms.length - 1 ? 0 : currentIndex + 1;
    setLocalData(prev => ({ ...prev, selectedRoomId: currentRooms[nextIndex].id }));
  }, [localData.pages, localData.activePageId, localData.rooms, localData.selectedRoomId]);

  // handleUpdateRoom must be declared before the useEffect that references it
  const handleUpdateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const activePageId = prev.activePageId as string | null;
      
      if (pages.length > 0 && activePageId) {
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
        const currentRooms = (prev.rooms as Room[]) || [];
        const updatedRooms = currentRooms.map(room => 
          room.id === roomId ? { ...room, ...updates } : room
        );
        return { ...prev, rooms: updatedRooms };
      }
    });
    setHasUnsavedChanges(true);
  }, []);

  // Extended keyboard shortcuts for room navigation, fill direction, and pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const pgs = (localData.pages as FloorPlanPage[]) || [];
      const actId = (localData.activePageId as string | null) || (pgs.length > 0 ? pgs[0]?.id : null);
      const actPg = pgs.find(p => p.id === actId) || null;
      const cRooms = actPg?.rooms || (localData.rooms as Room[]) || [];
      const cSelectedId = (localData.selectedRoomId as string | null);

      switch (e.key) {
        case 'r': {
          e.preventDefault();
          e.stopPropagation();
          if (cSelectedId) {
            const selectedRoom = cRooms.find(r => r.id === cSelectedId);
            if (selectedRoom) {
              const currentDirection = selectedRoom.fillDirection || 0;
              const newDirection = (currentDirection + 90) % 360;
              handleUpdateRoom(cSelectedId, { fillDirection: newDirection });
            }
          } else {
            handleToolChangeRef.current('rectangle');
          }
          break;
        }
        case ' ':
          e.preventDefault();
          previousToolRef.current = activeTool;
          setActiveTool('pan');
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

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setActiveTool(previousToolRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [localData.pages, localData.activePageId, localData.rooms, localData.selectedRoomId, handleNavigatePrevRoom, handleNavigateNextRoom, handleUpdateRoom, activeTool]);


  const handleDeleteRoom = useCallback((roomId: string) => {
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (!window.confirm(`Delete room "${roomToDelete?.name || 'Unnamed'}"? This cannot be undone.`)) return;

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
  }, [rooms]);

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
  
  // Memoize materialTypes map to avoid recreating on every render
  const materialTypeMap = useMemo(
    () => new Map((materials || []).map(m => [m.id, m.type])),
    [materials]
  );

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
        const covingHeightMm = room.accessories?.coving?.enabled ? (room.accessories.coving.heightMm || 100) : 0;
        const plan = calculateStripPlan(room, rollSpecs, scale, {
          fillDirection: room.fillDirection || 0,
          firstSeamOffset: room.seamOptions?.firstSeamOffset || 0,
          manualSeams: room.seamOptions?.manualSeams || [],
          avoidSeamZones: room.seamOptions?.avoidZones || [],
          wasteOverride: room.wastePercent,
          covingHeightMm,
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

  // Bulk assign material to multiple rooms
  const handleBulkAssignMaterial = useCallback((roomIds: string[], materialId: string) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const activePageId = prev.activePageId as string | null;

      if (pages.length > 0 && activePageId) {
        const updatedPages = pages.map(page => {
          if (page.id === activePageId) {
            return {
              ...page,
              rooms: page.rooms.map(room =>
                roomIds.includes(room.id) ? { ...room, materialId } : room
              ),
            };
          }
          return page;
        });
        return { ...prev, pages: updatedPages };
      }

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
    const pageToDelete = pages.find(p => p.id === pageId);
    if (!window.confirm(`Delete page "${pageToDelete?.name || 'Unnamed'}"? All rooms on this page will be lost.`)) return;

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
  }, [toast, pages]);

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

  const handleReorderPages = useCallback((pageIds: string[]) => {
    setLocalData(prev => {
      const pages = (prev.pages as FloorPlanPage[]) || [];
      const reorderedPages = pageIds.map((id, index) => {
        const page = pages.find(p => p.id === id);
        return page ? { ...page, sortOrder: index } : null;
      }).filter(Boolean) as FloorPlanPage[];
      
      return {
        ...prev,
        pages: reorderedPages,
      };
    });
    setHasUnsavedChanges(true);
  }, []);

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
        handleToolChange('draw');
        break;
      case 'materials':
        setSidebarCollapsed(false);
        break;
      case 'accessories':
        setSidebarCollapsed(false);
        break;
      case 'quote':
        navigate(linkedQuoteId ? `/quotes/${linkedQuoteId}` : '/quotes');
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

          {/* Quotes Navigation - Desktop Only */}
          {!isMobile && rooms.length > 0 && (
            <Button
              variant={linkedQuoteId ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate(linkedQuoteId ? `/quotes/${linkedQuoteId}` : '/quotes')}
              className="hidden md:flex"
            >
              <FileText className="w-4 h-4 mr-2" />
              {linkedQuoteId ? 'View Quote' : 'Quotes'}
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
              <DropdownMenuItem onClick={() => navigate(linkedQuoteId ? `/quotes/${linkedQuoteId}` : '/quotes')}>
                <FileText className="w-4 h-4 mr-2" />
                {linkedQuoteId ? 'View Quote' : 'Quotes'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoomsOverviewOpen(true)}>
                <LayoutGrid className="w-4 h-4 mr-2" />
                All Rooms (L)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setReportPreviewOpen(true)}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: 'Share feature coming soon' })}>Share Project</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/settings`)}>
                Project Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Page Tabs - show when pages exist */}
      {pages.length >= 1 && (
        <PageTabs
          pages={pages}
          activePageId={activePageId}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
          onRenamePage={handleRenamePage}
          onDeletePage={handleDeletePage}
          onDuplicatePage={handleDuplicatePage}
          onReorderPages={handleReorderPages}
        />
      )}

      {/* Main Editor Area */}
      <div className={`flex-1 flex min-w-0 ${isMobile ? 'pb-16' : ''}`}>
        {/* Canvas Area */}
        <div className="flex-1 relative min-w-0 overflow-hidden">
          {/* Desktop Floating Toolbar */}
          {!isMobile && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <EditorToolbar
                activeTool={activeTool}
                onToolChange={handleToolChange}
                is3DMode={is3DMode}
                onToggle3D={() => setIs3DMode(!is3DMode)}
                showDimensionLabels={showDimensionLabels}
                onToggleDimensionLabels={() => setShowDimensionLabels(!showDimensionLabels)}
                dimensionUnit={dimensionUnit}
                onDimensionUnitChange={setDimensionUnit}
                onShowShortcuts={() => setShortcutsPanelOpen(true)}
                onPickRoomTemplate={(id) => {
                  window.dispatchEvent(new CustomEvent('room-template-pick', { detail: id }));
                }}
              />
              {!isViewer && !is3DMode && (
                <>
                  <FloorPlanUpload
                    projectId={projectId!}
                    onImageUploaded={handleSetBackgroundImage}
                  />
                </>
              )}
            </div>
          )}

          {/* Image Controls (when background image exists) - Bottom left, above zoom */}
          {backgroundImage && !is3DMode && (
            <div className="absolute bottom-20 left-4 z-10">
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
              materialTypes={materialTypeMap}
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
              projectMaterials={projectMaterials}
            />
          )}

          {/* Status Bar - Bottom of canvas */}
          {!isMobile && !is3DMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <CanvasStatusBar
                activeTool={activeTool}
                scale={scale}
                selectedRoom={rooms.find(r => r.id === selectedRoomId) || null}
                dimensionUnit={dimensionUnit}
              />
            </div>
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
            projectId={projectId}
            projectName={project.name}
            projectAddress={project.address || undefined}
            stripPlans={stripPlans}
            onOpenFinishesSchedule={() => setFinishesScheduleOpen(true)}
            onOpenReport={() => setReportPreviewOpen(true)}
            projectMaterials={projectMaterials}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNav
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onOpenMenu={() => {
            setMobileDrawerTab(undefined);
            setMobileDrawerOpen(true);
          }}
          onOpenTakeoff={() => {
            setMobileDrawerTab('takeoff');
            setMobileDrawerOpen(true);
          }}
          roomCount={rooms.length}
        />
      )}

      {/* Mobile Floating Action Button + Floor Plan Upload */}
      {isMobile && !is3DMode && (
        <>
          <MobileToolFAB
            activeTool={activeTool}
            onToolChange={handleToolChange}
          />
          {!isViewer && !backgroundImage && (
            <div className="fixed left-4 bottom-24 z-40">
              <FloorPlanUpload
                projectId={projectId!}
                onImageUploaded={handleSetBackgroundImage}
              />
            </div>
          )}
        </>
      )}

      {/* Mobile contextual room action bar (when a room is selected) */}
      {isMobile && !is3DMode && selectedRoomId && (() => {
        const selRoom = rooms.find(r => r.id === selectedRoomId);
        if (!selRoom) return null;
        return (
          <MobileRoomActionBar
            room={selRoom}
            scale={scale}
            materials={materials || []}
            onRename={(name) => handleRenameRoom(selectedRoomId, name)}
            onChangeWaste={(pct) => handleUpdateRoom(selectedRoomId, { wastePercent: pct })}
            onPickMaterial={() => {
              setMobileDrawerTab('materials');
              setMobileDrawerOpen(true);
            }}
            onDelete={() => handleDeleteRoom(selectedRoomId)}
          />
        );
      })()}

      {/* Mobile peek-style takeoff bottom sheet */}
      {isMobile && !is3DMode && !selectedRoomId && rooms.length > 0 && (
        <MobileTakeoffSheet
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          scale={scale}
          materials={materials || []}
          onSelectRoom={(id) => handleSelectRoom(id)}
          onExpand={() => {
            setMobileDrawerTab('takeoff');
            setMobileDrawerOpen(true);
          }}
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
          initialTab={mobileDrawerTab}
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
        projectMaterials={projectMaterials}
      />

      {/* QuoteSummaryDialog removed — quotes are now at /quotes */}

      {/* Rooms Overview Dialog */}
      <RoomsOverviewDialog
        open={roomsOverviewOpen}
        onOpenChange={setRoomsOverviewOpen}
        rooms={rooms}
        materials={materials || []}
        projectMaterials={projectMaterials}
        scale={scale}
        selectedRoomId={selectedRoomId}
        onSelectRoom={handleSelectRoom}
        onDeleteRoom={handleDeleteRoom}
        onUpdateRoom={handleUpdateRoom}
        onBulkAssignMaterial={handleBulkAssignMaterial}
      />

      {/* Accessory Quick-Add Dialog */}
      {pendingMaterialRoom && rooms.find(r => r.id === pendingMaterialRoom.roomId) && (
        <AccessoryQuickAddDialog
          open={accessoryDialogOpen}
          onOpenChange={setAccessoryDialogOpen}
          materialType={pendingMaterialRoom.material.type}
          materialSubtype={pendingMaterialRoom.material.specs?.subtype}
          materialName={pendingMaterialRoom.material.name}
          room={rooms.find(r => r.id === pendingMaterialRoom.roomId)!}
          onApplyAccessories={handleApplyAccessories}
          onSkip={handleSkipAccessories}
        />
      )}

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        open={shortcutsPanelOpen}
        onOpenChange={setShortcutsPanelOpen}
      />

      {/* Finishes Schedule Dialog - Project Materials Management */}
      <FinishesScheduleDialog
        open={finishesScheduleOpen}
        onOpenChange={setFinishesScheduleOpen}
        roomCalculations={report.roomCalculations}
        materials={materials || []}
        projectMaterials={projectMaterials}
        onProjectMaterialsChange={handleProjectMaterialsChange}
        libraryMaterials={materials || []}
        rooms={rooms}
        scale={scale}
        onSaveToLibrary={handleSaveProjectMaterialToLibrary}
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
