import { useState } from 'react';
import { Plus, MoreHorizontal, FileText, Trash2, Edit2, Copy, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FloorPlanPage } from '@/lib/canvas/types';
import { cn } from '@/lib/utils';

interface PageTabsProps {
  pages: FloorPlanPage[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onRenamePage: (pageId: string, newName: string) => void;
  onDeletePage: (pageId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onReorderPages: (pageIds: string[]) => void;
}

export function PageTabs({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onDuplicatePage,
  onReorderPages,
}: PageTabsProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);

  const handleStartRename = (page: FloorPlanPage) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleFinishRename = () => {
    if (editingPageId && editingName.trim()) {
      onRenamePage(editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setEditingPageId(null);
      setEditingName('');
    }
  };

  const confirmDelete = () => {
    if (deletePageId) {
      onDeletePage(deletePageId);
      setDeletePageId(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pageId);
  };

  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    if (draggedPageId && draggedPageId !== pageId) {
      setDragOverPageId(pageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPageId(null);
  };

  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    if (!draggedPageId || draggedPageId === targetPageId) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    const sortedPages = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);
    const draggedIndex = sortedPages.findIndex(p => p.id === draggedPageId);
    const targetIndex = sortedPages.findIndex(p => p.id === targetPageId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    // Reorder the array
    const reordered = [...sortedPages];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Return new order as array of IDs
    onReorderPages(reordered.map(p => p.id));

    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  const handleDragEnd = () => {
    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  // Always show the tab bar to allow adding pages (even with 0 or 1 page)
  const showTabs = pages.length > 1;
  const sortedPages = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm border-b border-border px-2 py-1">
        {showTabs && (
          <ScrollArea className="flex-1">
            <div className="flex items-center gap-1">
              {sortedPages.map((page) => (
                <div
                  key={page.id}
                  draggable={editingPageId !== page.id}
                  onDragStart={(e) => handleDragStart(e, page.id)}
                  onDragOver={(e) => handleDragOver(e, page.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, page.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all cursor-pointer min-w-0',
                    activePageId === page.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    draggedPageId === page.id && 'opacity-50',
                    dragOverPageId === page.id && 'ring-2 ring-primary ring-offset-1'
                  )}
                  onClick={() => onSelectPage(page.id)}
                >
                  <GripVertical className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing" />
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  
                  {editingPageId === page.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={handleKeyDown}
                      className="h-5 w-24 text-xs px-1"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate max-w-[100px]">{page.name}</span>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem onClick={() => handleStartRename(page)}>
                        <Edit2 className="w-3.5 h-3.5 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicatePage(page.id)}>
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeletePageId(page.id)}
                        disabled={pages.length <= 1}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-muted-foreground hover:text-foreground",
            !showTabs && "ml-auto"
          )}
          onClick={onAddPage}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">Add Page</span>
        </Button>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete floor plan page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this page and all its rooms. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
