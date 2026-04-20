import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Shapes, ChevronDown } from 'lucide-react';

export type RoomTemplateId = 'l-shape' | 'u-shape' | 'rect-notch';

interface RoomTemplatesMenuProps {
  onPickTemplate: (id: RoomTemplateId) => void;
  disabled?: boolean;
}

const templates: { id: RoomTemplateId; label: string; description: string; icon: string }[] = [
  { id: 'l-shape', label: 'L-Shape', description: '5m × 4m with corner cut', icon: '⌐' },
  { id: 'u-shape', label: 'U-Shape', description: '6m × 4m with center cut', icon: '⊔' },
  { id: 'rect-notch', label: 'Rectangle + Notch', description: '5m × 4m with side notch', icon: '⊓' },
];

export function RoomTemplatesMenu({ onPickTemplate, disabled }: RoomTemplatesMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="tool-button h-8 px-2 gap-1"
              disabled={disabled}
            >
              <Shapes className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Room Templates</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-64 bg-popover border shadow-lg">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Drop a pre-shaped room
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => onPickTemplate(t.id)}
            className="cursor-pointer flex items-start gap-3 py-2"
          >
            <span className="text-2xl font-mono leading-none w-6 text-center text-primary">
              {t.icon}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[10px] text-muted-foreground">
          Drag corners to resize after placement
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
