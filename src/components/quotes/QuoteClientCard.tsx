import { useState } from 'react';
import { Save, FileText, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextEditor } from './RichTextEditor';
import { useDescriptionTemplates, useSaveDescriptionTemplate, useDeleteDescriptionTemplate } from '@/hooks/useDescriptionTemplates';
import { toast } from 'sonner';
import type { UpdateQuoteInput } from '@/hooks/useQuotes';

interface QuoteClientCardProps {
  description: string | null;
  onUpdate: (updates: UpdateQuoteInput) => void;
}

export function QuoteClientCard({
  description,
  onUpdate,
}: QuoteClientCardProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [loadPopoverOpen, setLoadPopoverOpen] = useState(false);

  const { data: templates = [], isLoading } = useDescriptionTemplates();
  const saveTemplate = useSaveDescriptionTemplate();
  const deleteTemplate = useDeleteDescriptionTemplate();

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    saveTemplate.mutate(
      { name: templateName.trim(), content: description },
      {
        onSuccess: () => {
          toast.success('Template saved');
          setTemplateName('');
          setSaveDialogOpen(false);
        },
        onError: () => toast.error('Failed to save template'),
      }
    );
  };

  const handleLoadTemplate = (content: string | null) => {
    onUpdate({ description: content });
    setLoadPopoverOpen(false);
    toast.success('Template loaded');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTemplate.mutate(id, {
      onSuccess: () => toast.success('Template deleted'),
      onError: () => toast.error('Failed to delete template'),
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Scope / Description</Label>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground gap-1"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="w-3 h-3" />
            Save as Template
          </Button>
          <Popover open={loadPopoverOpen} onOpenChange={setLoadPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground gap-1"
              >
                <FileText className="w-3 h-3" />
                Load Template
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              <div className="p-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground">Saved Templates</p>
              </div>
              <ScrollArea className="max-h-48">
                {isLoading ? (
                  <p className="p-3 text-xs text-muted-foreground">Loading…</p>
                ) : templates.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No templates saved yet</p>
                ) : (
                  <div className="p-1">
                    {templates.map((t: any) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleLoadTemplate(t.content)}
                        className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-left"
                      >
                        <span className="truncate mr-2">{t.name}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(t.id, e)}
                          className="shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="bg-white dark:bg-card rounded-lg border border-border/40 p-4">
        <RichTextEditor
          value={description}
          onChange={(html) => onUpdate({ description: html })}
          placeholder="Add a scope or description..."
        />
      </div>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Give this description template a name so you can reuse it later.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim() || saveTemplate.isPending}>
              {saveTemplate.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
