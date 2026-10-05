-- Keep PDF uploads comfortably within the Supabase Free plan's 50 MB global
-- upload ceiling while preserving the project's shared 1 GB storage quota.
update storage.buckets
set file_size_limit = 26214400
where id = 'user-pdfs';
