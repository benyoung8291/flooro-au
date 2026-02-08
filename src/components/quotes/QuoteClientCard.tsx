import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Mail, Phone, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichTextEditor } from './RichTextEditor';
import type { UpdateQuoteInput } from '@/hooks/useQuotes';

interface QuoteClientCardProps {
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  title: string | null;
  description: string | null;
  onUpdate: (updates: UpdateQuoteInput) => void;
}

export function QuoteClientCard({
  clientName,
  clientEmail,
  clientPhone,
  clientAddress,
  title,
  description,
  onUpdate,
}: QuoteClientCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Build compact preview text
  const previewParts = [clientName, clientEmail, clientPhone, clientAddress].filter(Boolean);
  const previewText = previewParts.length > 0 ? previewParts.join(' · ') : 'No client details';

  return (
    <div className="space-y-4">
      {/* Title — always visible, inline-editable like Google Docs */}
      <input
        value={title || ''}
        onChange={(e) => onUpdate({ title: e.target.value || null })}
        placeholder="Untitled Quote"
        className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 focus:placeholder:text-muted-foreground/60"
      />

      {/* Description — Rich text editor with formatting */}
      <RichTextEditor
        value={description}
        onChange={(html) => onUpdate({ description: html })}
        placeholder="Add a scope or description..."
      />

      {/* Client details — collapsible */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={cn(
            'text-sm truncate flex-1',
            previewParts.length === 0 ? 'text-muted-foreground/50 italic' : 'text-foreground'
          )}>
            {previewText}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 pl-9">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Client Name
              </Label>
              <Input
                value={clientName || ''}
                onChange={(e) => onUpdate({ client_name: e.target.value || null })}
                placeholder="Client name"
                className="h-9 text-sm border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:ring-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </Label>
              <Input
                type="email"
                value={clientEmail || ''}
                onChange={(e) => onUpdate({ client_email: e.target.value || null })}
                placeholder="client@example.com"
                className="h-9 text-sm border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:ring-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input
                value={clientPhone || ''}
                onChange={(e) => onUpdate({ client_phone: e.target.value || null })}
                placeholder="Phone number"
                className="h-9 text-sm border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:ring-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Site Address
              </Label>
              <Input
                value={clientAddress || ''}
                onChange={(e) => onUpdate({ client_address: e.target.value || null })}
                placeholder="Site / delivery address"
                className="h-9 text-sm border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:ring-1"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
