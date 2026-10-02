import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { syncEngine } from "../../lib/sync";
import { localDate } from "../../lib/dates";
import { loadAssistantMemory, saveAssistantMemory } from "../../lib/assistantMemory";
import type { AIMessage } from "../../types/database";

const PERSONAS = ["Student", "Working professional", "Founder / freelancer", "Something else"];
const SYSTEMS = ["Notes or paper", "Calendar", "Another task app", "Mostly in my head"];
const BLOCKERS = ["I forget tasks", "I procrastinate", "I don’t know what to prioritize", "I make too many plans", "I underestimate time", "I get distracted", "I start but don’t finish", "I don’t have a consistent routine"];
const STYLES = ["🧘 Keep it flexible", "📋 Clear task list", "⏰ Time-block everything", "🤖 Let AI organize it", "🔄 A mix of everything"];
const BEHAVIORS = ["Just add it", "Ask for a deadline", "Break it into steps", "Estimate the time", "Find the best time", "Do all of the above"];

export const OnboardingModal: React.FC<{ isOpen: boolean; onComplete: () => void }> = ({ isOpen, onComplete }) => {
  const { user, profile, completeOnboarding } = useAuth();
  const [step, setStep] = useState(0), [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(profile?.full_name || ""), [persona, setPersona] = useState("Student");
  const [wastedHours, setWastedHours] = useState("1–2 hours"), [taskSystem, setTaskSystem] = useState("Mostly in my head");
  const [blockers, setBlockers] = useState<string[]>([]), [planningStyle, setPlanningStyle] = useState("🔄 A mix of everything");
  const [taskBehavior, setTaskBehavior] = useState("Do all of the above"), [firstTask, setFirstTask] = useState(() => { try { return localStorage.getItem("planny_landing_draft") || ""; } catch { return ""; } });
  if (!isOpen || !user) return null;

  const choice = (value: string, selected: string, setter: (value: string) => void) => <button type="button" key={value} onClick={() => setter(value)} className={`onboarding-choice ${selected === value ? "selected" : ""}`}><span>{value}</span>{selected === value && <Check size={16} />}</button>;
  const finish = async () => {
    setSaving(true); setError(null);
    try {
      const areas = persona === "Student" ? ["Study", "Personal", "Projects"] : ["Work", "Personal", "Projects"];
      await completeOnboarding({ fullName: name, areas, persona, wastedHours, taskSystem, blockers, planningStyle, taskBehavior });
      if (firstTask.trim()) syncEngine.saveTask({ id: crypto.randomUUID(), user_id: user.id, project_id: null, title: firstTask.trim(), description: "Your first task in Planny", priority: "medium", status: "todo", start_date: localDate(), deadline: null, estimated_duration_minutes: 30, recurrence_rule: null, is_routine: false, is_brain_dump: false, position: 0, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      const memory = await loadAssistantMemory(user.id);
      const welcome: AIMessage = { id: crypto.randomUUID(), conversation_id: memory.conversationId, user_id: user.id, role: "assistant", content: `You’re set, ${name.split(" ")[0] || "friend"}. Here’s your quick tour:\n\n• **Today** is your daily command center.\n• **Upcoming** and **Calendar** show what’s ahead.\n• **Projects** group bigger goals.\n• **Routines** keep repeat work consistent.\n• **Brain dump** catches messy thoughts fast.\n• **Notes & links** keeps useful knowledge nearby.\n• **Focus** helps you finish one thing at a time.\n\nI’ll remember your preferences and our conversations. Tell me what you want to accomplish next—or ask me what to do now.`, created_at: new Date().toISOString() };
      await saveAssistantMemory(user.id, { ...memory, facts: [...memory.facts, `${name} is a ${persona}`, `Planning preference: ${planningStyle}`, `Default task behavior: ${taskBehavior}`].slice(-12), messages: [...memory.messages, welcome] });
      try { localStorage.removeItem("planny_landing_draft"); } catch {}
      onComplete();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not finish setup."); } finally { setSaving(false); }
  };
  const titles = ["Let’s make Planny yours", "What gets in your way?", "How should your day feel?", "Let’s make your first win"];
  return <div className="onboarding-screen"><header><div className="landing-logo"><img src="/planny-icon.svg" alt="" /><span>Planny</span></div><span>{step + 1} / 4</span></header><div className="onboarding-progress"><i style={{ width: `${(step + 1) * 25}%` }} /></div><section className="onboarding-panel"><span className="onboarding-kicker"><Sparkles size={14} /> 60-second setup</span><h1>{titles[step]}</h1>
    {step === 0 && <div className="onboarding-stack"><label>What should we call you?<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label><p>Which sounds most like you?</p><div className="onboarding-grid">{PERSONAS.map((v) => choice(v, persona, setPersona))}</div><label>Roughly how much time slips away each day?<select value={wastedHours} onChange={(e) => setWastedHours(e.target.value)}><option>Less than 1 hour</option><option>1–2 hours</option><option>2–4 hours</option><option>More than 4 hours</option></select></label></div>}
    {step === 1 && <div className="onboarding-stack"><p>How do you currently manage tasks?</p><div className="onboarding-grid">{SYSTEMS.map((v) => choice(v, taskSystem, setTaskSystem))}</div><p>What usually stops you? <small>Choose up to three</small></p><div className="onboarding-grid blockers">{BLOCKERS.map((v) => <button type="button" key={v} className={`onboarding-choice ${blockers.includes(v) ? "selected" : ""}`} onClick={() => setBlockers(blockers.includes(v) ? blockers.filter((b) => b !== v) : blockers.length < 3 ? [...blockers, v] : blockers)}>{v}{blockers.includes(v) && <Check size={15} />}</button>)}</div></div>}
    {step === 2 && <div className="onboarding-stack"><p>How do you like to plan your day?</p>{STYLES.map((v) => choice(v, planningStyle, setPlanningStyle))}<p>When you give Planny a task, what should it do?</p><div className="onboarding-grid">{BEHAVIORS.map((v) => choice(v, taskBehavior, setTaskBehavior))}</div></div>}
    {step === 3 && <div className="onboarding-stack first-task"><div className="first-task-demo"><span>TRY A REAL TASK</span><strong>“Finish my Physics assignment”</strong><p>Planny can estimate it, split it into steps and help find the right time.</p></div><label>What’s one thing you want to get done?<input autoFocus value={firstTask} onChange={(e) => setFirstTask(e.target.value)} placeholder="Type your first task…" /></label><p className="onboarding-hint">You can skip this and add one later.</p></div>}
    {error && <p className="landing-status" role="alert">{error}</p>}<footer>{step > 0 ? <button className="onboarding-back" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button> : <span />}<button className="landing-submit" disabled={saving || (step === 0 && !name.trim())} onClick={() => step < 3 ? setStep(step + 1) : void finish()}>{saving ? "Building your Planny…" : step < 3 ? "Continue" : "Enter my workspace"}<ArrowRight size={16} /></button></footer></section></div>;
};
