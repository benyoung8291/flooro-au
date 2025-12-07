import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Check, 
  Edit2, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { WastageSuggestion, ComplexityMetrics, WasteOverrides } from '@/lib/reports/calculations';
import { Material } from '@/hooks/useMaterials';
import { cn } from '@/lib/utils';

interface WasteSuggestionCardProps {
  materials: Material[];
  wasteSuggestions: Map<string, WastageSuggestion & { metrics: ComplexityMetrics }>;
  wasteOverrides: WasteOverrides;
  onOverrideChange: (materialId: string, value: number | undefined) => void;
}

export function WasteSuggestionCard({
  materials,
  wasteSuggestions,
  wasteOverrides,
  onOverrideChange,
}: WasteSuggestionCardProps) {
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  if (wasteSuggestions.size === 0) {
    return null;
  }

  const toggleExpanded = (materialId: string) => {
    setExpandedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const handleEditStart = (materialId: string, currentValue: number) => {
    setEditingMaterial(materialId);
    setEditValue(currentValue.toString());
  };

  const handleEditSave = (materialId: string) => {
    const value = parseFloat(editValue);
    if (!isNaN(value) && value >= 0 && value <= 50) {
      onOverrideChange(materialId, value);
    }
    setEditingMaterial(null);
  };

  const handleUseSuggested = (materialId: string, suggestedPercent: number) => {
    onOverrideChange(materialId, suggestedPercent);
  };

  const handleReset = (materialId: string) => {
    onOverrideChange(materialId, undefined);
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const variants = {
      high: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      low: 'bg-muted text-muted-foreground border-border',
    };
    return variants[confidence];
  };

  return (
    <Card className="bg-muted/30 border-muted">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          Smart Wastage Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {Array.from(wasteSuggestions.entries()).map(([materialId, suggestion]) => {
          const material = materials.find(m => m.id === materialId);
          if (!material) return null;

          const isExpanded = expandedMaterials.has(materialId);
          const hasOverride = wasteOverrides[materialId] !== undefined;
          const currentWaste = hasOverride 
            ? wasteOverrides[materialId] 
            : (material.specs.wastePercent || material.specs.waste_percent as number || 10);
          const isEditing = editingMaterial === materialId;
          const isSuggestionApplied = currentWaste === suggestion.suggestedPercent;

          return (
            <Collapsible key={materialId} open={isExpanded} onOpenChange={() => toggleExpanded(materialId)}>
              <div className="bg-background rounded-lg border border-border/50 overflow-hidden">
                {/* Header */}
                <div className="p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{material.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {suggestion.metrics.totalAreaM2.toFixed(1)} m² · {suggestion.metrics.roomCount} room{suggestion.metrics.roomCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Current/Applied Value */}
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-16 h-7 text-xs text-center"
                            min={0}
                            max={50}
                            step={0.5}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave(materialId);
                              if (e.key === 'Escape') setEditingMaterial(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleEditSave(materialId)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs font-mono cursor-pointer hover:bg-accent",
                                  hasOverride && "bg-primary/10 border-primary/30"
                                )}
                                onClick={() => handleEditStart(materialId, currentWaste)}
                              >
                                {currentWaste}%
                                <Edit2 className="w-2.5 h-2.5 ml-1 opacity-50" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Click to edit manually</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  
                  {/* Quick suggestion badge */}
                  {!isSuggestionApplied && !isEditing && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs"
                      >
                        <Lightbulb className="w-2.5 h-2.5 mr-1" />
                        Suggested: {suggestion.suggestedPercent}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2"
                        onClick={() => handleUseSuggested(materialId, suggestion.suggestedPercent)}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Expanded details */}
                <CollapsibleContent>
                  <div className="px-2.5 pb-2.5 pt-0 border-t border-border/50">
                    <div className="pt-2 space-y-2">
                      {/* Suggestion details */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs", getConfidenceBadge(suggestion.confidence))}>
                          {suggestion.confidence} confidence
                        </Badge>
                        <span className="text-xs text-muted-foreground">{suggestion.reasoning}</span>
                      </div>
                      
                      {/* Metrics breakdown */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                        <div className="flex justify-between">
                          <span>Avg room size:</span>
                          <span className="font-mono">{suggestion.metrics.averageRoomAreaM2.toFixed(1)} m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg vertices:</span>
                          <span className="font-mono">{suggestion.metrics.averageVerticesPerRoom.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Holes:</span>
                          <span className="font-mono">{suggestion.metrics.totalHoles}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Doors:</span>
                          <span className="font-mono">{suggestion.metrics.totalDoors}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        {!isSuggestionApplied && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs"
                            onClick={() => handleUseSuggested(materialId, suggestion.suggestedPercent)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Use {suggestion.suggestedPercent}%
                          </Button>
                        )}
                        {hasOverride && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleReset(materialId)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset to default
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
        
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          Suggestions based on project area, room complexity, and cutouts
        </p>
      </CardContent>
    </Card>
  );
}
