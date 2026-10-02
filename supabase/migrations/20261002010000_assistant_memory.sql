ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS context_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_facts jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS actions jsonb;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created ON public.ai_messages(conversation_id, created_at);

NOTIFY pgrst, 'reload schema';
