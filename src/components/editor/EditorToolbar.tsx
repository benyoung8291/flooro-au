import { EditorTool } from './EditorCanvas';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DimensionUnit } from '@/lib/canvas/types';
import { 
  MousePointer2, 
  Pencil, 
  Square, 
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
  HelpCircle
} from 'lucide-react';

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
}

const tools: { id: EditorTool; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'draw', icon: Pencil, label: 'Draw Room', shortcut: 'D' },
  { id: 'hole', icon: Square, label: 'Cut Hole', shortcut: 'H' },
  { id: 'door', icon: DoorOpen, label: 'Add Door', shortcut: 'O' },
  { id: 'scale', icon: Ruler, label: 'Set Scale', shortcut: 'S' },
  { id: 'pan', icon: Move, label: 'Pan', shortcut: 'Space' },
];

const unitLabels: Record<DimensionUnit, string> = {
  m: 'Meters',
  cm: 'Centimeters', 
  mm: 'Millimeters',
  imperial: 'Feet & Inches',
};

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
}: EditorToolbarProps) {
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
      
      {/* Main Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map(tool => (
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
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tool-button h-8 px-2 gap-1 text-xs font-medium"
                  >
                    {dimensionUnit}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(Object.keys(unitLabels) as DimensionUnit[]).map((unit) => (
                    <DropdownMenuItem
                      key={unit}
                      onClick={() => onDimensionUnitChange(unit)}
                      className={dimensionUnit === unit ? 'bg-accent' : ''}
                    >
                      <span className="font-mono w-8">{unit}</span>
                      <span className="text-muted-foreground ml-2">{unitLabels[unit]}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
