-- Private, per-user PDF storage for Notes & Links.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-pdfs',
  'user-pdfs',
  false,
  104857600,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users read own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users update own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own PDFs" ON storage.objects;

CREATE POLICY "Users read own PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users upload own PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) = 'pdf'
);

CREATE POLICY "Users update own PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) = 'pdf'
);

CREATE POLICY "Users delete own PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
