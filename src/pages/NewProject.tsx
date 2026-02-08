import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, FileImage, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function NewProject() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload a PNG, JPG, WEBP, or PDF file.',
        variant: 'destructive' 
      });
      return;
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast({ 
        title: 'File too large', 
        description: 'Maximum file size is 20MB.',
        variant: 'destructive' 
      });
      return;
    }

    setUploadedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // PDF - just show file name
      setUploadPreview(null);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const removeFile = useCallback(() => {
    setUploadedFile(null);
    setUploadPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: 'Project name is required', variant: 'destructive' });
      return;
    }

    try {
      setIsUploading(true);

      // Create the project first
      const project = await createProject.mutateAsync({
        name: name.trim(),
        address: address.trim() || undefined,
      });

      // If there's an uploaded file, upload it to storage and set as background
      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop();
        const filePath = `${project.id}/floor-plan.${fileExt}`;

        console.log('Uploading floor plan to floor_plan_images bucket:', filePath);
        
        const { error: uploadError } = await supabase.storage
          .from('floor_plan_images')
          .upload(filePath, uploadedFile, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          // Continue anyway - project is created, just floor plan wasn't uploaded
          toast({ 
            title: 'Floor plan upload failed', 
            description: 'Project created but floor plan could not be uploaded. You can upload it later.',
            variant: 'default' 
          });
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('floor_plan_images')
            .getPublicUrl(filePath);

          console.log('Floor plan uploaded, public URL:', urlData?.publicUrl);

          // Update project with floor plan URL and multi-page json_data format
          if (urlData?.publicUrl) {
            const pageId = crypto.randomUUID();
            await supabase
              .from('projects')
              .update({
                floor_plan_url: urlData.publicUrl,
                json_data: {
                  pages: [{
                    id: pageId,
                    name: 'Level 1',
                    rooms: [],
                    scale: null,
                    backgroundImage: {
                      url: urlData.publicUrl,
                      opacity: 0.5,
                      scale: 1,
                      rotation: 0,
                      offsetX: 0,
                      offsetY: 0,
                      locked: true,
                    },
                  }],
                  activePageId: pageId,
                  selectedRoomId: null,
                },
              })
              .eq('id', project.id);
          }
        }
      }

      toast({ title: 'Project created!' });
      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      toast({ title: 'Failed to create project', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src="/favicon.png" alt="Flooro" className="w-8 h-8" />
          <h1 className="font-semibold text-foreground">New Project</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Enter the basic information for your flooring project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Smith Residence - Kitchen Renovation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Project Address</Label>
                <Input
                  id="address"
                  placeholder="e.g., 123 Main Street, City, State 12345"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this project..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Floor Plan Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Floor Plan (Optional)</CardTitle>
              <CardDescription>
                Upload a floor plan image or PDF to trace over.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {uploadedFile ? (
                <div className="relative border-2 border-primary/30 bg-primary/5 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {uploadPreview ? (
                      <img
                        src={uploadPreview}
                        alt="Floor plan preview"
                        className="w-24 h-24 object-cover rounded-lg border border-border"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm text-foreground">File ready</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 sm:p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <FileImage className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Drop your floor plan here
                  </p>
                  <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                    Supports PDF, PNG, JPG up to 20MB
                  </p>
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:py-0 sm:mx-0 sm:px-0 border-t sm:border-t-0 border-border safe-area-bottom">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending || isUploading || !name.trim()} className="flex-1 sm:flex-none">
              {(createProject.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Project
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}