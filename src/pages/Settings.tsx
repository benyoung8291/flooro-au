import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile, useUserOrganization } from '@/hooks/useUserProfile';
import { useUpdateOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  ArrowLeft, 
  Building2, 
  Upload, 
  X, 
  Save,
  Loader2,
  User,
  Palette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: organization, isLoading: orgLoading } = useUserOrganization();
  const updateOrganization = useUpdateOrganization();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    termsAndConditions: '',
  });

  // Initialize form data when organization loads
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        address: organization.address || '',
        phone: (organization as any).phone || '',
        email: (organization as any).email || '',
        website: (organization as any).website || '',
        termsAndConditions: (organization as any).terms_and_conditions || '',
      });
      setLogoPreview(organization.logo_url || null);
    }
  }, [organization]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast({ 
        title: 'File too large', 
        description: 'Logo must be less than 500KB',
        variant: 'destructive'
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSave = async () => {
    if (!organization) return;

    setIsUploading(true);
    try {
      let logoUrl = organization.logo_url;

      // Upload logo if a new file was selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${organization.id}/logo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('floor_plan_images')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('floor_plan_images')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      } else if (logoPreview === null && organization.logo_url) {
        // Logo was removed
        logoUrl = null;
      }

      await updateOrganization.mutateAsync({
        id: organization.id,
        updates: {
          name: formData.name,
          address: formData.address || null,
          logo_url: logoUrl,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          terms_and_conditions: formData.termsAndConditions || null,
        },
      });

      toast({ title: 'Settings saved successfully' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to save settings', 
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (profileLoading || orgLoading) {
    return <SettingsSkeleton />;
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No organization found</h2>
          <p className="text-muted-foreground mb-4">Please complete onboarding first.</p>
          <Button onClick={() => navigate('/onboarding')}>
            Go to Onboarding
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={handleSave} disabled={isUploading || updateOrganization.isPending}>
              {(isUploading || updateOrganization.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList>
            <TabsTrigger value="company">
              <Building2 className="w-4 h-4 mr-2" />
              Company
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-6">
            {/* Company Branding */}
            <Card>
              <CardHeader>
                <CardTitle>Company Branding</CardTitle>
                <CardDescription>
                  This information will appear on your PDF reports and proposals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="flex items-start gap-6">
                  <div 
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0"
                  >
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Company logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Company Logo</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG or JPG, max 500KB. Recommended size: 200x200px
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </Button>
                      {logoPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                <Separator />

                {/* Company Details */}
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your Company LLC"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-email">Email</Label>
                      <Input
                        id="company-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="info@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">Phone</Label>
                      <Input
                        id="company-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-website">Website</Label>
                    <Input
                      id="company-website"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="www.company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-address">Address</Label>
                    <Input
                      id="company-address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Business Ave, Suite 100, City, State 12345"
                    />
                  </div>
                </div>

                <Separator />

                {/* Terms & Conditions */}
                <div className="space-y-2">
                  <Label htmlFor="terms">Default Terms & Conditions</Label>
                  <p className="text-xs text-muted-foreground">
                    These will appear at the bottom of your PDF proposals
                  </p>
                  <Textarea
                    id="terms"
                    value={formData.termsAndConditions}
                    onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                    placeholder="Payment terms, warranty information, installation notes..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  Manage your personal account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={profile?.full_name || ''} placeholder="Your name" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how Flooro looks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark mode
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card h-16 flex items-center px-4">
        <Skeleton className="h-9 w-9 mr-3" />
        <Skeleton className="h-6 w-32" />
        <div className="ml-auto">
          <Skeleton className="h-9 w-32" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-96 rounded-lg" />
      </main>
    </div>
  );
}