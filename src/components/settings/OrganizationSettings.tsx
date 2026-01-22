import { useState, useEffect } from 'react';
import { useUserOrganization, useHasRole } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2 } from 'lucide-react';

export function OrganizationSettings() {
  const { toast } = useToast();
  const { data: organization, refetch } = useUserOrganization();
  const isAdmin = useHasRole('admin');
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (organization) {
      setName(organization.name || '');
      setAddress(organization.address || '');
      setPhone(organization.phone || '');
      setEmail(organization.email || '');
      setWebsite(organization.website || '');
    }
  }, [organization]);

  const handleSave = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          name,
          address,
          phone,
          email,
          website,
        })
        .eq('id', organization.id);

      if (error) throw error;
      
      await refetch();
      toast({ title: 'Organization updated', description: 'Your organization settings have been saved.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Settings
        </CardTitle>
        <CardDescription>
          Manage your organization's profile and details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Organization Name</Label>
          <Input
            id="orgName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your company name"
            disabled={!isAdmin}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="orgAddress">Address</Label>
          <Textarea
            id="orgAddress"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Business address"
            disabled={!isAdmin}
            rows={2}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="orgPhone">Phone</Label>
            <Input
              id="orgPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              disabled={!isAdmin}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgEmail">Email</Label>
            <Input
              id="orgEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@company.com"
              disabled={!isAdmin}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="orgWebsite">Website</Label>
          <Input
            id="orgWebsite"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://company.com"
            disabled={!isAdmin}
          />
        </div>
        
        {isAdmin ? (
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only organization admins can edit these settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
