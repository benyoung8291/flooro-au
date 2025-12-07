import { EditorTool } from './EditorCanvas';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer2, 
  Pencil, 
  Square, 
  DoorOpen, 
  Ruler,
  Move,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Box,
  Grid2X2
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
}

const tools: { id: EditorTool; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'draw', icon: Pencil, label: 'Draw Room', shortcut: 'D' },
  { id: 'hole', icon: Square, label: 'Cut Hole', shortcut: 'H' },
  { id: 'door', icon: DoorOpen, label: 'Add Door', shortcut: 'O' },
  { id: 'scale', icon: Ruler, label: 'Set Scale', shortcut: 'S' },
  { id: 'pan', icon: Move, label: 'Pan', shortcut: 'Space' },
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
    </div>
  );
}
