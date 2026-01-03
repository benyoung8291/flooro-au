import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  RotateCcw, 
  RotateCw, 
  Lock, 
  Unlock, 
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BackgroundImage } from '@/lib/canvas/types';
import { cn } from '@/lib/utils';

interface ImageControlsProps {
  image: BackgroundImage;
  onUpdate: (updates: Partial<BackgroundImage>) => void;
  onRemove: () => void;
}

export function ImageControls({ image, onUpdate, onRemove }: ImageControlsProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  const handleRotate = (delta: number) => {
    const newRotation = (image.rotation + delta + 360) % 360;
    onUpdate({ rotation: newRotation });
  };

  // Minimized view - compact button
  if (isMinimized) {
    return (
      <div className="glass-panel p-1.5 inline-flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5"
              onClick={() => setIsMinimized(false)}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Floor Plan</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Expand floor plan controls</p>
          </TooltipContent>
        </Tooltip>
        
        {image.locked && (
          <Lock className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel p-3 space-y-4 min-w-[200px]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Floor Plan</span>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsMinimized(true)}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Minimize panel</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Remove floor plan</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Opacity Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Eye className="w-3 h-3" />
            Opacity
          </Label>
          <span className="text-xs tabular-nums">
            {Math.round(image.opacity * 100)}%
          </span>
        </div>
        <Slider
          value={[image.opacity * 100]}
          min={10}
          max={100}
          step={5}
          onValueChange={([value]) => onUpdate({ opacity: value / 100 })}
          className="w-full"
        />
      </div>

      {/* Scale Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Scale</Label>
          <span className="text-xs tabular-nums">
            {Math.round(image.scale * 100)}%
          </span>
        </div>
        <Slider
          value={[image.scale * 100]}
          min={10}
          max={300}
          step={5}
          onValueChange={([value]) => onUpdate({ scale: value / 100 })}
          className="w-full"
          disabled={image.locked}
        />
      </div>

      {/* Rotation Controls */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Rotation</Label>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8"
                onClick={() => handleRotate(-90)}
                disabled={image.locked}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                -90°
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rotate counter-clockwise</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8"
                onClick={() => handleRotate(90)}
                disabled={image.locked}
              >
                <RotateCw className="w-3 h-3 mr-1" />
                +90°
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rotate clockwise</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Lock Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={image.locked ? 'secondary' : 'outline'}
            size="sm"
            className="w-full"
            onClick={() => onUpdate({ locked: !image.locked })}
          >
            {image.locked ? (
              <>
                <Lock className="w-3 h-3 mr-2" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 mr-2" />
                Lock Position
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{image.locked ? 'Unlock to move/resize' : 'Lock position to prevent accidental changes'}</p>
        </TooltipContent>
      </Tooltip>
      
      {image.locked && (
        <p className="text-xs text-muted-foreground text-center">
          Floor plan is locked to keep rooms aligned
        </p>
      )}
    </div>
  );
}
