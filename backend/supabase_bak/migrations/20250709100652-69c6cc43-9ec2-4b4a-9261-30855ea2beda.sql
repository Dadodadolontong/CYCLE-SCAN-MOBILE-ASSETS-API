-- Create storage buckets for CSV uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('csv-uploads', 'csv-uploads', false);

-- Create policies for CSV uploads bucket
CREATE POLICY "Authenticated users can upload CSV files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'csv-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own uploads" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'csv-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own uploads" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'csv-uploads' AND auth.uid() IS NOT NULL);

-- Create sync_logs entries for CSV imports
ALTER TABLE public.sync_logs 
ADD COLUMN file_name TEXT,
ADD COLUMN records_processed INTEGER DEFAULT 0;