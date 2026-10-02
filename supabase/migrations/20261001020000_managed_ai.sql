-- Per-account AI quota. Provider credentials live in Edge Function secrets.
CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT current_date,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI usage" ON public.ai_daily_usage;
CREATE POLICY "Users can view own AI usage"
  ON public.ai_daily_usage FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON public.ai_daily_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_daily_usage TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_request()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  accepted boolean := false;
BEGIN
  IF caller IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_daily_usage (user_id, usage_date, request_count)
  VALUES (caller, current_date, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET request_count = ai_daily_usage.request_count + 1,
        updated_at = now()
    WHERE ai_daily_usage.request_count < 50
  RETURNING true INTO accepted;

  RETURN coalesce(accepted, false);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_request() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_request() TO authenticated;
