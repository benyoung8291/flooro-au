import { useState, useCallback } from 'react';
import { 
  Wand2, 
  Upload, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Room, BackgroundImage, ScaleCalibration, Door } from '@/lib/canvas/types';

interface DetectedRoom {
  name: string;
  points: Array<{ x: number; y: number }>;
  doors: Array<{
    position: { x: number; y: number };
    width: number;
    wallIndex: number;
  }>;
  selected?: boolean;
}

interface DetectedScale {
  pixelLength: number;
  realWorldLengthMm: number;
  label?: string;
}

interface AutoTakeoffResult {
  rooms: DetectedRoom[];
  scale?: DetectedScale;
  confidence: number;
  notes: string[];
}

interface AutoTakeoffDialogProps {
  projectId: string;
  onRoomsDetected: (rooms: Room[], scale?: ScaleCalibration, backgroundImage?: BackgroundImage) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const DEFAULT_ROOM_COLORS = [
  'hsla(217, 91%, 50%, 0.15)',
  'hsla(142, 71%, 45%, 0.15)',
  'hsla(280, 65%, 60%, 0.15)',
  'hsla(25, 95%, 53%, 0.15)',
  'hsla(340, 75%, 55%, 0.15)',
  'hsla(180, 60%, 45%, 0.15)',
];

export function AutoTakeoffDialog({ projectId, onRoomsDetected }: AutoTakeoffDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AutoTakeoffResult | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<Set<number>>(new Set());
  const [editedNames, setEditedNames] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setStep('upload');
    setIsUploading(false);
    setIsProcessing(false);
    setUploadedImageUrl(null);
    setResult(null);
    setSelectedRooms(new Set());
    setEditedNames(new Map());
    setError(null);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/auto-takeoff-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('floor_plan_images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('floor_plan_images')
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);
      setStep('processing');
      setIsUploading(false);
      
      // Start AI processing
      await processImage(publicUrl);
    } catch (error: any) {
      setIsUploading(false);
      setError(error.message || 'Upload failed');
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [projectId, toast]);

  const processImage = async (imageUrl: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('auto-takeoff', {
        body: { imageUrl }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const resultData = data as AutoTakeoffResult;
      setResult(resultData);
      // Select all rooms by default
      setSelectedRooms(new Set(resultData.rooms.map((_: unknown, i: number) => i)));
      setStep('review');
      
      // Show info about detection
      if (resultData.rooms.length === 0) {
        toast({
          title: 'No rooms detected',
          description: 'The AI could not identify any valid rooms in this floor plan. Try a clearer image.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setError(error.message || 'AI processing failed');
      toast({
        title: 'AI analysis failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const toggleRoom = (index: number) => {
    setSelectedRooms(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const updateRoomName = (index: number, name: string) => {
    setEditedNames(prev => new Map(prev).set(index, name));
  };

  const handleApply = () => {
    if (!result) return;

    const rooms: Room[] = result.rooms
      .filter((_, index) => selectedRooms.has(index))
      .map((detected, index) => {
        const actualIndex = Array.from(selectedRooms).sort((a, b) => a - b).indexOf(
          Array.from(selectedRooms).filter(i => i <= result.rooms.indexOf(detected)).pop()!
        );
        
        return {
          id: crypto.randomUUID(),
          name: editedNames.get(result.rooms.indexOf(detected)) || detected.name,
          points: detected.points,
          holes: [],
          doors: detected.doors.map(d => ({
            id: crypto.randomUUID(),
            position: d.position,
            width: d.width,
            wallIndex: d.wallIndex,
            rotation: 0,
          })) as Door[],
          materialId: null,
          color: DEFAULT_ROOM_COLORS[actualIndex % DEFAULT_ROOM_COLORS.length],
        };
      });

    let scale: ScaleCalibration | undefined;
    if (result.scale) {
      scale = {
        pixelLength: result.scale.pixelLength,
        realWorldLength: result.scale.realWorldLengthMm,
        pixelsPerMm: result.scale.pixelLength / result.scale.realWorldLengthMm,
      };
    }

    let backgroundImage: BackgroundImage | undefined;
    if (uploadedImageUrl) {
      backgroundImage = {
        url: uploadedImageUrl,
        opacity: 0.5,
        scale: 1,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        locked: true, // Always lock floor plan by default to keep rooms aligned
      };
    }

    onRoomsDetected(rooms, scale, backgroundImage);
    setIsOpen(false);
    reset();

    toast({
      title: 'Rooms imported!',
      description: `${rooms.length} rooms added to your project.`,
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (confidence >= 0.5) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
    return 'bg-red-500/10 text-red-700 dark:text-red-400';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) reset();
    }}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <Wand2 className="w-4 h-4" />
          AI Auto-Takeoff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Auto-Takeoff
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a floor plan image and let AI detect room boundaries automatically.'}
            {step === 'processing' && 'Analyzing your floor plan...'}
            {step === 'review' && 'Review detected rooms and select which ones to import.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Upload Step */}
          {step === 'upload' && (
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-8 
                transition-colors duration-200 text-center
                ${isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
                ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('auto-takeoff-input')?.click()}
            >
              <input
                id="auto-takeoff-input"
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileInput}
                className="hidden"
              />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Drag & drop your floor plan here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports JPG, PNG, WebP (max 10MB)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              {uploadedImageUrl && (
                <div className="relative w-48 h-48 rounded-lg overflow-hidden border border-border">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Floor plan" 
                    className="w-full h-full object-cover"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-xs text-muted-foreground">Detecting rooms...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {error && (
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && result && (
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Confidence and Notes */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={getConfidenceColor(result.confidence)}>
                  {Math.round(result.confidence * 100)}% confidence
                </Badge>
                {result.scale && (
                  <Badge variant="secondary">
                    Scale detected: {result.scale.label || `${result.scale.realWorldLengthMm}mm`}
                  </Badge>
                )}
                <Badge variant="outline">
                  {result.rooms.length} rooms found
                </Badge>
              </div>

              {result.notes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {result.notes.join(' • ')}
                </p>
              )}

              {/* Preview and Room List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
                {/* Image Preview */}
                {uploadedImageUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30 h-64">
                    <img 
                      src={uploadedImageUrl} 
                      alt="Floor plan" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Room List */}
                <ScrollArea className="h-64 rounded-lg border border-border">
                  <div className="p-3 space-y-2">
                    {result.rooms.map((room, index) => (
                      <div 
                        key={index}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border transition-colors
                          ${selectedRooms.has(index) 
                            ? 'border-primary/50 bg-primary/5' 
                            : 'border-border bg-card hover:bg-muted/50'
                          }
                        `}
                      >
                        <Checkbox
                          checked={selectedRooms.has(index)}
                          onCheckedChange={() => toggleRoom(index)}
                        />
                        <div 
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: DEFAULT_ROOM_COLORS[index % DEFAULT_ROOM_COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <Input
                            value={editedNames.get(index) ?? room.name}
                            onChange={(e) => updateRoomName(index, e.target.value)}
                            className="h-7 text-sm"
                            placeholder="Room name"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                          <span>{room.points.length} vertices</span>
                          {room.doors.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {room.doors.length} door{room.doors.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              <Button 
                onClick={handleApply} 
                disabled={selectedRooms.size === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Import {selectedRooms.size} Room{selectedRooms.size !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
