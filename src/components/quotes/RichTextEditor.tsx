import { useRef, useCallback, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string | null;
  onChange: (html: string | null) => void;
  placeholder?: string;
  className?: string;
}

const TOOLBAR_BUTTONS = [
  { command: 'bold', icon: Bold, title: 'Bold (Ctrl+B)' },
  { command: 'italic', icon: Italic, title: 'Italic (Ctrl+I)' },
  { command: 'underline', icon: Underline, title: 'Underline (Ctrl+U)' },
  { command: 'insertUnorderedList', icon: List, title: 'Bullet list' },
  { command: 'insertOrderedList', icon: ListOrdered, title: 'Numbered list' },
] as const;

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add a scope or description...',
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isInternalChange = useRef(false);

  // Sync external value changes into the editor
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const current = editorRef.current.innerHTML;
      const incoming = value || '';
      if (current !== incoming) {
        editorRef.current.innerHTML = incoming;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      // Treat empty/whitespace-only as null
      const cleaned = html.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/gi, '').trim();
      onChange(cleaned.length > 0 ? html : null);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const isEmpty = !value || value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, '').trim().length === 0;

  return (
    <div className={cn('relative group', className)}>
      {/* Toolbar — visible on focus */}
      <div
        className={cn(
          'flex items-center gap-0.5 mb-1.5 transition-all',
          isFocused ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
        )}
      >
        {TOOLBAR_BUTTONS.map(({ command, icon: Icon, title }) => (
          <button
            key={command}
            type="button"
            title={title}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent focus loss
              execCommand(command);
            }}
            className={cn(
              'p-1.5 rounded-md text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="relative">
        {isEmpty && !isFocused && (
          <div className="absolute inset-0 pointer-events-none text-sm text-muted-foreground/30 px-0.5">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'min-h-[1.5em] text-sm text-muted-foreground outline-none transition-colors',
            'focus:text-foreground',
            // Rich text styling
            '[&_b]:font-semibold [&_strong]:font-semibold',
            '[&_i]:italic [&_em]:italic',
            '[&_u]:underline',
            '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1',
            '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1',
            '[&_li]:my-0.5'
          )}
          dangerouslySetInnerHTML={{ __html: value || '' }}
        />
      </div>
    </div>
  );
}
