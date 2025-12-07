import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Check, 
  Edit2, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingDown,
  TrendingUp,
  ArrowRight
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
import { WastageSuggestion, ComplexityMetrics, WasteOverrides, formatCurrency } from '@/lib/reports/calculations';
import { Material } from '@/hooks/useMaterials';
import { cn } from '@/lib/utils';

interface WasteSuggestionCardProps {
  materials: Material[];
  wasteSuggestions: Map<string, WastageSuggestion & { metrics: ComplexityMetrics }>;
  wasteOverrides: WasteOverrides;
  onOverrideChange: (materialId: string, value: number | undefined) => void;
}

// Calculate estimated cost for a material with given waste percentage
function calculateMaterialCost(
  material: Material,
  totalAreaM2: number,
  wastePercent: number
): number {
  const wasteFactor = 1 + wastePercent / 100;
  const grossAreaM2 = totalAreaM2 * wasteFactor;
  const unitPrice = material.specs.pricePerM2 || material.specs.price || 0;
  return grossAreaM2 * unitPrice;
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
          const defaultWaste = material.specs.wastePercent || material.specs.waste_percent as number || 10;
          const currentWaste = hasOverride ? wasteOverrides[materialId] : defaultWaste;
          const isEditing = editingMaterial === materialId;
          const isSuggestionApplied = currentWaste === suggestion.suggestedPercent;
          
          // Calculate cost comparison
          const currentCost = calculateMaterialCost(material, suggestion.metrics.totalAreaM2, currentWaste);
          const suggestedCost = calculateMaterialCost(material, suggestion.metrics.totalAreaM2, suggestion.suggestedPercent);
          const costDifference = suggestedCost - currentCost;
          const hasPricing = (material.specs.pricePerM2 || material.specs.price || 0) > 0;

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
                  
                  {/* Quick suggestion badge with cost comparison */}
                  {!isSuggestionApplied && !isEditing && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2">
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
                      
                      {/* Cost impact preview */}
                      {hasPricing && costDifference !== 0 && (
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                          costDifference < 0 
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        )}>
                          {costDifference < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <TrendingUp className="w-3 h-3" />
                          )}
                          <span className="font-mono">
                            {formatCurrency(currentCost)}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="font-mono font-medium">
                            {formatCurrency(suggestedCost)}
                          </span>
                          <span className="text-muted-foreground">
                            ({costDifference < 0 ? '' : '+'}{formatCurrency(costDifference)})
                          </span>
                        </div>
                      )}
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
                      
                      {/* Cost comparison in expanded view */}
                      {hasPricing && !isSuggestionApplied && (
                        <div className="bg-muted/50 rounded-md p-2 mt-2">
                          <p className="text-xs font-medium mb-1.5">Cost Comparison</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-background rounded p-1.5 text-center">
                              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Current ({currentWaste}%)</p>
                              <p className="font-mono font-medium">{formatCurrency(currentCost)}</p>
                            </div>
                            <div className={cn(
                              "rounded p-1.5 text-center",
                              costDifference < 0 
                                ? "bg-emerald-500/10" 
                                : "bg-amber-500/10"
                            )}>
                              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Suggested ({suggestion.suggestedPercent}%)</p>
                              <p className="font-mono font-medium">{formatCurrency(suggestedCost)}</p>
                            </div>
                          </div>
                          {costDifference !== 0 && (
                            <p className={cn(
                              "text-xs text-center mt-1.5 font-medium",
                              costDifference < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                            )}>
                              {costDifference < 0 ? 'Save' : 'Additional'} {formatCurrency(Math.abs(costDifference))} per project
                            </p>
                          )}
                        </div>
                      )}
                      
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
