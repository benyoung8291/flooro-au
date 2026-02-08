import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { useDebouncedField } from '@/hooks/useDebouncedField';
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
  const titleField = useDebouncedField(title, useCallback((v: string | null) => onUpdate({ title: v }), [onUpdate]));
  const nameField = useDebouncedField(clientName, useCallback((v: string | null) => onUpdate({ client_name: v }), [onUpdate]));
  const emailField = useDebouncedField(clientEmail, useCallback((v: string | null) => onUpdate({ client_email: v }), [onUpdate]));
  const phoneField = useDebouncedField(clientPhone, useCallback((v: string | null) => onUpdate({ client_phone: v }), [onUpdate]));
  const addressField = useDebouncedField(clientAddress, useCallback((v: string | null) => onUpdate({ client_address: v }), [onUpdate]));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quote Title</Label>
        <input
          value={titleField.value}
          onChange={(e) => titleField.onChange(e.target.value)}
          onBlur={titleField.flush}
          placeholder="Untitled Quote"
          className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 focus:placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Scope / Description */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Scope / Description</Label>
        <RichTextEditor
          value={description}
          onChange={(html) => onUpdate({ description: html })}
          placeholder="Add a scope or description..."
        />
      </div>

      {/* Client details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Client Name
              </Label>
              <Input
                value={nameField.value}
                onChange={(e) => nameField.onChange(e.target.value)}
                onBlur={nameField.flush}
                placeholder="Client name"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </Label>
              <Input
                type="email"
                value={emailField.value}
                onChange={(e) => emailField.onChange(e.target.value)}
                onBlur={emailField.flush}
                placeholder="client@example.com"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input
                value={phoneField.value}
                onChange={(e) => phoneField.onChange(e.target.value)}
                onBlur={phoneField.flush}
                placeholder="Phone number"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Site Address
              </Label>
              <Input
                value={addressField.value}
                onChange={(e) => addressField.onChange(e.target.value)}
                onBlur={addressField.flush}
                placeholder="Site / delivery address"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
