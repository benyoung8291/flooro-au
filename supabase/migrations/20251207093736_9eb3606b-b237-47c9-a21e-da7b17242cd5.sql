-- Create floor_plan_images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor_plan_images', 'floor_plan_images', true);

-- Allow authenticated users to upload images for their organization's projects
CREATE POLICY "Users can upload floor plan images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'floor_plan_images' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to view floor plan images
CREATE POLICY "Users can view floor plan images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'floor_plan_images');

-- Allow authenticated users to update their own uploaded images
CREATE POLICY "Users can update floor plan images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'floor_plan_images' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete floor plan images
CREATE POLICY "Users can delete floor plan images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'floor_plan_images' AND auth.uid() IS NOT NULL);