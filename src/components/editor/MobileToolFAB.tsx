import { useState } from 'react';
import { EditorTool } from './EditorCanvas';
import { Button } from '@/components/ui/button';
import { 
  Pencil, 
  Square, 
  DoorOpen, 
  Ruler, 
  Move,
  ArrowLeftRight,
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileToolFABProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
}

const fabTools: { id: EditorTool; icon: React.ElementType; label: string }[] = [
  { id: 'draw', icon: Pencil, label: 'Draw Room' },
  { id: 'hole', icon: Square, label: 'Cut Hole' },
  { id: 'door', icon: DoorOpen, label: 'Add Door' },
  { id: 'transition', icon: ArrowLeftRight, label: 'Transition' },
  { id: 'scale', icon: Ruler, label: 'Set Scale' },
  { id: 'pan', icon: Move, label: 'Pan' },
];

export function MobileToolFAB({ activeTool, onToolChange }: MobileToolFABProps) {
  const [expanded, setExpanded] = useState(false);
  
  const handleToolSelect = (tool: EditorTool) => {
    onToolChange(tool);
    setExpanded(false);
  };
  
  return (
    <div className="fixed right-4 bottom-24 z-40 flex flex-col-reverse items-end gap-2">
      {/* Tool Options */}
      <div className={cn(
        "flex flex-col-reverse items-end gap-2 transition-all duration-300",
        expanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {fabTools.map((tool, index) => (
          <div 
            key={tool.id}
            className={cn(
              "flex items-center gap-2 transition-all duration-200",
              expanded ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}
            style={{ transitionDelay: expanded ? `${index * 50}ms` : '0ms' }}
          >
            {/* Label */}
            <span className="text-xs font-medium bg-background/95 backdrop-blur px-2.5 py-1.5 rounded-md shadow-md border border-border whitespace-nowrap">
              {tool.label}
            </span>
            {/* Button */}
            <Button
              variant={activeTool === tool.id ? 'default' : 'secondary'}
              size="icon"
              className="w-12 h-12 rounded-full shadow-lg"
              onClick={() => handleToolSelect(tool.id)}
            >
              <tool.icon className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>
      
      {/* Main FAB Button */}
      <Button
        size="icon"
        className={cn(
          "w-14 h-14 rounded-full shadow-xl transition-all duration-300",
          expanded ? "rotate-45 bg-destructive hover:bg-destructive/90" : ""
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
}
