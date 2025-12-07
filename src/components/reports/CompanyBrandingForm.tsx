import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Building2, Upload, X } from 'lucide-react';
import { useRef } from 'react';

export interface CompanyBranding {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyWebsite: string;
  logoUrl: string | null;
  termsAndConditions: string;
}

interface CompanyBrandingFormProps {
  value: CompanyBranding;
  onChange: (value: CompanyBranding) => void;
}

export function CompanyBrandingForm({ value, onChange }: CompanyBrandingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof CompanyBranding, fieldValue: string | null) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for PDF embedding
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleChange('logoUrl', base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Logo Upload */}
      <div className="flex items-start gap-4">
        <div 
          className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0"
        >
          {value.logoUrl ? (
            <img 
              src={value.logoUrl} 
              alt="Company logo" 
              className="w-full h-full object-contain"
            />
          ) : (
            <Building2 className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Label className="text-xs">Company Logo</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
            {value.logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleChange('logoUrl', null)}
              >
                <X className="w-3 h-3 mr-1" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">PNG or JPG, max 500KB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Company Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="companyName" className="text-xs">Company Name</Label>
          <Input
            id="companyName"
            placeholder="Your Company LLC"
            value={value.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companyEmail" className="text-xs">Email</Label>
          <Input
            id="companyEmail"
            type="email"
            placeholder="info@company.com"
            value={value.companyEmail}
            onChange={(e) => handleChange('companyEmail', e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="companyPhone" className="text-xs">Phone</Label>
          <Input
            id="companyPhone"
            placeholder="(555) 000-0000"
            value={value.companyPhone}
            onChange={(e) => handleChange('companyPhone', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companyWebsite" className="text-xs">Website</Label>
          <Input
            id="companyWebsite"
            placeholder="www.company.com"
            value={value.companyWebsite}
            onChange={(e) => handleChange('companyWebsite', e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="companyAddress" className="text-xs">Address</Label>
        <Input
          id="companyAddress"
          placeholder="123 Business Ave, Suite 100, City, State 12345"
          value={value.companyAddress}
          onChange={(e) => handleChange('companyAddress', e.target.value)}
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="terms" className="text-xs">Terms & Conditions</Label>
        <Textarea
          id="terms"
          placeholder="Payment terms, warranty information, installation notes..."
          value={value.termsAndConditions}
          onChange={(e) => handleChange('termsAndConditions', e.target.value)}
          rows={2}
          className="resize-none text-xs"
        />
      </div>
    </div>
  );
}