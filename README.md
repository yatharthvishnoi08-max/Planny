# Planny

A personal task planner built with React, TypeScript, Tauri 2, and Supabase.

## Run locally

```sh
npm install
npm run dev
```

The normal development URL is http://localhost:1420. The review preview may use port 1421 to avoid interrupting an existing instance. Browser storage is separate for each origin/port.

```sh
npm run check       # TypeScript, core regression tests, PostgreSQL integration tests
npm run build       # Production web bundle
npm run tauri dev   # Native desktop development
npm run tauri build # Native package for the current platform
```

## Interface

The app retains Today, Upcoming, Calendar, Projects, Routines, Brain Dump (labelled Inbox in navigation), Knowledge, Assistant, Focus Mode, Daily Briefing, Day Review, search, authentication, onboarding, export, and settings.

The app opens with the After Hours dark design. The header Accent menu offers Electric, Ice, and Candy. Light, dark, and system appearance remain in Settings. Fonts are self-hosted; their licenses are in public/fonts. The logo source is public/planny-icon.svg. Native icons are generated with `npm run tauri icon public/planny-icon.svg`.

## Accounts and private sync

Production builds use one managed Supabase project. Users sign up or sign in with email and password; they never enter Supabase credentials. Each account has separate caches and mutation queues, and PostgreSQL row-level security restricts every cloud row to `auth.uid()`. Signing out removes visible account data from memory without deleting its saved offline cache.

When the deployment variables are absent, a local development workspace remains available so contributors can run the interface without cloud credentials. It is not a password-protected account and must not be used as the production build.

Old unscoped caches are migrated to the first local workspace, preserving relationships and replacing legacy IDs with UUIDs. Original cache keys are retained. Legacy local data is deliberately not uploaded into an arbitrary cloud account. Export a backup in Settings before changing cloud configuration.

### Configure Supabase once for the deployment

1. Create a Supabase project.
2. Apply the three files in `supabase/migrations` in filename order. Existing installations should apply only migrations they have not yet run.
3. Copy `.env.example` to `.env.local` and set the project URL and public publishable key.
4. Configure Supabase Auth email confirmation and redirect URLs for the deployed web/native app.
5. Deploy the `ai-planner` Edge Function after choosing the AI provider below.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are public client settings. Supabase expects them to be present in the built app; authorization comes from signed-in sessions and RLS. Never expose a secret/service-role key or an AI provider key through a `VITE_` variable.

The sync engine writes tasks and subtasks through the `save_task_with_subtasks` RPC. Every mutation remains durable until a successful acknowledgement. Failed writes surface an error and retry while the app is open. Startup replays offline edits before fetching data. Edits made during a fetch are overlaid on the response. Tasks, projects, routines, routine instances, notes, resources, brain dumps, and focus sessions are synchronized.

Conflict policy is ordered replay per device with last acknowledged writes winning across devices. It is not a CRDT and does not merge simultaneous field-level edits from different devices. AI conversation history is currently stored per account on the device.

### Configure managed AI

The recommended hosted provider is Gemini 3.5 Flash-Lite. It is Google's current stable Flash-Lite model for new projects, supports structured JSON output and a 1M-token input window, and has a free tier for initial use. Configure it and deploy the function:

```sh
supabase secrets set AI_PROVIDER=gemini AI_MODEL=gemini-3.5-flash-lite GEMINI_API_KEY=your_key
supabase functions deploy ai-planner
```

For Ollama Cloud, use its public API endpoint and a model enabled for your account. A laptop's `localhost` is not reachable from Supabase:

```sh
supabase secrets set AI_PROVIDER=ollama AI_MODEL=gemma4:31b OLLAMA_BASE_URL=https://ollama.com OLLAMA_API_KEY=your_key
supabase functions deploy ai-planner
```

The function verifies the Supabase user, enforces 50 AI requests per user per day, calls the provider with the server-only credential, and returns validated structured data. AI changes still require confirmation. Without deployment configuration, local task parsing and planner workflows remain available.

AI prompts include the text the user submits and the task metadata needed for the requested plan. Choose the provider and account tier whose data terms fit your deployment.

## Dates, routines, and reminders

Calendar dates use the device's local timezone. Today includes pending tasks scheduled for today or earlier, overdue deadlines, and tasks completed today. Cancelled tasks are excluded. Calendar day/week views filter to the selected period. Month navigation handles short months, and desktop tasks can be dragged onto a calendar day. Dates can also be edited in task details on touch devices.

Routines support daily, weekdays, weekends, weekly, monthly, specific weekdays, and every-X-days schedules. End dates are respected. Monthly routines created on the 31st use the last day in shorter months.

Reminders are rebuilt from saved tasks and routines. Completion, edits, deletion, and account changes reconcile pending alerts. The onboarding reminder preference is applied.

- Desktop/web: keep Planny running for timer-based reminders. Timers cannot run after the process/browser is closed.
- Android/iOS: the OS notification plugin schedules up to 60 upcoming notifications over the next seven days, refreshed while Planny is active. Real-device permission and delivery testing is still required.

## Validation

`npm test` runs regression tests for local dates, recurrence, account switching, legacy migration, rejected writes, atomic RPC payloads, online deletion, offline restart recovery, edits during remote fetch, entity persistence, assistant time budgets, and AI validation.

`npm run test:db` uses PGlite (PostgreSQL in WASM) to apply all migrations against a simulated Supabase auth schema, then tests task/subtask writes, rollback, deletion, row-level account isolation, and the per-user AI quota. Supabase provisions the uuid-ossp extension; this test omits that one extension statement because gen_random_uuid is built into the test engine.

`cargo check --offline --manifest-path src-tauri/Cargo.toml` checks the native Rust application when dependencies are already cached.

Before distribution, test a real Supabase project, the deployed AI function, and notifications on each target device. Store distribution requires the appropriate Apple/Google/Microsoft signing accounts and platform toolchains.

Compatibility: legacy `orbit_*` storage keys, the native application identifier, and Rust crate names remain stable to preserve existing installations and saved work.

## Finding your way around

- Today is the starting point. Use New task for direct entry; Help me plan is an optional draft step with offline parsing or hosted Planny AI when configured.
- The Capture → Plan → Focus → Review strip gives you actions to try. Start here in the header opens the complete playbook at any time.
- Upcoming groups tasks by deadline (falling back to start date), with separate overdue and unscheduled sections. Calendar opens as a seven-day board; day, month and year views remain available. Dragging a task changes its scheduled date.
- Projects group related tasks and support adding a task directly to the selected project.
- Open a task for notes, priority, deadline, duration and subtasks. The play button starts Focus. Finish session records the session; Mark task done completes the task separately.
- Routines support creating, editing, pausing, resuming and checking off scheduled habits. Notes & links supports reading and editing complete notes.
- Brain dump captures unstructured thoughts for later conversion. Assistant proposes changes for confirmation; offline templates are explicitly identified.

The redesign preserves the existing logo, saved work, storage keys and native application identifier. A one-time local appearance migration enables dark mode for existing workspaces; users can subsequently change appearance in Settings. Motion respects reduced-motion preferences.
