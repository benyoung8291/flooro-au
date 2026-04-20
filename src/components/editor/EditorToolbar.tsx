import { EditorTool } from './EditorCanvas';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { DimensionUnit, SnapSettings } from '@/lib/canvas/types';
import { 
  MousePointer2, 
  Pencil, 
  RectangleHorizontal,
  DoorOpen, 
  Ruler,
  RulerIcon,
  Move,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Box,
  Grid2X2,
  ChevronDown,
  HelpCircle,
  Combine,
  Scissors,
  Magnet,
  ArrowLeftRight,
} from 'lucide-react';
import { RoomTemplatesMenu, RoomTemplateId } from './RoomTemplatesMenu';

// Custom icon: dashed rectangle with scissors for "Cut Hole" tool
const CutHoleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="2" width="18" height="14" rx="2" strokeDasharray="4 2" />
    <circle cx="8" cy="21" r="2" strokeWidth="1.5" />
    <circle cx="16" cy="21" r="2" strokeWidth="1.5" />
    <line x1="9.5" y1="19.5" x2="14.5" y2="14" strokeWidth="1.5" />
    <line x1="14.5" y1="19.5" x2="9.5" y2="14" strokeWidth="1.5" />
  </svg>
);

interface EditorToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  is3DMode?: boolean;
  onToggle3D?: () => void;
  showDimensionLabels?: boolean;
  onToggleDimensionLabels?: () => void;
  dimensionUnit?: DimensionUnit;
  onDimensionUnitChange?: (unit: DimensionUnit) => void;
  onShowShortcuts?: () => void;
  // Snap settings props
  snapSettings?: SnapSettings;
  onSnapSettingsChange?: (settings: SnapSettings) => void;
  // Room templates
  onPickRoomTemplate?: (id: RoomTemplateId) => void;
}

