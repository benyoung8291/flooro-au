import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin } from 'lucide-react';
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Client & Project Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Title */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Quote Title</Label>
            <Input
              value={title || ''}
              onChange={(e) => onUpdate({ title: e.target.value || null })}
              placeholder="e.g. Flooring Quote — Level 2 Office"
              className="h-8 text-sm"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Scope / Description</Label>
            <Input
              value={description || ''}
              onChange={(e) => onUpdate({ description: e.target.value || null })}
              placeholder="Brief scope of works..."
              className="h-8 text-sm"
            />
          </div>

          {/* Client name */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Client Name
            </Label>
            <Input
              value={clientName || ''}
              onChange={(e) => onUpdate({ client_name: e.target.value || null })}
              placeholder="Client name"
              className="h-8 text-sm"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </Label>
            <Input
              type="email"
              value={clientEmail || ''}
              onChange={(e) => onUpdate({ client_email: e.target.value || null })}
              placeholder="client@example.com"
              className="h-8 text-sm"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </Label>
            <Input
              value={clientPhone || ''}
              onChange={(e) => onUpdate({ client_phone: e.target.value || null })}
              placeholder="Phone number"
              className="h-8 text-sm"
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Site Address
            </Label>
            <Input
              value={clientAddress || ''}
              onChange={(e) => onUpdate({ client_address: e.target.value || null })}
              placeholder="Site / delivery address"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
