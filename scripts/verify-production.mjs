import fs from "node:fs";

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadLocalEnv();
const url = process.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase deployment variables are missing.");

const headers = { apikey: key, "Content-Type": "application/json" };
const checks = [];

for (const table of ["profiles", "tasks", "subtasks", "projects", "routines"]) {
  const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  checks.push([`table:${table}`, response.status]);
  if (response.status === 404 || response.status >= 500)
    throw new Error(`${table} is missing or unhealthy (HTTP ${response.status}).`);
}

const functionResponse = await fetch(`${url}/functions/v1/ai-planner`, {
  method: "POST",
  headers,
  body: JSON.stringify({ prompt: "health check", schema: { type: "object" } }),
  signal: AbortSignal.timeout(15_000),
});
checks.push(["function:ai-planner", functionResponse.status]);
if (functionResponse.status === 404 || functionResponse.status >= 500)
  throw new Error(
    `ai-planner is missing or unhealthy (HTTP ${functionResponse.status}).`,
  );

console.log(
  checks.map(([name, status]) => `✓ ${name} (HTTP ${status})`).join("\n"),
);
