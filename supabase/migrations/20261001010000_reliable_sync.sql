-- Apply after 20261001000000_init_schema.sql. Task and checklist writes are atomic.
CREATE OR REPLACE FUNCTION public.save_task_with_subtasks(task_data jsonb, subtask_data jsonb DEFAULT '[]'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE t public.tasks; item jsonb;
BEGIN
  IF auth.uid() IS NULL OR task_data->>'user_id' IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Task owner must match authenticated user';
  END IF;
  SELECT * INTO t FROM jsonb_populate_record(NULL::public.tasks, task_data);
  IF t.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects WHERE id=t.project_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Project does not belong to current user';
  END IF;
  INSERT INTO public.tasks SELECT t.* ON CONFLICT (id) DO UPDATE SET
    project_id=EXCLUDED.project_id, title=EXCLUDED.title, description=EXCLUDED.description,
    priority=EXCLUDED.priority, status=EXCLUDED.status, start_date=EXCLUDED.start_date,
    deadline=EXCLUDED.deadline, estimated_duration_minutes=EXCLUDED.estimated_duration_minutes,
    recurrence_rule=EXCLUDED.recurrence_rule, is_routine=EXCLUDED.is_routine,
    is_brain_dump=EXCLUDED.is_brain_dump, position=EXCLUDED.position, completed_at=EXCLUDED.completed_at;
  FOR item IN SELECT value FROM jsonb_array_elements(subtask_data) LOOP
    IF item->>'user_id' IS DISTINCT FROM auth.uid()::text OR item->>'task_id' IS DISTINCT FROM t.id::text THEN
      RAISE EXCEPTION 'Invalid subtask owner or parent';
    END IF;
    INSERT INTO public.subtasks SELECT * FROM jsonb_populate_record(NULL::public.subtasks,item)
    ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, is_completed=EXCLUDED.is_completed, position=EXCLUDED.position
    WHERE subtasks.task_id=t.id;
  END LOOP;
  DELETE FROM public.subtasks WHERE task_id=t.id AND user_id=auth.uid()
    AND id NOT IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(subtask_data));
END;
$$;
REVOKE ALL ON FUNCTION public.save_task_with_subtasks(jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_task_with_subtasks(jsonb,jsonb) TO authenticated;

-- Protect ownership across parent/child relations in addition to per-row RLS.
CREATE OR REPLACE FUNCTION public.check_owned_relations() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE key text; parent_table text; parent_id uuid; owned boolean;
BEGIN
  FOR key,parent_table IN SELECT * FROM (VALUES
    ('project_id','projects'),('task_id','tasks'),('depends_on_task_id','tasks'),
    ('routine_id','routines'),('tag_id','tags'),('conversation_id','ai_conversations')) AS relations(k,t)
  LOOP
    parent_id := NULLIF(to_jsonb(NEW)->>key,'')::uuid;
    IF parent_id IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id=$1 AND user_id=$2)', parent_table)
        INTO owned USING parent_id,NEW.user_id;
      IF NOT owned THEN RAISE EXCEPTION 'Invalid parent ownership for %',key; END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','subtasks','task_dependencies','task_tags','routine_instances','reminders','notes','resources','focus_sessions','ai_messages','ai_actions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS check_owned_relations ON public.%I',t);
    EXECUTE format('CREATE TRIGGER check_owned_relations BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.check_owned_relations()',t);
  END LOOP;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['focus_sessions'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
    END IF;
  END LOOP;
END $$;
