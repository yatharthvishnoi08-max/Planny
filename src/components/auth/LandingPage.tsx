import React, { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Sparkles,
  X,
  Menu,
  BrainCircuit,
  CalendarCheck2,
  FolderKanban,
  ListChecks,
  Repeat2,
  TimerReset,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./landing.css";
import { PlanEditor } from "./PlanEditor";
import {
  draftTasks,
  validDraft,
  savePlanDraft,
  type PlanDraft,
  type DraftTask,
} from "../../lib/planDraft";

const problems = [
  "I have too many things to do",
  "I get distracted too easily",
  "I keep missing deadlines",
  "I don't know where to start",
  "I procrastinate even when it's important",
  "My tasks are everywhere",
  "I struggle to stay consistent",
  "Something else",
];
const questions = [
  "What’s taking up space in your head?",
  "What would you like to focus on?",
  "What’s due soon?",
  "What do you need to get done?",
  "What have you been putting off?",
  "Drop your scattered tasks here.",
  "What would you like to make a habit?",
  "Tell us what your day looks like.",
];
const colors = [
  "#b6f36b",
  "#c4a2ff",
  "#ffbc83",
  "#8dcfff",
  "#ffa9cf",
  "#8be0c4",
];
const example = "Revise Physics, finish my project, and go for a workout";
function HeroTypingLine() {
  const text = "Know what to do next.";
  const reduce = useReducedMotion();
  const [length, setLength] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    const type = () => {
      count += 1;
      setLength(count);
      if (count < text.length) timer = setTimeout(type, 65);
    };
    timer = setTimeout(type, 450);
    return () => clearTimeout(timer);
  }, [reduce]);
  return (
    <span className="lp-typed-line" aria-label={text}>
      <span className="lp-typed-reserve" aria-hidden="true">{text}</span>
      <span className="lp-typed-visible" aria-hidden="true">
        {reduce ? text : text.slice(0, length)}
        {!reduce && length < text.length && <i className="lp-typing-caret" />}
      </span>
    </span>
  );
}

