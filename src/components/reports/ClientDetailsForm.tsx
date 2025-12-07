import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface ClientDetails {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  notes: string;
}

interface ClientDetailsFormProps {
  value: ClientDetails;
  onChange: (value: ClientDetails) => void;
}

export function ClientDetailsForm({ value, onChange }: ClientDetailsFormProps) {
  const handleChange = (field: keyof ClientDetails, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="clientName" className="text-xs">Client Name</Label>
          <Input
            id="clientName"
            placeholder="John Smith"
            value={value.clientName}
            onChange={(e) => handleChange('clientName', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientEmail" className="text-xs">Email</Label>
          <Input
            id="clientEmail"
            type="email"
            placeholder="john@example.com"
            value={value.clientEmail}
            onChange={(e) => handleChange('clientEmail', e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="clientPhone" className="text-xs">Phone</Label>
          <Input
            id="clientPhone"
            placeholder="(555) 123-4567"
            value={value.clientPhone}
            onChange={(e) => handleChange('clientPhone', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientAddress" className="text-xs">Address</Label>
          <Input
            id="clientAddress"
            placeholder="123 Main St, City"
            value={value.clientAddress}
            onChange={(e) => handleChange('clientAddress', e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs">Additional Notes</Label>
        <Textarea
          id="notes"
          placeholder="Special instructions, delivery notes, etc."
          value={value.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
}