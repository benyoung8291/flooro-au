import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowRight, RotateCw, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FillDirectionControlProps {
  direction: number;
  onDirectionChange: (direction: number) => void;
  locked?: boolean;
  onLockedChange?: (locked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  showInput?: boolean;
}

export function FillDirectionControl({
  direction,
  onDirectionChange,
  locked = false,
  onLockedChange,
  size = 'md',
  showInput = true,
}: FillDirectionControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: { dial: 'w-12 h-12', arrow: 'w-4 h-4' },
    md: { dial: 'w-16 h-16', arrow: 'w-5 h-5' },
    lg: { dial: 'w-20 h-20', arrow: 'w-6 h-6' },
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (locked) return;
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging && e.type === 'mousemove') return;
    if (!dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let degrees = (angle * 180) / Math.PI;
    
    // Normalize to 0-360
    if (degrees < 0) degrees += 360;
    
    // Snap to 15 degree increments if shift is not held
    if (!e.shiftKey) {
      degrees = Math.round(degrees / 15) * 15;
    }
    
    onDirectionChange(degrees % 360);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMove = (e: MouseEvent) => handleMouseMove(e);
      const handleGlobalUp = () => handleMouseUp();
      
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
      };
    }
  }, [isDragging]);

  const setQuickDirection = (deg: number) => {
    if (!locked) onDirectionChange(deg);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Fill Direction</Label>
        {onLockedChange && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onLockedChange(!locked)}
          >
            {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Dial control */}
        <div
          ref={dialRef}
          className={cn(
            sizes[size].dial,
            "relative rounded-full border-2 cursor-pointer transition-colors",
            locked 
              ? "border-muted bg-muted/30 cursor-not-allowed" 
              : "border-border bg-background hover:border-primary",
            isDragging && "border-primary ring-2 ring-primary/30"
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Direction indicator */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotate(${direction}deg)` }}
          >
            <div className="flex items-center">
              <div className={cn(
                "bg-primary rounded-full",
                size === 'sm' ? "w-1 h-1" : size === 'md' ? "w-1.5 h-1.5" : "w-2 h-2"
              )} />
              <ArrowRight className={cn(
                sizes[size].arrow,
                "text-primary -ml-0.5"
              )} />
            </div>
          </div>
          
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "rounded-full bg-muted-foreground/30",
              size === 'sm' ? "w-1.5 h-1.5" : "w-2 h-2"
            )} />
          </div>
          
          {/* Cardinal marks */}
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute w-0.5 h-1 bg-muted-foreground/50"
              style={{
                top: deg === 180 ? '2px' : deg === 0 ? 'auto' : '50%',
                bottom: deg === 0 ? '2px' : 'auto',
                left: deg === 90 ? '2px' : deg === 270 ? 'auto' : '50%',
                right: deg === 270 ? '2px' : 'auto',
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
              }}
            />
          ))}
        </div>
        
        <div className="flex-1 space-y-1">
          {/* Quick angles */}
          <div className="flex gap-1">
            {[0, 45, 90, 135].map((deg) => (
              <Button
                key={deg}
                variant={direction === deg ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs font-mono"
                onClick={() => setQuickDirection(deg)}
                disabled={locked}
              >
                {deg}°
              </Button>
            ))}
          </div>
          
          {/* Input */}
          {showInput && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={direction}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  onDirectionChange(((val % 360) + 360) % 360);
                }}
                className="h-7 w-16 text-xs font-mono"
                min={0}
                max={359}
                disabled={locked}
              />
              <span className="text-xs text-muted-foreground">°</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setQuickDirection((direction + 90) % 360)}
                disabled={locked}
              >
                <RotateCw className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
