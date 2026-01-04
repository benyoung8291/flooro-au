import { useState } from 'react';
import { Room, ScaleCalibration, RoomAccessories } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';
import { StripPlanResult, SeamOverride, AvoidZone } from '@/lib/rollGoods/types';
import { TileSpecs } from '@/lib/tiles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Trash2,
  Wrench,
  Scissors,
  LayoutGrid,
  Info,
  Square,
  Circle,
  Minus,
  ArrowLeftRight,
} from 'lucide-react';
import { calculatePolygonArea, calculatePerimeter } from '@/lib/canvas/geometry';
import { AccessoriesPanel } from './AccessoriesPanel';
import { SeamEditor } from './SeamEditor';
import { TilePatternViewer } from './TilePatternViewer';
import { EdgeTransitionsPanel } from './EdgeTransitionsPanel';
import { cn } from '@/lib/utils';

interface RoomDetailViewProps {
  room: Room;
  allRooms?: Room[];
  scale: ScaleCalibration | null;
  materials: Material[];
  stripPlan: StripPlanResult | null;
  onBack: () => void;
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => void;
  onDeleteRoom: (roomId: string) => void;
  onMaterialSelect: (material: Material, roomId: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  roll: Square,
  tile: Circle,
  linear: Minus,
};

export function RoomDetailView({
  room,
  allRooms = [],
  scale,
  materials,
  stripPlan,
  onBack,
  onUpdateRoom,
  onDeleteRoom,
  onMaterialSelect,
}: RoomDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const material = materials.find(m => m.id === room.materialId);
  const isRollMaterial = material?.type === 'roll';
  const isTileMaterial = material?.type === 'tile';
  const Icon = material ? typeIcons[material.type] || Square : null;

  // Calculate room metrics
  const formatArea = (): string => {
    if (!scale) return '—';
    const areaPx = calculatePolygonArea(room.points);
    const areaM2 = areaPx / (scale.pixelsPerMm * scale.pixelsPerMm) / 1_000_000;
    return `${areaM2.toFixed(2)} m²`;
  };

  const formatPerimeter = (): string => {
    if (!scale) return '—';
    const perimeterPx = calculatePerimeter(room.points);
    const perimeterM = perimeterPx / scale.pixelsPerMm / 1000;
    return `${perimeterM.toFixed(2)} m`;
  };

  const handleAccessoriesUpdate = (accessories: RoomAccessories) => {
    onUpdateRoom(room.id, { accessories });
  };

  const handleMaterialChange = (materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    if (mat) {
      onMaterialSelect(mat, room.id);
    }
  };

  const handleFillDirectionChange = (direction: number) => {
    onUpdateRoom(room.id, { fillDirection: direction });
  };

  const handleManualSeamsChange = (seams: SeamOverride[]) => {
    onUpdateRoom(room.id, {
      seamOptions: { ...room.seamOptions, manualSeams: seams },
    });
  };

  const handleAvoidZonesChange = (zones: AvoidZone[]) => {
    onUpdateRoom(room.id, {
      seamOptions: { ...room.seamOptions, avoidZones: zones },
    });
  };

  const handleFirstSeamOffsetChange = (offset: number) => {
    onUpdateRoom(room.id, {
      seamOptions: { ...room.seamOptions, firstSeamOffset: offset },
    });
  };

  const handlePatternChange = (pattern: string) => {
    onUpdateRoom(room.id, { tilePattern: pattern as any });
  };

  // Build available tabs based on material type
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'transitions', label: 'Transitions', icon: ArrowLeftRight },
    { id: 'accessories', label: 'Accessories', icon: Wrench },
  ];

  if (isRollMaterial) {
    tabs.push({ id: 'seams', label: 'Seams', icon: Scissors });
  }

  if (isTileMaterial) {
    tabs.push({ id: 'pattern', label: 'Pattern', icon: LayoutGrid });
  }

  // Transition count for badge
  const transitionCount = room.edgeTransitions?.length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 -ml-1"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDeleteRoom(room.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-sm shrink-0"
            style={{
              backgroundColor:
                room.color?.replace('0.15', '0.6') || 'hsl(var(--primary))',
            }}
          />
          <Input
            value={room.name}
            onChange={(e) => onUpdateRoom(room.id, { name: e.target.value })}
            className="h-7 text-sm font-medium bg-transparent border-dashed focus:border-solid"
          />
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="font-mono">{formatArea()}</span>
          <span>•</span>
          <span className="font-mono">{formatPerimeter()}</span>
          <span>•</span>
          <span>{room.doors.length} doors</span>
          {room.holes?.length > 0 && (
            <>
              <span>•</span>
              <span>{room.holes.length} holes</span>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
            >
              <tab.icon className="w-3.5 h-3.5 mr-1.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-3 space-y-4 mt-0">
            {/* Material Assignment */}
            <div className="space-y-2">
              <Label className="text-xs">Assigned Material</Label>
              <Select
                value={room.materialId || ''}
                onValueChange={handleMaterialChange}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a material...">
                    {material ? (
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span>{material.name}</span>
                      </div>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-50">
                  {materials.map((m) => {
                    const MIcon = typeIcons[m.type] || Square;
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <MIcon className="w-3.5 h-3.5" />
                          <span>{m.name}</span>
                          <Badge variant="outline" className="text-[10px] ml-2">
                            {m.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Note: Material codes are now managed in Project Materials */}

            {/* Quick Stats */}
            {material && (
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                <div className="text-xs font-medium">Material Details</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">Type</div>
                  <div className="capitalize">{material.type}</div>

                  {(material.specs as any)?.widthMm && (
                    <>
                      <div className="text-muted-foreground">Width</div>
                      <div className="font-mono">
                        {(material.specs as any).widthMm}mm
                      </div>
                    </>
                  )}

                  {(material.specs as any)?.pricePerM2 && (
                    <>
                      <div className="text-muted-foreground">Price</div>
                      <div className="font-mono">
                        ${(material.specs as any).pricePerM2.toFixed(2)}/m²
                      </div>
                    </>
                  )}

                  {(material.specs as any)?.wastePercent && (
                    <>
                      <div className="text-muted-foreground">Waste Factor</div>
                      <div className="font-mono">
                        {(material.specs as any).wastePercent}%
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Transitions Tab */}
          <TabsContent value="transitions" className="mt-0">
            <EdgeTransitionsPanel
              room={room}
              allRooms={allRooms}
              scale={scale}
              materials={materials}
              onUpdateRoom={onUpdateRoom}
            />
          </TabsContent>

          {/* Accessories Tab */}
          <TabsContent value="accessories" className="mt-0">
            <AccessoriesPanel
              room={room}
              scale={scale}
              materials={materials}
              onUpdateAccessories={handleAccessoriesUpdate}
              stripPlan={stripPlan || undefined}
            />
          </TabsContent>

          {/* Seams Tab (Roll Materials Only) */}
          {isRollMaterial && (
            <TabsContent value="seams" className="mt-0">
              <SeamEditor
                room={room}
                scale={scale}
                stripPlan={stripPlan}
                fillDirection={room.fillDirection || 0}
                onFillDirectionChange={handleFillDirectionChange}
                manualSeams={room.seamOptions?.manualSeams || []}
                onManualSeamsChange={handleManualSeamsChange}
                avoidZones={room.seamOptions?.avoidZones || []}
                onAvoidZonesChange={handleAvoidZonesChange}
                firstSeamOffset={room.seamOptions?.firstSeamOffset || 0}
                onFirstSeamOffsetChange={handleFirstSeamOffsetChange}
                materialWidth={
                  (material?.specs as any)?.widthMm || 3660
                }
                onRecalculate={() => {}}
              />
            </TabsContent>
          )}

          {/* Pattern Tab (Tile Materials Only) */}
          {isTileMaterial && (
            <TabsContent value="pattern" className="p-3 mt-0">
              <TilePatternViewer
                room={room}
                tileSpecs={{
                  widthMm: (material?.specs as any)?.widthMm || 600,
                  lengthMm: (material?.specs as any)?.lengthMm || 600,
                  groutWidthMm: (material?.specs as any)?.groutWidthMm || 3,
                  pricePerM2: (material?.specs as any)?.pricePerM2 || 0,
                }}
                scale={scale}
                onPatternChange={handlePatternChange}
              />
            </TabsContent>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
