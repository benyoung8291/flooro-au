import { EditorTool } from './EditorCanvas';
import { Button } from '@/components/ui/button';
import { MousePointer2, Pencil, LayoutGrid } from 'lucide-react';

interface MobileNavProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onOpenMenu: () => void;
}

export function MobileNav({ activeTool, onToolChange, onOpenMenu }: MobileNavProps) {
  const isDrawing = activeTool === 'draw' || activeTool === 'hole' || activeTool === 'door';
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="h-full flex items-center justify-around px-4 max-w-md mx-auto">
        <Button
          variant={activeTool === 'select' ? 'default' : 'ghost'}
          className="flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl"
          onClick={() => onToolChange('select')}
        >
          <MousePointer2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Select</span>
        </Button>
        
        <Button
          variant={isDrawing ? 'default' : 'ghost'}
          className="flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl"
          onClick={() => onToolChange('draw')}
        >
          <Pencil className="w-5 h-5" />
          <span className="text-[10px] font-medium">Draw</span>
        </Button>
        
        <Button
          variant="ghost"
          className="flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl"
          onClick={onOpenMenu}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </Button>
      </div>
    </nav>
  );
}