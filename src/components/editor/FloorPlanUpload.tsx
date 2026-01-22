import { useCallback, useState } from 'react';
import { Upload, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BackgroundImage } from '@/lib/canvas/types';
import { PdfPageSelector } from './PdfPageSelector';

interface PdfAnalysis {
  totalPages: number;
  pages: Array<{
    pageNumber: number;
    hasFloorPlan: boolean;
    description: string;
    qualityRating: number;
    drawingType: string;
    roomCount: number;
    dimensions?: string[];
    scale?: string | null;
    features: string[];
  }>;
  recommendedPage: number;
  overallScale: string | null;
  units: string;
}

interface FloorPlanUploadProps {
  projectId: string;
  onImageUploaded: (image: BackgroundImage, pdfAnalysis?: PdfAnalysis) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for PDFs
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_PDF_TYPES = ['application/pdf'];
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_PDF_TYPES];

export function FloorPlanUpload({ projectId, onImageUploaded }: FloorPlanUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [pdfAnalysis, setPdfAnalysis] = useState<PdfAnalysis | null>(null);
  const [pendingPdfUrl, setPendingPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;

    console.log('FloorPlanUpload: Uploading file to floor_plan_images bucket:', fileName);

    const { error: uploadError } = await supabase.storage
      .from('floor_plan_images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('FloorPlanUpload: Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('floor_plan_images')
      .getPublicUrl(fileName);

    console.log('FloorPlanUpload: Upload successful, public URL:', publicUrl);
    return publicUrl;
  };

  const analyzePdf = async (pdfUrl: string): Promise<PdfAnalysis> => {
    console.log('FloorPlanUpload: Starting PDF analysis for:', pdfUrl);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('PDF analysis timed out after 30 seconds')), 30000);
    });
    
    const analysisPromise = supabase.functions.invoke('parse-pdf', {
      body: { pdfUrl, extractDimensions: true }
    });

    // Race between analysis and timeout
    const { data, error } = await Promise.race([analysisPromise, timeoutPromise]);

    if (error) {
      console.error('FloorPlanUpload: PDF analysis error:', error);
      throw error;
    }
    if (!data.success) {
      console.error('FloorPlanUpload: PDF analysis failed:', data.error);
      throw new Error(data.error);
    }

    console.log('FloorPlanUpload: PDF analysis complete:', data.data);
    return data.data;
  };

  const handleFile = useCallback(async (file: File) => {
    const isPdf = ACCEPTED_PDF_TYPES.includes(file.type);
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);

    if (!isPdf && !isImage) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, WebP image, or PDF document.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 20MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    console.log('FloorPlanUpload: Processing file:', file.name, 'Type:', file.type);

    try {
      const publicUrl = await uploadFile(file);

      if (isPdf) {
        // Analyze PDF for multi-page handling
        setIsAnalyzingPdf(true);
        setPendingPdfUrl(publicUrl);
        
        try {
          const analysis = await analyzePdf(publicUrl);
          setPdfAnalysis(analysis);
          setIsUploading(false);
          // Keep dialog open for page selection
        } catch (analysisError: any) {
          console.error('FloorPlanUpload: PDF analysis failed, using fallback:', analysisError.message);
          // If analysis fails, still use the PDF as background
          const backgroundImage: BackgroundImage = {
            url: publicUrl,
            opacity: 0.5,
            scale: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            locked: true,
          };
          onImageUploaded(backgroundImage);
          setIsOpen(false);
          toast({ 
            title: 'PDF uploaded',
            description: analysisError.message.includes('timeout') 
              ? 'Analysis timed out. PDF loaded as background.' 
              : 'Could not analyze pages. Using as background.'
          });
        } finally {
          setIsAnalyzingPdf(false);
        }
      } else {
        // Handle image directly
        const backgroundImage: BackgroundImage = {
          url: publicUrl,
          opacity: 0.5,
          scale: 1,
          rotation: 0,
          offsetX: 0,
          offsetY: 0,
          locked: true, // Lock by default to keep rooms aligned
        };

        onImageUploaded(backgroundImage);
        setIsOpen(false);
        toast({ title: 'Floor plan uploaded!' });
      }
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  }, [projectId, onImageUploaded, toast]);

  const handlePdfPageSelect = useCallback((pageNumber: number, analysis: PdfAnalysis) => {
    if (!pendingPdfUrl) return;

    const backgroundImage: BackgroundImage = {
      url: pendingPdfUrl,
      opacity: 0.5,
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      locked: true, // Lock by default to keep rooms aligned
    };

    // Pass the analysis with dimensions to the parent
    onImageUploaded(backgroundImage, analysis);
    
    // Reset state
    setPdfAnalysis(null);
    setPendingPdfUrl(null);
    setIsOpen(false);
    
    const page = analysis.pages.find(p => p.pageNumber === pageNumber);
    const dimensionCount = page?.dimensions?.length || 0;
    
    toast({ 
      title: 'PDF imported successfully',
      description: dimensionCount > 0 
        ? `Page ${pageNumber} selected. ${dimensionCount} dimensions detected.`
        : `Page ${pageNumber} selected.`
    });
  }, [pendingPdfUrl, onImageUploaded, toast]);

  const handleClosePdfSelector = useCallback(() => {
    setPdfAnalysis(null);
    setPendingPdfUrl(null);
  }, []);

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Upload Floor Plan
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Floor Plan</DialogTitle>
          </DialogHeader>
          
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 
              transition-colors duration-200 text-center
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${isUploading || isAnalyzingPdf ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('floor-plan-input')?.click()}
          >
            <input
              id="floor-plan-input"
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              onChange={handleFileInput}
              className="hidden"
            />
            
            {isUploading || isAnalyzingPdf ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {isAnalyzingPdf ? 'Analyzing PDF pages...' : 'Uploading...'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Drag & drop your floor plan here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>JPG, PNG, WebP</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF (multi-page)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Max 20MB
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Page Selector */}
      {pdfAnalysis && pendingPdfUrl && (
        <PdfPageSelector
          isOpen={true}
          onClose={handleClosePdfSelector}
          analysis={pdfAnalysis}
          pdfUrl={pendingPdfUrl}
          onSelectPage={handlePdfPageSelect}
        />
      )}
    </>
  );
}