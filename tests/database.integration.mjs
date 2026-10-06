import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE ROLE anon; CREATE ROLE authenticated;
   CREATE TABLE auth.users (id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   CREATE TABLE storage.buckets (id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
   CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
   CREATE FUNCTION storage.extension(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT split_part($1,'.',array_length(string_to_array($1,'.'),1)) $$;
   CREATE PUBLICATION supabase_realtime;`,
);
const root = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
// Supabase provisions this extension; gen_random_uuid is native to PostgreSQL.
await db.exec(
  fs
    .readFileSync(root + "20261001000000_init_schema.sql", "utf8")
    .replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', ""),
);
await db.exec(
  fs.readFileSync(root + "20261001010000_reliable_sync.sql", "utf8"),
);
await db.exec(
  fs.readFileSync(root + "20261001020000_managed_ai.sql", "utf8"),
);
await db.exec(
  fs.readFileSync(root + "20261005010000_pdf_storage.sql", "utf8"),
);
await db.exec(
  fs.readFileSync(root + "20261005020000_reduce_pdf_upload_limit.sql", "utf8"),
);
await db.exec(
  fs.readFileSync(root + "20261006010000_media_storage.sql", "utf8"),
);
await db.exec(
  fs.readFileSync(root + "20261006020000_community.sql", "utf8"),
);
await db.exec(
  `GRANT USAGE ON SCHEMA public,auth,storage TO authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO authenticated; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth,storage TO authenticated; INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111','a@test.invalid','{}'),('22222222-2222-4222-8222-222222222222','b@test.invalid','{}'); SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`,
);
const owner = "11111111-1111-4111-8111-111111111111",
  id = "33333333-3333-4333-8333-333333333333";
const communityPostId = "55555555-5555-4555-8555-555555555555";
const task = {
  id,
  user_id: owner,
  project_id: null,
  title: "Atomic test",
  description: null,
  priority: "medium",
  status: "todo",
  start_date: "2026-10-01",
  deadline: null,
  estimated_duration_minutes: 30,
  recurrence_rule: null,
  is_routine: false,
  is_brain_dump: false,
  position: 0,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
const sub = {
  id: "44444444-4444-4444-8444-444444444444",
  task_id: id,
  user_id: owner,
  title: "Child",
  is_completed: false,
  position: 0,
  created_at: task.created_at,
  updated_at: task.updated_at,
};
await db.query("SELECT save_task_with_subtasks($1::jsonb,$2::jsonb)", [
  JSON.stringify(task),
  JSON.stringify([sub]),
]);
assert.equal((await db.query("SELECT * FROM tasks")).rows.length, 1);
assert.equal((await db.query("SELECT * FROM subtasks")).rows.length, 1);
assert.equal(
  (await db.query("SELECT file_size_limit FROM storage.buckets WHERE id='user-pdfs'"))
    .rows[0].file_size_limit,
  26214400,
);
await db.query(
  "INSERT INTO storage.objects(bucket_id,name) VALUES ('user-pdfs',$1)",
  [`${owner}/notes.pdf`],
);
await assert.rejects(
  db.query(
    "INSERT INTO storage.objects(bucket_id,name) VALUES ('user-pdfs',$1)",
    ["22222222-2222-4222-8222-222222222222/private.pdf"],
  ),
);
assert.equal(
  (await db.query("SELECT file_size_limit FROM storage.buckets WHERE id='user-attachments'"))
    .rows[0].file_size_limit,
  26214400,
);
await db.query(
  "INSERT INTO storage.objects(bucket_id,name) VALUES ('user-attachments',$1)",
  [`${owner}/image/photo.webp`],
);
await db.query(
  "INSERT INTO storage.objects(bucket_id,name) VALUES ('user-attachments',$1)",
  [`${owner}/audio/voice-note.mp3`],
);
await assert.rejects(
  db.query(
    "INSERT INTO storage.objects(bucket_id,name) VALUES ('user-attachments',$1)",
    [`${owner}/image/unsafe.exe`],
  ),
);
await assert.rejects(
  db.query(
    "INSERT INTO storage.objects(bucket_id,name) VALUES ('user-attachments',$1)",
    ["22222222-2222-4222-8222-222222222222/audio/private.mp3"],
  ),
);
await assert.rejects(
  db.query("SELECT save_task_with_subtasks($1::jsonb,$2::jsonb)", [
    JSON.stringify({ ...task, title: "Must rollback" }),
    JSON.stringify([
      { ...sub, user_id: "22222222-2222-4222-8222-222222222222" },
    ]),
  ]),
);
assert.equal(
  (await db.query("SELECT title FROM tasks")).rows[0].title,
  "Atomic test",
);
await db.query("SELECT save_task_with_subtasks($1::jsonb,$2::jsonb)", [
  JSON.stringify(task),
  "[]",
]);
assert.equal((await db.query("SELECT * FROM subtasks")).rows.length, 0);
await db.exec(
  "SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'",
);
assert.equal((await db.query("SELECT * FROM tasks")).rows.length, 0);
await assert.rejects(
  db.query("SELECT save_task_with_subtasks($1::jsonb,$2::jsonb)", [
    JSON.stringify(task),
    "[]",
  ]),
);
for (let request = 1; request <= 50; request += 1) {
  const result = await db.query("SELECT consume_ai_request() AS accepted");
  assert.equal(result.rows[0].accepted, true);
}
assert.equal(
  (await db.query("SELECT consume_ai_request() AS accepted")).rows[0].accepted,
  false,
);
assert.equal(
  (await db.query("SELECT request_count FROM ai_daily_usage")).rows[0]
    .request_count,
  50,
);
await db.query(
  "INSERT INTO community_posts(id,user_id,author_name,category,content) VALUES ($1,$2,'Tester','progress','Shipped the first version')",
  [communityPostId, "22222222-2222-4222-8222-222222222222"],
);
await db.query(
  "INSERT INTO community_reactions(post_id,user_id) VALUES ($1,$2)",
  [communityPostId, "22222222-2222-4222-8222-222222222222"],
);
assert.equal((await db.query("SELECT * FROM community_posts")).rows.length, 1);
await assert.rejects(
  db.query("INSERT INTO community_posts(user_id,author_name,content) VALUES ($1,'Wrong user','Nope')", [owner]),
);
await db.exec("SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'");
assert.equal((await db.query("SELECT * FROM community_posts")).rows.length, 1);
await db.query("DELETE FROM community_posts WHERE id=$1", [communityPostId]);
assert.equal((await db.query("SELECT * FROM community_posts")).rows.length, 1);
console.log(
  "PASS: all SQL migrations, account RLS isolation, atomic task writes, and AI quota enforcement.",
);
await db.close();
