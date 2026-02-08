import { useState } from 'react';
import { Room, ScaleCalibration, RoomAccessories, CovingConfig, WeldRodConfig, SmoothEdgeConfig, UnderlaymentConfig, AdhesiveConfig, TransitionConfig } from '@/lib/canvas/types';
import { StripPlanResult } from '@/lib/rollGoods/types';
import { Material } from '@/hooks/useMaterials';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Layers, 
  ChevronDown, 
  Plus, 
  Trash2,
  CornerDownRight,
  Droplets,
  Grid3X3,
  DoorOpen,
  Scissors,
  Grip
} from 'lucide-react';
import { 
  ACCESSORY_TYPES, 
  TRANSITION_TYPES, 
  UNDERLAYMENT_TYPES, 
  ADHESIVE_TYPES 
} from '@/lib/accessories/types';
import { calculateRoomAccessories } from '@/lib/accessories/calculations';
import { calculateRoomNetArea, pixelAreaToRealArea, mmSquaredToMSquared, calculatePerimeter } from '@/lib/canvas/geometry';
import { cn } from '@/lib/utils';

interface AccessoriesPanelProps {
  room: Room;
  scale: ScaleCalibration | null;
  materials: Material[];
  onUpdateAccessories: (accessories: RoomAccessories) => void;
  stripPlan?: StripPlanResult;
}

