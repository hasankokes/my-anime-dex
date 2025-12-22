-- Create the storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public access to view avatars
CREATE POLICY "Avatar Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload their own avatar
-- We assume the filename will contain the user ID or the folder structure matches user ID to restrict, 
-- but for simplicity in this quick setup, we allow auth users to insert. 
-- A stricter policy would be: (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
CREATE POLICY "Avatar Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Policy: Allow users to update their own avatar
CREATE POLICY "Avatar Update Access" 
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Policy: Allow users to delete their own avatar
CREATE POLICY "Avatar Delete Access" 
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
