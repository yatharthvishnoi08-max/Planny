-- Private image and audio attachments for Notes & Links.
-- The bucket remains under Supabase's 50 MB free-plan upload ceiling. The app
-- applies a lower 15 MB cap to images and the bucket cap to audio.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-attachments',
  'user-attachments',
  false,
  26214400,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav',
    'audio/ogg', 'audio/webm', 'audio/aac'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users read own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users update own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own attachments" ON storage.objects;

CREATE POLICY "Users read own attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users upload own attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN (
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif',
    'mp3', 'm4a', 'mp4', 'wav', 'ogg', 'webm', 'aac'
  )
);

CREATE POLICY "Users update own attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN (
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif',
    'mp3', 'm4a', 'mp4', 'wav', 'ogg', 'webm', 'aac'
  )
);

CREATE POLICY "Users delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
