-- Shared, signed-in community feed. Author display data is copied onto each
-- post so the private profiles table never needs a public read policy.
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(trim(author_name)) BETWEEN 1 AND 60),
  author_avatar_url text,
  category text NOT NULL DEFAULT 'progress'
    CHECK (category IN ('progress', 'win', 'question', 'accountability')),
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members can read community posts"
  ON public.community_posts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Members create their own community posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members update their own community posts"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members delete their own community posts"
  ON public.community_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS community_posts_created_idx
  ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_category_created_idx
  ON public.community_posts(category, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_reactions (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'support' CHECK (reaction = 'support'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, reaction)
);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members can read community reactions"
  ON public.community_reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Members add their own reactions"
  ON public.community_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members remove their own reactions"
  ON public.community_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS community_reactions_post_idx
  ON public.community_reactions(post_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reactions;

NOTIFY pgrst, 'reload schema';
