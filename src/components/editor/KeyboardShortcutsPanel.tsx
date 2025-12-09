import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutCategory {
  title: string;
  shortcuts: { key: string; description: string }[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Drawing Tools',
    shortcuts: [
      { key: 'V', description: 'Select tool' },
      { key: 'D', description: 'Draw room' },
      { key: 'H', description: 'Cut hole' },
      { key: 'O', description: 'Add door' },
      { key: 'S', description: 'Scale tool' },
      { key: 'Shift', description: 'Ortho-lock (while drawing)' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { key: 'Ctrl+Z', description: 'Undo' },
      { key: 'Ctrl+Shift+Z', description: 'Redo' },
      { key: 'Ctrl+S', description: 'Save project' },
      { key: 'Delete', description: 'Delete selected' },
      { key: 'R', description: 'Rotate fill direction (45°)' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'Space', description: 'Pan tool (hold)' },
      { key: 'Scroll', description: 'Zoom in/out' },
      { key: '[', description: 'Previous room' },
      { key: ']', description: 'Next room' },
    ],
  },
  {
    title: 'View Controls',
    shortcuts: [
      { key: '2', description: '2D view' },
      { key: '3', description: '3D view' },
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
      <DialogContent className="max-w-lg">
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
                  <li key={shortcut.key} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{shortcut.description}</span>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border border-border rounded">
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
