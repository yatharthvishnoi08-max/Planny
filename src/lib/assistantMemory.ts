import { supabase, isRealSupabaseConfigured } from "./supabase";
import type { AIMessage } from "../types/database";

export type AssistantMemory = {
  conversationId: string;
  messages: AIMessage[];
  summary: string;
  facts: string[];
};

const key = (userId: string) => `planny_assistant_memory:${userId}`;
const fresh = (): AssistantMemory => ({ conversationId: crypto.randomUUID(), messages: [], summary: "", facts: [] });

function readLocal(userId: string): AssistantMemory {
  try {
    const value = JSON.parse(localStorage.getItem(key(userId)) || "null");
    if (value?.conversationId && Array.isArray(value.messages)) return value;
    const legacy = JSON.parse(localStorage.getItem(`orbit_chat:${userId}`) || "null");
    if (Array.isArray(legacy) && legacy.length) {
      const conversationId = crypto.randomUUID();
      const migrated = {
        ...fresh(),
        conversationId,
        messages: legacy.map((message: AIMessage) => ({
          ...message,
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          user_id: userId,
        })),
      };
      writeLocal(userId, migrated);
      return migrated;
    }
  } catch {}
  return fresh();
}

function writeLocal(userId: string, memory: AssistantMemory) {
  try { localStorage.setItem(key(userId), JSON.stringify(memory)); } catch {}
}

export async function loadAssistantMemory(userId: string): Promise<AssistantMemory> {
  const local = readLocal(userId);
  if (!isRealSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(userId)) return local;
  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id, context_summary, user_facts")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conversation) return local;
  const { data: rows } = await supabase
    .from("ai_messages")
    .select("id, conversation_id, user_id, role, content, actions, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(200);
  const cloud: AssistantMemory = {
    conversationId: conversation.id,
    messages: (rows || []) as AIMessage[],
    summary: String(conversation.context_summary || ""),
    facts: Array.isArray(conversation.user_facts) ? conversation.user_facts : [],
  };
  writeLocal(userId, cloud);
  return cloud;
}

function extractFacts(text: string, current: string[]) {
  const candidates = text.split(/[.!?\n]+/).map((part) => part.trim()).filter((part) =>
    /^(?:remember(?: that)?|my |i am |i'm |i prefer |i like |i dislike |i usually |i work |i study )/i.test(part),
  ).map((part) => part.replace(/^remember(?: that)?\s*/i, "").slice(0, 180));
  return [...new Set([...current, ...candidates])].slice(-12);
}

function compact(messages: AIMessage[]) {
  if (messages.length <= 8) return "";
  return messages.slice(0, -6).slice(-12).map((message) =>
    `${message.role === "user" ? "User" : "Planny"}: ${message.content.replace(/\s+/g, " ").slice(0, 140)}`,
  ).join(" | ").slice(-1200);
}

export async function saveAssistantMemory(userId: string, memory: AssistantMemory): Promise<AssistantMemory> {
  const next = {
    ...memory,
    messages: memory.messages.slice(-200),
    facts: extractFacts(memory.messages.filter((message) => message.role === "user").at(-1)?.content || "", memory.facts),
    summary: compact(memory.messages) || memory.summary,
  };
  writeLocal(userId, next);
  if (!isRealSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(userId)) return next;
  try {
    const { error: conversationError } = await supabase.from("ai_conversations").upsert({
      id: next.conversationId,
      user_id: userId,
      title: "Personal assistant",
      context_summary: next.summary,
      user_facts: next.facts,
      updated_at: new Date().toISOString(),
    });
    if (conversationError) throw conversationError;
    const latest = next.messages.at(-1);
    if (latest) {
      const { error } = await supabase.from("ai_messages").upsert({
        id: latest.id, conversation_id: next.conversationId, user_id: userId,
        role: latest.role, content: latest.content, actions: latest.actions || null, created_at: latest.created_at,
      });
      if (error) throw error;
    }
  } catch (error) {
    console.warn("Assistant cloud memory will retry from this device", error);
  }
  return next;
}

export function contextForAI(memory: AssistantMemory) {
  return {
    summary: memory.summary,
    facts: memory.facts,
    // The current user message is sent separately, so omit it here to avoid
    // paying for the same tokens twice.
    recentMessages: memory.messages.slice(-7, -1).map(({ role, content }) => ({ role, content: content.slice(0, 700) })),
  };
}