// Tool groups for organized toolbar
const toolGroups = {
  navigate: [
    { id: 'select' as EditorTool, icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { id: 'pan' as EditorTool, icon: Move, label: 'Pan', shortcut: 'Space' },
  ],
  draw: [
    { id: 'draw' as EditorTool, icon: Pencil, label: 'Draw Room', shortcut: 'D' },
    { id: 'rectangle' as EditorTool, icon: RectangleHorizontal, label: 'Rectangle Room', shortcut: 'R' },
    { id: 'hole' as EditorTool, icon: CutHoleIcon, label: 'Cut Hole/Void', shortcut: 'H' },
  ],
  elements: [
    { id: 'door' as EditorTool, icon: DoorOpen, label: 'Add Door', shortcut: 'O' },
    { id: 'transition' as EditorTool, icon: ArrowLeftRight, label: 'Draw Transition', shortcut: 'T' },
    { id: 'scale' as EditorTool, icon: Ruler, label: 'Set Scale', shortcut: 'S' },
  ],
  edit: [
    { id: 'merge' as EditorTool, icon: Combine, label: 'Merge Rooms', shortcut: 'M' },
    { id: 'split' as EditorTool, icon: Scissors, label: 'Split Room', shortcut: 'X' },
  ],
};

const unitLabels: Record<DimensionUnit, string> = {
  m: 'Meters',
  cm: 'Centimeters', 
  mm: 'Millimeters',
  imperial: 'Feet & Inches',
};

const gridSizeOptions = [
  { label: '50mm', value: 50 },
  { label: '100mm', value: 100 },
  { label: '250mm', value: 250 },
  { label: '500mm', value: 500 },
];

export function EditorToolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  canUndo = false,
  canRedo = false,
  is3DMode = false,
  onToggle3D,
  showDimensionLabels = true,
  onToggleDimensionLabels,
  dimensionUnit = 'm',
  onDimensionUnitChange,
  onShowShortcuts,
  snapSettings,
  onSnapSettingsChange,
  onPickRoomTemplate,
}: EditorToolbarProps) {
  const handleSnapToggle = (key: keyof SnapSettings, value: boolean) => {
    if (snapSettings && onSnapSettingsChange) {
      onSnapSettingsChange({ ...snapSettings, [key]: value });
    }
  };

  const handleGridSizeChange = (size: number) => {
    if (snapSettings && onSnapSettingsChange) {
      onSnapSettingsChange({ ...snapSettings, gridSize: size });
    }
  };

  const renderToolButton = (tool: { id: EditorTool; icon: React.ElementType; label: string; shortcut: string }) => (
    <Tooltip key={tool.id}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
          onClick={() => onToolChange(tool.id)}
          disabled={is3DMode}
        >
          <tool.icon className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{tool.label} <span className="text-muted-foreground ml-1">({tool.shortcut})</span></p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="glass-panel flex items-center gap-1 p-1.5">
      {/* 2D/3D Toggle */}
      {onToggle3D && (
        <>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`tool-button ${!is3DMode ? 'active' : ''}`}
                  onClick={() => is3DMode && onToggle3D()}
                >
                  <Grid2X2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>2D View <span className="text-muted-foreground ml-1">(2)</span></p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`tool-button ${is3DMode ? 'active' : ''}`}
                  onClick={() => !is3DMode && onToggle3D()}
                >
                  <Box className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>3D View <span className="text-muted-foreground ml-1">(3)</span></p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}
      
      {/* Navigate Tools */}
      <div className="flex items-center gap-0.5">
        {toolGroups.navigate.map(renderToolButton)}
      </div>

      <Separator orientation="vertical" className="h-6 mx-0.5 opacity-50" />

      {/* Draw Tools */}
      <div className="flex items-center gap-0.5">
        {toolGroups.draw.map(renderToolButton)}
        {onPickRoomTemplate && (
          <RoomTemplatesMenu onPickTemplate={onPickRoomTemplate} disabled={is3DMode} />
        )}
      </div>

      <Separator orientation="vertical" className="h-6 mx-0.5 opacity-50" />

      {/* Element Tools */}
      <div className="flex items-center gap-0.5">
        {toolGroups.elements.map(renderToolButton)}
      </div>

      <Separator orientation="vertical" className="h-6 mx-0.5 opacity-50" />

      {/* Edit Tools */}
      <div className="flex items-center gap-0.5">
        {toolGroups.edit.map(renderToolButton)}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Snap Settings */}
      {snapSettings && onSnapSettingsChange && (
        <>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`tool-button ${snapSettings.enabled ? 'active' : 'opacity-50'}`}
                    disabled={is3DMode}
                  >
                    <Magnet className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Snap Settings <span className="text-muted-foreground ml-1">(G)</span></p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-56 bg-popover border shadow-lg">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Snap Options</DropdownMenuLabel>
              
              {/* Master Toggle */}
              <div className="flex items-center justify-between px-2 py-2">
                <Label htmlFor="snap-enabled" className="text-sm font-medium">Enable Snapping</Label>
                <Switch
                  id="snap-enabled"
                  checked={snapSettings.enabled}
                  onCheckedChange={(checked) => handleSnapToggle('enabled', checked)}
                />
              </div>
              
              <DropdownMenuSeparator />
              
              {/* Grid Snap */}
              <div className="flex items-center justify-between px-2 py-1.5">
                <Label htmlFor="grid-snap" className="text-sm">Snap to Grid</Label>
                <Switch
                  id="grid-snap"
                  checked={snapSettings.gridEnabled}
                  onCheckedChange={(checked) => handleSnapToggle('gridEnabled', checked)}
                  disabled={!snapSettings.enabled}
                />
              </div>
              
              {/* Grid Size */}
              <div className="px-2 py-1.5">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Grid Size</Label>
                <div className="flex gap-1">
                  {gridSizeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={snapSettings.gridSize === option.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-2 text-xs flex-1"
                      onClick={() => handleGridSizeChange(option.value)}
                      disabled={!snapSettings.enabled || !snapSettings.gridEnabled}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <DropdownMenuSeparator />
              
              {/* Vertex Snap */}
              <div className="flex items-center justify-between px-2 py-1.5">
                <Label htmlFor="vertex-snap" className="text-sm">Snap to Corners</Label>
                <Switch
                  id="vertex-snap"
                  checked={snapSettings.vertexSnapEnabled}
                  onCheckedChange={(checked) => handleSnapToggle('vertexSnapEnabled', checked)}
                  disabled={!snapSettings.enabled}
                />
              </div>
              
              {/* Axis Snap */}
              <div className="flex items-center justify-between px-2 py-1.5">
                <Label htmlFor="axis-snap" className="text-sm">Snap to Axes</Label>
                <Switch
                  id="axis-snap"
                  checked={snapSettings.axisSnapEnabled}
                  onCheckedChange={(checked) => handleSnapToggle('axisSnapEnabled', checked)}
                  disabled={!snapSettings.enabled}
                />
              </div>
              
              <DropdownMenuSeparator />
              
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <p><kbd className="bg-muted px-1 rounded">G</kbd> Toggle grid • <kbd className="bg-muted px-1 rounded">Alt</kbd> Hold to disable</p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}

      {/* History */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="tool-button"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Undo <span className="text-muted-foreground ml-1">(Ctrl+Z)</span></p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="tool-button"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Redo <span className="text-muted-foreground ml-1">(Ctrl+Shift+Z)</span></p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Zoom */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="tool-button"
              onClick={onZoomOut}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Zoom Out</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="tool-button"
              onClick={onZoomIn}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Zoom In</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="tool-button"
              onClick={onFitView}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Fit to View</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* View Options */}
      {onToggleDimensionLabels && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`tool-button ${showDimensionLabels ? 'active' : ''}`}
                  onClick={onToggleDimensionLabels}
                >
                  <RulerIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{showDimensionLabels ? 'Hide' : 'Show'} Dimensions</p>
              </TooltipContent>
            </Tooltip>

            {onDimensionUnitChange && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 gap-1.5 text-xs font-medium border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                        >
                          <RulerIcon className="w-3.5 h-3.5 text-primary" />
                          <span className="font-mono uppercase">{dimensionUnit}</span>
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border shadow-lg">
                        {(Object.keys(unitLabels) as DimensionUnit[]).map((unit) => (
                          <DropdownMenuItem
                            key={unit}
                            onClick={() => onDimensionUnitChange(unit)}
                            className={`cursor-pointer ${dimensionUnit === unit ? 'bg-accent font-medium' : ''}`}
                          >
                            <span className="font-mono w-10 uppercase">{unit}</span>
                            <span className="text-muted-foreground">{unitLabels[unit]}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Change measurement units</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </>
      )}

      {/* Help */}
      {onShowShortcuts && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="tool-button"
                onClick={onShowShortcuts}
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Keyboard Shortcuts <span className="text-muted-foreground ml-1">(?)</span></p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
