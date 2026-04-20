import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShortcutCategory {
  title: string;
  shortcuts: { key: string; description: string; isNew?: boolean }[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Drawing Tools',
    shortcuts: [
      { key: 'V', description: 'Select tool' },
      { key: 'D', description: 'Draw room (polyline)' },
      { key: 'R', description: 'Rectangle room' },
      { key: 'H', description: 'Cut hole' },
      { key: 'O', description: 'Add door' },
      { key: 'T', description: 'Add transition' },
      { key: 'S', description: 'Set scale' },
      { key: 'Shift', description: 'Ortho-lock while drawing' },
      { key: 'A', description: 'Toggle 90°/45° right-angle lock', isNew: true },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { key: 'Ctrl+Z', description: 'Undo' },
      { key: 'Ctrl+Shift+Z', description: 'Redo' },
      { key: 'Ctrl+S', description: 'Save project' },
      { key: 'Delete', description: 'Delete selected room' },
      { key: 'M', description: 'Merge rooms' },
      { key: 'X', description: 'Split room' },
      { key: 'Click label', description: 'Edit edge length inline', isNew: true },
      { key: '0-9 .', description: 'Type to set length while drawing' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'Space', description: 'Pan tool (hold)' },
      { key: 'Scroll', description: 'Zoom in/out' },
      { key: 'G', description: 'Toggle grid snap' },
      { key: 'Alt', description: 'Hold to disable snap' },
      { key: 'Esc', description: 'Cancel current action' },
      { key: '[', description: 'Previous room' },
      { key: ']', description: 'Next room' },
      { key: 'L', description: 'All Rooms overview' },
    ],
  },
  {
    title: 'View & Quotes',
    shortcuts: [
      { key: '2', description: '2D view' },
      { key: '3', description: '3D view' },
      { key: 'Q', description: 'Open / view linked quote' },
      { key: '?', description: 'Show shortcuts' },
    ],
  },
];

interface KeyboardShortcutsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsPanel({ open, onOpenChange }: KeyboardShortcutsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          {shortcutCategories.map((category) => (
            <div key={category.title}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {category.title}
              </h3>
              <ul className="space-y-1.5">
                {category.shortcuts.map((shortcut) => (
                  <li key={shortcut.key} className="flex items-center justify-between text-sm gap-3">
                    <span className="text-foreground flex items-center gap-1.5">
                      {shortcut.description}
                      {shortcut.isNew && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          NEW
                        </Badge>
                      )}
                    </span>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border border-border rounded whitespace-nowrap shrink-0">
                      {shortcut.key}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">?</kbd> anytime to show this panel
        </p>
      </DialogContent>
    </Dialog>
  );
}