export function AccessoriesPanel({ 
  room, 
  scale, 
  materials,
  onUpdateAccessories,
  stripPlan 
}: AccessoriesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['coving', 'adhesive']));
  
  const accessories = room.accessories || {};
  
  // Calculate room metrics for display
  const netAreaPixels = calculateRoomNetArea(room);
  const netAreaMm2 = pixelAreaToRealArea(netAreaPixels, scale);
  const netAreaM2 = mmSquaredToMSquared(netAreaMm2);
  
  const perimeterPixels = calculatePerimeter(room.points);
  const pixelsPerMm = scale?.pixelsPerMm || 1;
  const perimeterM = perimeterPixels / pixelsPerMm / 1000;
  const doorWidthsM = room.doors.reduce((total, door) => total + door.width / 1000, 0);
  const netPerimeterM = Math.max(0, perimeterM - doorWidthsM);
  
  // Calculate actual seam length from strip plan (not extended rendering coordinates)
  const seamLengthM = (stripPlan as StripPlanResult)?.totalSeamLengthM || 0;
  
  // Calculate perimeter contribution for weld rod when coving enabled
  const covingEnabled = accessories.coving?.enabled || false;
  const covingHeightMm = accessories.coving?.heightMm || 100;
  
  // Calculate current accessory costs
  const accessoryCalc = calculateRoomAccessories(
    room, 
    scale, 
    netAreaM2, 
    materials, 
    stripPlan as any
  );
  
  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) {
      next.delete(section);
    } else {
      next.add(section);
    }
    setExpandedSections(next);
  };
  
  const updateAccessories = (updates: Partial<RoomAccessories>) => {
    onUpdateAccessories({ ...accessories, ...updates });
  };
  
  const updateCoving = (updates: Partial<CovingConfig>) => {
    updateAccessories({
      coving: { ...getDefaultCoving(), ...accessories.coving, ...updates }
    });
  };
  
  const updateWeldRod = (updates: Partial<WeldRodConfig>) => {
    updateAccessories({
      weldRod: { ...getDefaultWeldRod(), ...accessories.weldRod, ...updates }
    });
  };
  
  const updateSmoothEdge = (updates: Partial<SmoothEdgeConfig>) => {
    updateAccessories({
      smoothEdge: { ...getDefaultSmoothEdge(), ...accessories.smoothEdge, ...updates }
    });
  };
  
  const updateUnderlayment = (updates: Partial<UnderlaymentConfig>) => {
    updateAccessories({
      underlayment: { ...getDefaultUnderlayment(), ...accessories.underlayment, ...updates }
    });
  };
  
  const updateAdhesive = (updates: Partial<AdhesiveConfig>) => {
    updateAccessories({
      adhesive: { ...getDefaultAdhesive(), ...accessories.adhesive, ...updates }
    });
  };
  
  const addTransition = (doorId: string) => {
    const existing = accessories.transitions || [];
    const newTransition: TransitionConfig = {
      id: `trans_${Date.now()}`,
      type: 'threshold',
      doorId,
    };
    updateAccessories({
      transitions: [...existing, newTransition]
    });
  };
  
  const removeTransition = (transitionId: string) => {
    const existing = accessories.transitions || [];
    updateAccessories({
      transitions: existing.filter(t => t.id !== transitionId)
    });
  };
  
  const updateTransition = (transitionId: string, updates: Partial<TransitionConfig>) => {
    const existing = accessories.transitions || [];
    updateAccessories({
      transitions: existing.map(t => t.id === transitionId ? { ...t, ...updates } : t)
    });
  };
  
  // Check material type for conditional accessory display
  const roomMaterial = materials.find(m => m.id === room.materialId);
  const isRollMaterial = roomMaterial?.type === 'roll';
  const isSheetVinyl = roomMaterial?.subtype === 'sheet_vinyl';
  const isBroadloomCarpet = roomMaterial?.subtype === 'broadloom_carpet';
  
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Room Summary */}
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: room.color }}
            />
            <span className="font-medium text-sm">{room.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Area: <span className="font-mono">{netAreaM2.toFixed(2)} m²</span></div>
            <div>Perimeter: <span className="font-mono">{netPerimeterM.toFixed(2)} m</span></div>
            <div>Doors: <span className="font-mono">{room.doors.length}</span></div>
            <div>Seams: <span className="font-mono">{seamLengthM.toFixed(2)} m</span></div>
            {covingEnabled && (
              <div>Weld Rod: <span className="font-mono">{(seamLengthM + netPerimeterM).toFixed(2)} m</span></div>
            )}
          </div>
        </div>
        
        {/* Coving Section - Only for Sheet Vinyl */}
        {isSheetVinyl && (
          <Collapsible open={expandedSections.has('coving')} onOpenChange={() => toggleSection('coving')}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <CornerDownRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{ACCESSORY_TYPES.coving.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {accessories.coving?.enabled && (
                    <Badge variant="secondary" className="text-xs">
                      {accessoryCalc.coving?.quantity.toFixed(1)}m
                    </Badge>
                  )}
                  <Switch 
                    checked={accessories.coving?.enabled || false}
                    onCheckedChange={(checked) => updateCoving({ enabled: checked })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    expandedSections.has('coving') && "rotate-180"
                  )} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-2 space-y-3 border-x border-b border-border rounded-b-lg bg-background/50">
                <p className="text-xs text-muted-foreground">{ACCESSORY_TYPES.coving.description}</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Height (mm)</Label>
                    <Input 
                      type="number"
                      value={accessories.coving?.heightMm || 100}
                      onChange={(e) => updateCoving({ heightMm: parseInt(e.target.value) || 100 })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Net Length</Label>
                    <div className="h-8 px-2 flex items-center text-xs font-mono bg-muted rounded-md">
                      {netPerimeterM.toFixed(2)} m
                    </div>
                  </div>
                </div>
                
                {accessories.coving?.enabled && accessoryCalc.coving && (
                  <>
                    <div className="flex items-center justify-between p-2 rounded bg-primary/10 text-xs">
                      <span>Estimated Cost:</span>
                      <span className="font-mono font-medium">
                        ${accessoryCalc.coving.totalCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-muted text-xs text-muted-foreground">
                      Drops extended by +{(covingHeightMm * 2)}mm for {covingHeightMm}mm coving
                    </div>
                  </>
                )}
                
                {accessories.coving?.enabled && accessoryCalc.coveFilletCorners && (
                  <div className="flex items-center justify-between p-2 rounded bg-muted text-xs">
                    <span>Cove Fillet Corners:</span>
                    <span className="font-mono">
                      {accessoryCalc.coveFilletCorners.internalCorners} int + {accessoryCalc.coveFilletCorners.externalCorners} ext = ${accessoryCalc.coveFilletCorners.totalCost.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Smooth Edge / Gripper Section - Only for Broadloom Carpet */}
        {isBroadloomCarpet && (
          <Collapsible open={expandedSections.has('smoothEdge')} onOpenChange={() => toggleSection('smoothEdge')}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <Grip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{ACCESSORY_TYPES.smooth_edge.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {accessories.smoothEdge?.enabled && (
                    <Badge variant="secondary" className="text-xs">
                      {accessoryCalc.smoothEdge?.quantity.toFixed(1)}m
                    </Badge>
                  )}
                  <Switch 
                    checked={accessories.smoothEdge?.enabled || false}
                    onCheckedChange={(checked) => updateSmoothEdge({ enabled: checked })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    expandedSections.has('smoothEdge') && "rotate-180"
                  )} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-2 space-y-3 border-x border-b border-border rounded-b-lg bg-background/50">
                <p className="text-xs text-muted-foreground">{ACCESSORY_TYPES.smooth_edge.description}</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Net Perimeter</Label>
                    <div className="h-8 px-2 flex items-center text-xs font-mono bg-muted rounded-md">
                      {netPerimeterM.toFixed(2)} m
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch 
                      id="doubleRow"
                      checked={accessories.smoothEdge?.doubleRow || false}
                      onCheckedChange={(checked) => updateSmoothEdge({ doubleRow: checked })}
                    />
                    <Label htmlFor="doubleRow" className="text-xs">Double row (heavy duty)</Label>
                  </div>
                </div>
                
                {accessories.smoothEdge?.enabled && accessoryCalc.smoothEdge && (
                  <div className="flex items-center justify-between p-2 rounded bg-primary/10 text-xs">
                    <span>Estimated Cost{accessoryCalc.smoothEdge.isDoubleRow ? ' (×2)' : ''}:</span>
                    <span className="font-mono font-medium">
                      ${accessoryCalc.smoothEdge.totalCost.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Weld Rod Section (only for sheet materials) */}
        {isRollMaterial && (
          <Collapsible open={expandedSections.has('weldRod')} onOpenChange={() => toggleSection('weldRod')}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{ACCESSORY_TYPES.weld_rod.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {accessories.weldRod?.enabled && (
                    <Badge variant="secondary" className="text-xs">
                      {covingEnabled 
                        ? `${(seamLengthM + netPerimeterM).toFixed(1)}m` 
                        : `${seamLengthM.toFixed(1)}m`}
                    </Badge>
                  )}
                  <Switch 
                    checked={accessories.weldRod?.enabled || false}
                    onCheckedChange={(checked) => updateWeldRod({ enabled: checked })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    expandedSections.has('weldRod') && "rotate-180"
                  )} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-2 space-y-3 border-x border-b border-border rounded-b-lg bg-background/50">
                <p className="text-xs text-muted-foreground">{ACCESSORY_TYPES.weld_rod.description}</p>
                
                {seamLengthM > 0 || covingEnabled ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="colorMatch"
                        checked={accessories.weldRod?.colorMatch || false}
                        onCheckedChange={(checked) => updateWeldRod({ colorMatch: checked })}
                      />
                      <Label htmlFor="colorMatch" className="text-xs">Color matched to material</Label>
                    </div>
                    
                    {accessories.weldRod?.enabled && (
                      <div className="space-y-1.5">
                        {/* Breakdown */}
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <div>Seams: <span className="font-mono">{seamLengthM.toFixed(2)}m</span></div>
                          {covingEnabled && (
                            <div>Perimeter: <span className="font-mono">{netPerimeterM.toFixed(2)}m</span></div>
                          )}
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-primary/10 text-xs">
                          <span>Total: {covingEnabled 
                            ? `${seamLengthM.toFixed(1)}m + ${netPerimeterM.toFixed(1)}m = ${(seamLengthM + netPerimeterM).toFixed(1)}m`
                            : `${seamLengthM.toFixed(1)}m`}</span>
                          {accessoryCalc.weldRod && (
                            <span className="font-mono font-medium">
                              ${accessoryCalc.weldRod.totalCost.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No seams detected. Weld rod will be calculated after strip planning.
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Transitions Section */}
        {room.doors.length > 0 && (
          <Collapsible open={expandedSections.has('transitions')} onOpenChange={() => toggleSection('transitions')}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{ACCESSORY_TYPES.transition.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(accessories.transitions?.length || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {accessories.transitions?.length}
                    </Badge>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    expandedSections.has('transitions') && "rotate-180"
                  )} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-2 space-y-3 border-x border-b border-border rounded-b-lg bg-background/50">
                <p className="text-xs text-muted-foreground">{ACCESSORY_TYPES.transition.description}</p>
                
                <div className="space-y-2">
                  {room.doors.map((door, index) => {
                    const doorTransition = accessories.transitions?.find(t => t.doorId === door.id);
                    
                    return (
                      <div key={door.id} className="p-2 rounded border border-border bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">
                            Door {index + 1} ({door.width}mm)
                          </span>
                          {doorTransition ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => removeTransition(doorTransition.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={() => addTransition(door.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                        
                        {doorTransition && (
                          <Select 
                            value={doorTransition.type}
                            onValueChange={(value) => updateTransition(doorTransition.id, { 
                              type: value as TransitionConfig['type'] 
                            })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TRANSITION_TYPES).map(([key, { label }]) => (
                                <SelectItem key={key} value={key} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {accessoryCalc.transitions && accessoryCalc.transitions.length > 0 && (
                  <div className="flex items-center justify-between p-2 rounded bg-primary/10 text-xs">
                    <span>Estimated Cost:</span>
                    <span className="font-mono font-medium">
                      ${accessoryCalc.transitions.reduce((sum, t) => sum + t.totalCost, 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Underlayment Section */}
        <Collapsible open={expandedSections.has('underlayment')} onOpenChange={() => toggleSection('underlayment')}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{ACCESSORY_TYPES.underlayment.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {accessories.underlayment?.enabled && accessories.underlayment?.type !== 'none' && (
                  <Badge variant="secondary" className="text-xs">
                    {accessories.underlayment.type}
                  </Badge>
                )}
                <Switch 
                  checked={accessories.underlayment?.enabled || false}
                  onCheckedChange={(checked) => updateUnderlayment({ enabled: checked })}
                  onClick={(e) => e.stopPropagation()}
                />
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  expandedSections.has('underlayment') && "rotate-180"
                )} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 pt-2 space-y-3 border-x border-b border-border rounded-b-lg bg-background/50">
              <p className="text-xs text-muted-foreground">{ACCESSORY_TYPES.underlayment.description}</p>
              
              <div>
                <Label className="text-xs">Type</Label>
                <Select 
                  value={accessories.underlayment?.type || 'none'}
                  onValueChange={(value) => updateUnderlayment({ 
                    type: value as UnderlaymentConfig['type']
                  })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UNDERLAYMENT_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {accessories.underlayment?.enabled && accessoryCalc.underlayment && (
                <div className="flex items-center justify-between p-2 rounded bg-primary/10 text-xs">
                  <span>Estimated Cost ({accessoryCalc.underlayment.areaM2.toFixed(2)} m²):</span>
                  <span className="font-mono font-medium">
                    ${accessoryCalc.underlayment.totalCost.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Adhesive Section */}
        <Collapsible open={expandedSections.has('adhesive')} onOpenChange={() => toggleSection('adhesive')}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{ACCESSORY_TYPES.adhesive.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {accessories.adhesive?.enabled && accessories.adhesive?.type !== 'none' && (
                  <Badge variant="secondary" className="text-xs">
                    {accessories.adhesive.type}
                  </Badge>
                )}
                <Switch 
                  checked={accessories.adhesive?.enabled || false}
                  onCheckedChange={(checked) => updateAdhesive({ enabled: checked })}
                  onClick={(e) => e.stopPropagation()}
                />
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  expandedSections.has('adhesive') && "rotate-180"
                )} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 pt-2 space-y-3 border-x border-b border-border rounded-b-lg bg-background/50">
              <p className="text-xs text-muted-foreground">{ACCESSORY_TYPES.adhesive.description}</p>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select 
                    value={accessories.adhesive?.type || 'none'}
                    onValueChange={(value) => {
                      const adhesiveType = value as AdhesiveConfig['type'];
                      const defaultCoverage = ADHESIVE_TYPES[adhesiveType]?.defaultCoverage || 25;
                      updateAdhesive({ 
                        type: adhesiveType,
                        coverageRateM2PerUnit: defaultCoverage
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ADHESIVE_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Coverage (m²/unit)</Label>
                  <Input 
                    type="number"
                    value={accessories.adhesive?.coverageRateM2PerUnit || 25}
                    onChange={(e) => updateAdhesive({ 
                      coverageRateM2PerUnit: parseFloat(e.target.value) || 25 
                    })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              
              {accessories.adhesive?.enabled && accessoryCalc.adhesive && (
                <div className="flex items-center justify-between p-2 rounded bg-primary/10 text-xs">
                  <span>Estimated Cost ({accessoryCalc.adhesive.unitsNeeded} units):</span>
                  <span className="font-mono font-medium">
                    ${accessoryCalc.adhesive.totalCost.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <Separator />
        
        {/* Total Accessories Cost */}
        <div className="p-3 rounded-lg border border-primary bg-primary/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Accessories</span>
            <span className="text-lg font-bold font-mono">
              ${accessoryCalc.totalAccessoryCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// Default configurations
function getDefaultCoving(): CovingConfig {
  return { enabled: false, heightMm: 100 };
}

function getDefaultWeldRod(): WeldRodConfig {
  return { enabled: false, colorMatch: true };
}

function getDefaultSmoothEdge(): SmoothEdgeConfig {
  return { enabled: false, doubleRow: false };
}

function getDefaultUnderlayment(): UnderlaymentConfig {
  return { enabled: false, type: 'none' };
}

function getDefaultAdhesive(): AdhesiveConfig {
  return { enabled: false, type: 'none', coverageRateM2PerUnit: 25 };
}
