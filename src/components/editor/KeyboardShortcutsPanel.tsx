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
      { key: 'V / 1', description: 'Select tool' },
      { key: 'D / 2', description: 'Draw room' },
      { key: 'R / 3', description: 'Rectangle room' },
      { key: 'H / 4', description: 'Cut hole' },
      { key: 'O / 5', description: 'Add door' },
      { key: 'T / 6', description: 'Transition' },
      { key: 'S / 7', description: 'Set scale' },
      { key: 'Tab', description: 'Cycle tools' },
      { key: 'Shift', description: 'Ortho-lock / Batch mode' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { key: 'Ctrl+Z', description: 'Undo' },
      { key: 'Ctrl+Shift+Z', description: 'Redo' },
      { key: 'Ctrl+S', description: 'Save project' },
      { key: 'Delete', description: 'Delete selected' },
      { key: 'M', description: 'Merge rooms' },
      { key: 'X', description: 'Split room' },
      { key: 'L', description: 'Toggle dimension input' },
      { key: '0-9 .', description: 'Type to set length' },
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
                    <span className="text-foreground">{shortcut.description}</span>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border border-border rounded whitespace-nowrap">
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
