-- Repair profiles for accounts created before the schema was installed.
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Be explicit about API access. RLS remains the authorization boundary.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ask PostgREST to refresh immediately after the RPC migration. This prevents
-- a valid function from briefly appearing absent in its schema cache.
NOTIFY pgrst, 'reload schema';
