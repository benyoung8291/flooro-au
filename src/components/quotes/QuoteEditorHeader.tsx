import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { useDebouncedField } from '@/hooks/useDebouncedField';
import type { UpdateQuoteInput } from '@/hooks/useQuotes';

interface QuoteEditorHeaderProps {
  quote: {
    title: string | null;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    client_address: string | null;
  };
  onUpdate: (updates: UpdateQuoteInput) => void;
}

export function QuoteEditorHeader({ quote, onUpdate }: QuoteEditorHeaderProps) {
  const titleField = useDebouncedField(
    quote.title,
    useCallback((v: string | null) => onUpdate({ title: v }), [onUpdate])
  );
  const nameField = useDebouncedField(
    quote.client_name,
    useCallback((v: string | null) => onUpdate({ client_name: v }), [onUpdate])
  );
  const emailField = useDebouncedField(
    quote.client_email,
    useCallback((v: string | null) => onUpdate({ client_email: v }), [onUpdate])
  );
  const phoneField = useDebouncedField(
    quote.client_phone,
    useCallback((v: string | null) => onUpdate({ client_phone: v }), [onUpdate])
  );
  const addressField = useDebouncedField(
    quote.client_address,
    useCallback((v: string | null) => onUpdate({ client_address: v }), [onUpdate])
  );

  return (
    <div className="space-y-3">
      {/* Editable title */}
      <input
        value={titleField.value}
        onChange={(e) => titleField.onChange(e.target.value)}
        onBlur={titleField.flush}
        placeholder="Untitled Quote"
        className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 focus:placeholder:text-muted-foreground/60"
      />

      {/* Client details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> Name
          </Label>
          <Input
            value={nameField.value}
            onChange={(e) => nameField.onChange(e.target.value)}
            onBlur={nameField.flush}
            placeholder="Client name"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Mail className="w-3 h-3" /> Email
          </Label>
          <Input
            type="email"
            value={emailField.value}
            onChange={(e) => emailField.onChange(e.target.value)}
            onBlur={emailField.flush}
            placeholder="client@example.com"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Phone className="w-3 h-3" /> Phone
          </Label>
          <Input
            value={phoneField.value}
            onChange={(e) => phoneField.onChange(e.target.value)}
            onBlur={phoneField.flush}
            placeholder="Phone number"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Site Address
          </Label>
          <Input
            value={addressField.value}
            onChange={(e) => addressField.onChange(e.target.value)}
            onBlur={addressField.flush}
            placeholder="Site / delivery address"
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