function Reveal({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      className={className}
      initial={{
        opacity: reduce ? 1 : 0,
        y: reduce ? 0 : 34,
        filter: reduce ? "blur(0px)" : "blur(8px)",
      }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}
function PlanDemo({
  onSave,
  compact = false,
}: {
  onSave: (draft: PlanDraft) => void;
  compact?: boolean;
}) {
  const [step, setStep] = useState(compact ? 1 : 0);
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  useEffect(() => {
    if (step !== 2) return;
    const timer = window.setTimeout(() => setStep(3), 1100);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className={`lp-demo ${compact ? "lp-demo-wide" : ""}`}>
      <div className="lp-demo-top">
        <span>
          <img src="/planny-icon.svg" alt="" /> YOUR MIND, UNCLUTTERED
        </span>
        <span className="lp-live">Interactive demo</span>
      </div>
      <div className="lp-step-line">
        {[0, 1, 3].map((s, i) => (
          <i key={s} className={step >= s ? "active" : ""}>
            <span>{["Your challenge", "Your thoughts", "Your plan"][i]}</span>
          </i>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="lp-demo-stage"
        >
          {step === 0 && (
            <>
              <div className="lp-question-head">
                <motion.span
                  className="lp-question-mark"
                  aria-hidden="true"
                  animate={{ rotate: [-7, 5, -7], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  ?
                </motion.span>
                <div>
                  <span className="lp-question-kicker">
                    <i /> YOUR TURN
                    <b>Pick all that fit</b>
                  </span>
                  <h2>
                    Be honest—what keeps
                    <br />
                    <em>stealing your time?</em>
                  </h2>
                </div>
              </div>
              <div className="lp-selection-help">
                <p>
                  <strong>Tap every answer that sounds like you.</strong>
                  You can choose more than one.
                </p>
                <span className={selectedProblems.length ? "has-selection" : ""}>
                  {selectedProblems.length
                    ? `${selectedProblems.length} selected`
                    : "MULTI-SELECT"}
                </span>
              </div>
              <div className="lp-options">
                {problems.map((p, i) => (
                  <button
                    key={p}
                    aria-pressed={selectedProblems.includes(i)}
                    onClick={() =>
                      setSelectedProblems((current) =>
                        current.includes(i)
                          ? current.filter((value) => value !== i)
                          : [...current, i],
                      )
                    }
                  >
                    <span className="lp-option-number">0{i + 1}</span>
                    <span className="lp-choice-copy">{p}</span>
                    <span className="lp-choice-check">
                      {selectedProblems.includes(i) && <Check size={12} />}
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="lp-primary lp-full lp-question-continue"
                disabled={!selectedProblems.length}
                onClick={() => setStep(1)}
              >
                Show me a better way
                {selectedProblems.length > 0 && (
                  <small>{selectedProblems.length}</small>
                )}
                <ArrowRight size={17} />
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <button className="lp-back" onClick={() => setStep(0)}>
                <ChevronLeft size={14} /> Back
              </button>
              <h2>
                {selectedProblems.length > 1
                  ? "What’s taking up the most space today?"
                  : questions[selectedProblems[0] ?? 0]}
              </h2>
              <p>One task per line works best. You can edit every task next.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draftTasks(text).length) {
                    setTasks(draftTasks(text));
                    setStep(2);
                  }
                }}
              >
                <label
                  className="sr-only"
                  htmlFor={compact ? "demo-thoughts" : "hero-thoughts"}
                >
                  Your tasks and ideas
                </label>
                <textarea
                  id={compact ? "demo-thoughts" : "hero-thoughts"}
                  maxLength={1000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="An exam next week, a project to finish, a workout I keep putting off…"
                  required
                />
                <button
                  type="button"
                  className="lp-example"
                  onClick={() => setText(example)}
                >
                  Try an example <ArrowUpRight size={13} />
                </button>
                <button
                  className="lp-primary lp-full"
                  disabled={!draftTasks(text).length}
                >
                  Find my starting point <Sparkles size={16} />
                </button>
              </form>
            </>
          )}
          {step === 2 && (
            <div className="lp-thinking" role="status">
              <Sparkles size={32} />
              <h2>A little less chaos…</h2>
              <p>Putting your sample plan together.</p>
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          {step === 3 && (
            <>
              <span className="lp-eyebrow">
                A LITTLE CLARITY GOES A LONG WAY
              </span>
              <h2>
                We’ve got you.
                <br />
                Here’s where to start.
              </h2>
              <p>One thing at a time. You’ve got this.</p>
              <PlanEditor tasks={tasks} onChange={setTasks} />
              <small className="lp-disclosure">
                Local sample · suggested estimates, not an AI-generated
                schedule.
              </small>
              <button
                className="lp-primary lp-full"
                disabled={!validDraft(tasks)}
                onClick={() =>
                  onSave({
                    version: 1,
                    problem: selectedProblems
                      .map((problem) => problems[problem])
                      .join(", "),
                    tasks,
                  })
                }
              >
                Save my plan <ArrowRight size={17} />
              </button>
              <button
                className="lp-back"
                onClick={() => {
                  setStep(1);
                }}
              >
                Edit my thoughts
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="lp-demo-bottom">
        <span className="lp-dot" /> A clearer day starts with one small step.
      </div>
    </div>
  );
}
export const LandingPage: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll();
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.35,
  });
  const demoRotateX = useSpring(useMotionValue(0), {
    stiffness: 150,
    damping: 22,
  });
  const demoRotateY = useSpring(useMotionValue(0), {
    stiffness: 150,
    damping: 22,
  });
  const cursorX = useSpring(useMotionValue(-500), {
    stiffness: 90,
    damping: 24,
  });
  const cursorY = useSpring(useMotionValue(-500), {
    stiffness: 90,
    damping: 24,
  });
  const heroCopyY = useTransform(heroProgress, [0, 1], [0, 90]);
  const heroDemoY = useTransform(heroProgress, [0, 1], [0, -70]);
  const [mode, setMode] = useState<"signup" | "login" | null>(null);
  const [status, setStatus] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  const [menu, setMenu] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const go = () => {
    document
      .getElementById("try-planny")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setMenu(false);
  };
  const save = (draft: PlanDraft) => {
    try {
      savePlanDraft(draft);
    } catch {
      setStatus(
        "Your browser could not save this preview. You can add tasks after signup.",
      );
      setMode("signup");
      return;
    }
    setMode("signup");
    setStatus(null);
  };
  useEffect(() => {
    if (!mode) return;
    const previous = document.activeElement as HTMLElement;
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode(null);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [mode]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const result =
        mode === "signup"
          ? await signUp(email.trim(), password, name.trim())
          : await signIn(email.trim(), password);
      if (result.error) setStatus(result.error);
      else if ("requiresConfirmation" in result && result.requiresConfirmation)
        setStatus(
          "Check your email to confirm your account. Your plan is saved on this device for when you return.",
        );
    } catch {
      setStatus("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="lp"
        onPointerMove={(event) => {
          if (reduceMotion || event.pointerType === "touch") return;
          cursorX.set(event.clientX - 190);
          cursorY.set(event.clientY - 190);
        }}
      >
        {!reduceMotion && (
          <motion.div
            className="lp-cursor-orb"
            style={{ x: cursorX, y: cursorY }}
            aria-hidden="true"
          />
        )}
        <motion.div
          className="lp-scroll-progress"
          style={{ scaleX: smoothProgress }}
          aria-hidden="true"
        />
        <div className="lp-ambient" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <header className="lp-nav">
          <a className="lp-brand" href="#">
            <img src="/planny-icon.svg" alt="" />
            planny<span>✳</span>
          </a>
          <nav aria-label="Website" className={menu ? "is-open" : ""}>
            <a href="#how" onClick={() => setMenu(false)}>
              How it works
            </a>
            <a href="#product" onClick={() => setMenu(false)}>
              Features
            </a>
            <a href="#ai" onClick={() => setMenu(false)}>
              Assistant
            </a>
            <a href="#faq" onClick={() => setMenu(false)}>
              FAQ
            </a>
          </nav>
          <div>
            <button
              className="lp-login"
              onClick={() => {
                setMode("login");
                setStatus(null);
              }}
            >
              Log in
            </button>
            <button className="lp-primary lp-nav-cta" onClick={go}>
              Try Planny <ArrowUpRight size={16} />
            </button>
            <button
              className="lp-menu"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu />
            </button>
          </div>
        </header>
        <main className="lp-clear-main">
          <section className="lp-hero lp-clear-hero" ref={heroRef}>
            <div className="lp-hero-grid" aria-hidden="true" />
            <motion.div
              className="lp-hero-copy lp-clear-copy"
              style={reduceMotion ? undefined : { y: heroCopyY }}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="lp-eyebrow">
                <span className="lp-dot" /> YOUR TASKS, TIME AND FOCUS — TOGETHER
              </span>
              <h1>
                Plan your day.
                <HeroTypingLine />
              </h1>
              <p>
                Planny puts your tasks, projects and routines in one clear
                workspace. Add what you need to do, choose what matters, and
                focus on one step at a time.
              </p>
              <div className="lp-clear-actions">
                <button className="lp-primary" onClick={go}>
                  Make my first plan <ArrowRight size={18} />
                </button>
                <a href="#how">
                  See how it works <ArrowUpRight size={16} />
                </a>
              </div>
              <div className="lp-clear-proof" aria-label="What Planny helps with">
                <span><Check size={14} /> See every task clearly</span>
                <span><Check size={14} /> Plan around your real time</span>
                <span><Check size={14} /> Stay focused without the clutter</span>
              </div>
            </motion.div>

            <motion.div
              className="lp-product-preview"
              style={reduceMotion ? undefined : { rotateX: demoRotateX, rotateY: demoRotateY, y: heroDemoY }}
              initial={reduceMotion ? false : { opacity: 0, y: 28, scale: .97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: .2, duration: .8, ease: [0.22, 1, 0.36, 1] }}
              onPointerMove={(event) => {
                if (reduceMotion || event.pointerType === "touch") return;
                const rect = event.currentTarget.getBoundingClientRect();
                demoRotateY.set(((event.clientX - rect.left) / rect.width - .5) * 3);
                demoRotateX.set(-((event.clientY - rect.top) / rect.height - .5) * 2.5);
              }}
              onPointerLeave={() => {
                demoRotateX.set(0);
                demoRotateY.set(0);
              }}
            >
              <div className="lp-preview-windowbar">
                <span><i /><i /><i /></span>
                <small>YOUR DAY IN PLANNY</small>
                <b>Today</b>
              </div>
              <div className="lp-preview-welcome">
                <div>
                  <small>GOOD MORNING</small>
                  <strong>Here’s your clear plan.</strong>
                  <p>3 tasks · 2 hours 15 minutes</p>
                </div>
                <span>68% ready</span>
              </div>
              <div className="lp-preview-layout">
                <div className="lp-preview-tasks">
                  <div className="lp-preview-label"><span>Today</span><small>3 TASKS</small></div>
                  {[
                    ["Finish the project outline", "Project · 45 min", "NOW"],
                    ["Revise physics chapter 4", "Study · 60 min", "NEXT"],
                    ["Go for a short workout", "Routine · 30 min", "6:30 PM"],
                  ].map(([title, meta, badge], index) => (
                    <div className="lp-preview-task" key={title}>
                      <i className={index === 0 ? "active" : ""}>{index === 0 ? "✓" : ""}</i>
                      <span><strong>{title}</strong><small>{meta}</small></span>
                      <b>{badge}</b>
                    </div>
                  ))}
                </div>
                <div className="lp-preview-aside">
                  <span><Sparkles size={15} /> PLANNY SUGGESTS</span>
                  <strong>Start with the outline.</strong>
                  <p>It is due first and fits the time you have now.</p>
                  <button>Start focus <ArrowRight size={14} /></button>
                </div>
              </div>
              <div className="lp-preview-nav">
                <span className="active">Today</span><span>Projects</span><span>Focus</span><span>Assistant</span>
              </div>
            </motion.div>
          </section>

          <div className="lp-ribbon lp-clear-ribbon" aria-label="Planny workflow">
            <div className="lp-ribbon-track">
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1}>
                  <span>CAPTURE IT</span><b>→</b><span>PLAN IT</span><b>→</b>
                  <span>FOCUS</span><b>→</b><span>FINISH</span><b>✳</b>
                </div>
              ))}
            </div>
          </div>

          <Reveal id="how" className="lp-section lp-simple-process">
            <div className="lp-simple-heading">
              <span className="lp-eyebrow">HOW PLANNY HELPS</span>
              <h2>From “I have too much to do” to a clear next step.</h2>
              <p>You do not need to build a perfect system. Start with what is already in your head.</p>
            </div>
            <div className="lp-process-grid">
              {[
                ["01", "Add everything", "Write tasks quickly, save ideas in Brain dump, or group bigger work into projects.", <ListChecks size={25} />],
                ["02", "Make a realistic plan", "Add time estimates, priorities and deadlines. Planny shows what needs attention first.", <CalendarCheck2 size={25} />],
                ["03", "Focus and finish", "Start a focus session, mark work done, and see how your time and progress improve.", <TimerReset size={25} />],
              ].map(([number, title, copy, icon], index) => (
                <motion.article key={String(number)}
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }}
                  transition={{ duration: .5, delay: index * .12 }}
                  style={{ "--tone": colors[index] } as React.CSSProperties}>
                  <div><span>{number}</span>{icon}</div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </motion.article>
              ))}
            </div>
          </Reveal>

          <Reveal className="lp-section lp-simple-change">
            <div className="lp-change-card is-before">
              <span className="lp-eyebrow">WITHOUT PLANNY</span>
              <h3>Everything is competing for your attention.</h3>
              <ul>
                <li>Tasks in different apps and chats</li>
                <li>No idea what to start first</li>
                <li>Plans that ignore how much time you have</li>
                <li>Unfinished work gets forgotten</li>
              </ul>
            </div>
            <div className="lp-change-arrow" aria-hidden="true">→</div>
            <div className="lp-change-card is-after">
              <span className="lp-eyebrow">WITH PLANNY</span>
              <h3>You open one page and know what matters.</h3>
              <ul>
                <li><Check size={16} /> Tasks organized by project</li>
                <li><Check size={16} /> Priorities, time and deadlines together</li>
                <li><Check size={16} /> Routines appear every day automatically</li>
                <li><Check size={16} /> Unfinished tasks carry forward</li>
              </ul>
            </div>
          </Reveal>

          <Reveal id="product" className="lp-section lp-simple-features">
            <div className="lp-simple-heading">
              <span className="lp-eyebrow">ONE WORKSPACE, SIX SIMPLE TOOLS</span>
              <h2>Everything you need to plan, without making planning another job.</h2>
            </div>
            <div className="lp-feature-card-grid">
              {[
                ["Today", "See today’s tasks, grouped by project, with unplanned work kept separate.", <CalendarCheck2 size={23} />],
                ["Projects", "Break a big outcome into small tasks and track progress in one place.", <FolderKanban size={23} />],
                ["Routines", "Keep daily habits visible without carrying yesterday’s routine into today.", <Repeat2 size={23} />],
                ["Focus", "Run a focus timer and understand your progress by day, week, month and year.", <TimerReset size={23} />],
                ["Brain dump", "Save a thought before it disappears, then decide what to do with it later.", <BrainCircuit size={23} />],
                ["Assistant", "Ask for the next task, a realistic plan or smaller steps using your workspace context.", <Sparkles size={23} />],
              ].map(([title, copy, icon], index) => (
                <article key={String(title)} style={{ "--tone": colors[index] } as React.CSSProperties}>
                  <span>{icon}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal id="ai" className="lp-section lp-simple-ai">
            <div>
              <span className="lp-eyebrow">AN ASSISTANT THAT KNOWS YOUR WORKSPACE</span>
              <h2>Less guessing. A clear next step.</h2>
              <p>
                Ask what to work on, break a task into steps, or plan tomorrow.
                Planny uses your tasks and available time to help. You approve the changes.
              </p>
              <div className="lp-ai-points">
                <span><Check size={15} /> “What should I do in the next 45 minutes?”</span>
                <span><Check size={15} /> “Break my assignment into smaller tasks.”</span>
                <span><Check size={15} /> “Plan tomorrow around my deadlines.”</span>
              </div>
            </div>
            <div className="lp-chat-preview">
              <div><img src="/planny-icon.svg" alt="" /><span><strong>Planny Assistant</strong><small>Uses your workspace context</small></span><i /></div>
              <motion.p className="user"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .6 }}
                transition={{ duration: .45, delay: .15 }}
              >I have one hour. What should I work on?</motion.p>
              <motion.p className="assistant"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .6 }}
                transition={{ duration: .5, delay: .55 }}
              >
                Start with <strong>Finish the project outline</strong>. It is due tomorrow and needs 45 minutes.
                You will still have 15 minutes to review your notes.
              </motion.p>
              <div className="lp-chat-action"><span>Suggested action</span><strong>Start 45-minute focus session</strong><button>Review action</button></div>
            </div>
          </Reveal>

          <Reveal id="try-planny" className="lp-section lp-simple-demo">
            <div className="lp-demo-explainer">
              <span className="lp-eyebrow">TRY IT BEFORE YOU SIGN UP</span>
              <h2>Turn the tasks in your head into a simple starting plan.</h2>
              <p>
                Type one task per line. Planny will separate them, suggest time estimates,
                and let you edit everything before creating an account.
              </p>
              <small>No account required for this preview.</small>
            </div>
            <PlanDemo onSave={save} compact />
          </Reveal>

          <Reveal className="lp-section lp-simple-usecases">
            <div className="lp-simple-heading">
              <span className="lp-eyebrow">BUILT FOR REAL DAYS</span>
              <h2>Useful whether you study, work, build, or do all three.</h2>
            </div>
            <div>
              {[
                ["Students", "Keep assignments, revision, routines and personal goals in the same plan.", "Revise chapter 4, draft my lab report, and fit in a workout"],
                ["Professionals", "Turn deliverables and follow-ups into a day you can actually complete.", "Prepare the client presentation, review the proposal, and reply to feedback"],
                ["Builders", "Move a project forward without losing the ideas, notes and small tasks around it.", "Research my product idea, sketch the homepage, and test the signup flow"],
              ].map(([title, copy, prompt], index) => (
                <article key={title} style={{ "--tone": colors[index + 2] } as React.CSSProperties}>
                  <span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p>
                  <button onClick={() => save({ version: 1, problem: title, tasks: draftTasks(prompt) })}>
                    Use this example <ArrowUpRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal id="faq" className="lp-section lp-simple-faq">
            <div>
              <span className="lp-eyebrow">QUICK ANSWERS</span>
              <h2>What you should know before starting.</h2>
            </div>
            <div>
              {[
                ["Is Planny just another to-do list?", "No. Tasks are only the starting point. Planny connects projects, recurring routines, focus sessions, notes and an assistant that uses your workspace context."],
                ["Can I use it on my phone and laptop?", "Yes. Open planny.in in your browser and sign in with the same account. Your saved workspace follows you between devices."],
                ["Will unfinished tasks disappear?", "No. Unfinished regular tasks move forward automatically. Routines do not duplicate because each day already has its own routine instance."],
                ["Can the assistant change my tasks by itself?", "No. It shows a proposed action first. You decide whether to apply it."],
                ["Do I have to plan everything at once?", "No. Add one task, give it a realistic time estimate, and start there. You can add projects and routines only when you need them."],
              ].map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}<span aria-hidden="true">+</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </Reveal>

          <Reveal id="access" className="lp-section lp-simple-final">
            <span className="lp-final-spark">✳</span>
            <span className="lp-eyebrow">START SMALL. GET CLEAR.</span>
            <h2>Your next task should feel obvious.</h2>
            <p>Add what is on your mind. Planny will help you turn it into a plan you can follow.</p>
            <button className="lp-primary" onClick={go}>Make my first plan <ArrowRight size={18} /></button>
            <small>Try the planning preview free · Create an account when you are ready to save</small>
          </Reveal>
        </main>
        <footer className="lp-footer">
          <a href="#" className="lp-brand">
            <img src="/planny-icon.svg" alt="" />
            planny
          </a>
          <span>One place for your tasks. One clear next step.</span>
          <small>© {new Date().getFullYear()} Planny</small>
        </footer>
        {mode && (
          <div
            className="lp-auth-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) setMode(null);
            }}
          >
            <div
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="lp-auth-title"
              className="lp-auth"
            >
              <button
                className="lp-close"
                aria-label="Close"
                onClick={() => setMode(null)}
              >
                <X />
              </button>
              <img src="/planny-icon.svg" alt="" />
              <span className="lp-eyebrow">YOUR PLANNY WORKSPACE</span>
              <h2 id="lp-auth-title">
                {mode === "signup" ? "Create your free account." : "Welcome back."}
              </h2>
              <p>
                {mode === "signup"
                  ? "Save your tasks, projects and routines, then open them from any device."
                  : "Log in to open your tasks, projects and daily plan."}
              </p>
              <form onSubmit={submit}>
                {mode === "signup" && (
                  <label>
                    Your name
                    <input
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                )}
                <label>
                  Email
                  <input
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    type="password"
                    minLength={mode === "signup" ? 8 : undefined}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                {status && <p role="status">{status}</p>}
                <button disabled={busy} className="lp-primary lp-full">
                  {busy
                    ? "One moment…"
                    : mode === "signup"
                      ? "Create my account"
                      : "Open my Planny"}
                  <ArrowRight size={16} />
                </button>
              </form>
              <button
                className="lp-auth-switch"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  setStatus(null);
                }}
              >
                {mode === "signup"
                  ? "Already have an account? Log in"
                  : "New here? Create an account"}
              </button>
              {mode === "login" && (
                <button
                  className="lp-auth-switch"
                  disabled={busy}
                  onClick={async () => {
                    if (!email.trim()) {
                      setStatus("Enter your email above first.");
                      return;
                    }
                    setBusy(true);
                    try {
                      const r = await resetPassword(email.trim());
                      setStatus(
                        r.error || "Check your inbox for a reset link.",
                      );
                    } catch {
                      setStatus("Could not send the link. Please retry.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
};
