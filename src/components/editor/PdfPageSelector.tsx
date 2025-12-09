import { useState } from 'react';
import { FileText, Check, Star, Ruler, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PdfPage {
  pageNumber: number;
  hasFloorPlan: boolean;
  description: string;
  qualityRating: number;
  drawingType: string;
  roomCount: number;
  dimensions?: string[];
  scale?: string | null;
  features: string[];
}

interface PdfAnalysis {
  totalPages: number;
  pages: PdfPage[];
  recommendedPage: number;
  overallScale: string | null;
  units: string;
}

interface PdfPageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: PdfAnalysis;
  pdfUrl: string;
  onSelectPage: (pageNumber: number, analysis: PdfAnalysis) => void;
  isProcessing?: boolean;
}

export function PdfPageSelector({ 
  isOpen, 
  onClose, 
  analysis, 
  pdfUrl,
  onSelectPage,
  isProcessing 
}: PdfPageSelectorProps) {
  const [selectedPage, setSelectedPage] = useState<number>(analysis.recommendedPage);

  const getQualityColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-amber-500';
    return 'text-red-500';
  };

  const getQualityLabel = (rating: number) => {
    if (rating >= 4) return 'High Quality';
    if (rating >= 3) return 'Good Quality';
    if (rating >= 2) return 'Fair Quality';
    return 'Low Quality';
  };

  const handleConfirm = () => {
    onSelectPage(selectedPage, analysis);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Select Floor Plan Page
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Pages:</span>{' '}
              <span className="font-medium">{analysis.totalPages}</span>
            </div>
            {analysis.overallScale && (
              <div>
                <span className="text-muted-foreground">Scale:</span>{' '}
                <span className="font-medium">{analysis.overallScale}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Units:</span>{' '}
              <span className="font-medium capitalize">{analysis.units}</span>
            </div>
          </div>

          {/* Page list */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {analysis.pages.map((page) => (
                <button
                  key={page.pageNumber}
                  onClick={() => setSelectedPage(page.pageNumber)}
                  className={`
                    w-full p-3 rounded-lg border text-left transition-all
                    ${selectedPage === page.pageNumber 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                    ${!page.hasFloorPlan ? 'opacity-60' : ''}
                  `}
                  disabled={isProcessing}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Page {page.pageNumber}</span>
                        {page.pageNumber === analysis.recommendedPage && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="w-3 h-3" />
                            Recommended
                          </Badge>
                        )}
                        {page.hasFloorPlan && (
                          <Badge variant="outline" className="text-xs">
                            Floor Plan
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {page.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={getQualityColor(page.qualityRating)}>
                          {getQualityLabel(page.qualityRating)}
                        </span>
                        {page.roomCount > 0 && (
                          <span className="text-muted-foreground">
                            ~{page.roomCount} rooms
                          </span>
                        )}
                        {page.scale && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Ruler className="w-3 h-3" />
                            {page.scale}
                          </span>
                        )}
                      </div>
                      {page.dimensions && page.dimensions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {page.dimensions.slice(0, 5).map((dim, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-mono">
                              {dim}
                            </Badge>
                          ))}
                          {page.dimensions.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{page.dimensions.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${selectedPage === page.pageNumber 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-muted-foreground/30'
                      }
                    `}>
                      {selectedPage === page.pageNumber && (
                        <Check className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Use Page {selectedPage}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
