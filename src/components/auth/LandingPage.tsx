import React, { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Sparkles,
  X,
  Bell,
  Menu,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./landing.css";

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
function draftTasks(text: string) {
  return text
    .split(/[,;\n]+|\band\b/i)
    .map((t) => t.trim().replace(/^(and|then)\s+/i, ""))
    .filter(Boolean)
    .slice(0, 5)
    .map((title, i) => ({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      minutes: [45, 60, 30, 25, 30][i],
    }));
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
      initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.section>
  );
}
function PlanDemo({
  onSave,
  compact = false,
}: {
  onSave: (text: string) => void;
  compact?: boolean;
}) {
  const [step, setStep] = useState(compact ? 1 : 0);
  const [problem, setProblem] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => {
    if (step !== 2) return;
    const timer = window.setTimeout(() => setStep(3), 1100);
    return () => clearTimeout(timer);
  }, [step]);
  const tasks = draftTasks(text);
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
            <span>0{i + 1}</span>
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
              <span className="lp-eyebrow">LET’S START WITH YOU</span>
              <h2>
                What’s your biggest
                <br />
                productivity problem?
              </h2>
              <div className="lp-options">
                {problems.map((p, i) => (
                  <button
                    key={p}
                    aria-pressed={problem === i}
                    onClick={() => setProblem(i)}
                  >
                    <span className="lp-radio">
                      {problem === i && <Check size={12} />}
                    </span>
                    {p}
                  </button>
                ))}
              </div>
              <button
                className="lp-primary lp-full"
                disabled={problem === null}
                onClick={() => setStep(1)}
              >
                Let’s untangle it <ArrowRight size={17} />
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <button className="lp-back" onClick={() => setStep(0)}>
                <ChevronLeft size={14} /> Back
              </button>
              <h2>{questions[problem ?? 0]}</h2>
              <p>No perfect wording needed. Just get it out.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (text.trim()) setStep(2);
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
                <button className="lp-primary lp-full" disabled={!text.trim()}>
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
              <div className="lp-result">
                {tasks.map((task, i) => (
                  <motion.button
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    onClick={() =>
                      setDone(
                        done.includes(i)
                          ? done.filter((n) => n !== i)
                          : [...done, i],
                      )
                    }
                    aria-pressed={done.includes(i)}
                    style={{ "--tile": colors[i] } as React.CSSProperties}
                  >
                    <span className="lp-task-check">
                      {done.includes(i) ? <Check size={14} /> : i + 1}
                    </span>
                    <strong
                      style={{
                        textDecoration: done.includes(i)
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {task.title}
                    </strong>
                    <small>{task.minutes}m</small>
                  </motion.button>
                ))}
              </div>
              <small className="lp-disclosure">
                Local sample · suggested estimates, not an AI-generated
                schedule.
              </small>
              <button
                className="lp-primary lp-full"
                onClick={() => onSave(text)}
              >
                Save my plan <ArrowRight size={17} />
              </button>
              <button
                className="lp-back"
                onClick={() => {
                  setDone([]);
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
  const [mode, setMode] = useState<"signup" | "login" | null>(null);
  const [status, setStatus] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  const [organized, setOrganized] = useState(false),
    [menu, setMenu] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const go = () => {
    document
      .getElementById("try-planny")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setMenu(false);
  };
  const save = (text: string) => {
    try {
      localStorage.setItem("planny_landing_draft", text);
    } catch {}
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
      <div className="lp">
        <header className="lp-nav">
          <a className="lp-brand" href="#">
            <img src="/planny-icon.svg" alt="" />
            planny<span>✳</span>
          </a>
          <nav aria-label="Website" className={menu ? "is-open" : ""}>
            <a href="#product" onClick={() => setMenu(false)}>
              Product
            </a>
            <a href="#how" onClick={() => setMenu(false)}>
              How it works
            </a>
            <a href="#ai" onClick={() => setMenu(false)}>
              AI
            </a>
            <a href="#access" onClick={() => setMenu(false)}>
              Early access
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
              Get started <ArrowUpRight size={16} />
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
        <main>
          <section className="lp-hero">
            <div className="lp-hero-copy">
              <span className="lp-eyebrow">
                <span className="lp-dot" /> LESS MENTAL TABS. MORE REAL LIFE.
              </span>
              <h1>
                Stop keeping
                <br />
                your life inside
                <br />
                <span>your head.</span>
                <svg viewBox="0 0 400 22" aria-hidden="true">
                  <path d="M4 16 Q170 1 390 10 M80 21 Q230 6 370 13" />
                </svg>
              </h1>
              <p>
                Planny turns your goals, tasks, deadlines and ideas into a
                simple plan — so you always know what to do next.
              </p>
              <div className="lp-hero-note">
                <span>↳</span> Start with whatever’s on your mind.
                <br />
                No account. No perfect plan. Just you.
              </div>
              <div className="lp-floating-note">
                <span>✳</span> Room to think.
                <br />
                <strong>Space to do.</strong>
              </div>
            </div>
            <div id="try-planny">
              <PlanDemo onSave={save} />
            </div>
          </section>
          <div className="lp-ribbon">
            <span>LESS OVERTHINKING</span>
            <b>✳</b>
            <span>MORE DOING</span>
            <b>✳</b>
            <span>A LITTLE STRUCTURE</span>
            <b>✳</b>
            <span>A LOT MORE YOU</span>
            <b>✳</b>
          </div>
          <Reveal id="product" className="lp-section lp-chaos">
            <div className="lp-section-intro">
              <span className="lp-eyebrow">01 / CLOSE THE MENTAL TABS</span>
              <h2>
                You don’t have a<br />
                productivity problem.
                <br />
                <span>
                  You have too much
                  <br />
                  to think about.
                </span>
              </h2>
              <p>
                The deadline. The idea at 2 AM. That thing you promised to do.
                Give it all somewhere to go.
              </p>
              <button
                className="lp-text-button"
                onClick={() => setOrganized(!organized)}
              >
                {organized ? "Scatter it again" : "Make some room"}{" "}
                <ArrowRight size={18} />
              </button>
            </div>
            <div className={`lp-chaos-board ${organized ? "organized" : ""}`}>
              <div className="lp-board-label">
                {organized
                  ? "YOUR DAY, WITH A LITTLE DIRECTION"
                  : "SOUND FAMILIAR?"}
              </div>
              {[
                "Exam next week",
                "That big idea…",
                "Reply to Sam",
                "Project due Friday",
                "Move my body",
                "Where did I save it?",
              ].map((t, i) => (
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 75, damping: 16 }}
                  className={`lp-chaos-note note-${i}`}
                  key={t}
                  style={{ "--tile": colors[i] } as React.CSSProperties}
                >
                  <span>
                    {organized ? (
                      <Check size={15} />
                    ) : (
                      ["↗", "✳", "↳", "!", "♡", "?"][i]
                    )}
                  </span>
                  {t}
                  {organized && (
                    <small>
                      {
                        ["09:00", "10:00", "11:00", "14:00", "18:00", "Later"][
                          i
                        ]
                      }
                    </small>
                  )}
                </motion.div>
              ))}
              <button
                className="lp-organize"
                onClick={() => setOrganized(!organized)}
              >
                <Sparkles size={17} />
                {organized ? "Ahh. That’s better." : "Turn chaos into a plan"}
              </button>
            </div>
          </Reveal>
          <Reveal id="how" className="lp-section lp-transform">
            <span className="lp-eyebrow">02 / ONE HOME FOR EVERYTHING</span>
            <h2>Turn chaos into a plan.</h2>
            <div className="lp-transform-line">
              <div className="lp-sources">
                {[
                  "Notes",
                  "WhatsApp messages",
                  "Screenshots",
                  "Random reminders",
                  "Mental notes",
                  "Multiple calendars",
                ].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <span className="lp-flow-arrow">⟶</span>
              <div className="lp-workspace">
                <img src="/planny-icon.svg" alt="" />
                <strong>One organized workspace.</strong>
                <p>Capture → Plan → Focus → Finish</p>
              </div>
            </div>
          </Reveal>
          <Reveal id="ai" className="lp-section lp-ai">
            <div>
              <span className="lp-eyebrow">03 / THINK OUT LOUD</span>
              <h2>
                Tell Planny
                <br />
                what you want.
                <br />
                <span>Find your next move.</span>
              </h2>
              <p>
                Start messy. Get specific. In your workspace, your assistant
                uses your tasks and remembered preferences to help you plan.
              </p>
              <ul>
                <li>
                  <Check /> Context that stays with you
                </li>
                <li>
                  <Check /> Small steps for big ideas
                </li>
                <li>
                  <Check /> You confirm every change
                </li>
              </ul>
              <span className="lp-caption">
                Try the local planning preview →
              </span>
            </div>
            <PlanDemo onSave={save} compact />
          </Reveal>
          <Reveal className="lp-section lp-goals">
            <span className="lp-eyebrow">
              04 / SMALL STEPS. ACTUAL PROGRESS.
            </span>
            <h2>
              Big goals need
              <br />
              <span>small actions.</span>
            </h2>
            <div className="lp-goal-title">
              <span>↗</span>
              <h3>Build my first real product</h3>
              <span className="lp-example-tag">EXAMPLE PROJECT</span>
            </div>
            <div className="lp-goal-steps">
              {[
                "Research",
                "Design",
                "Authentication",
                "Database",
                "Dashboard",
                "Testing",
                "Launch",
              ].map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09 }}
                >
                  <span style={{ color: colors[i % 6] }}>0{i + 1}</span>
                  <strong>{s}</strong>
                  <div>
                    <i
                      style={{
                        width: `${Math.max(12, 100 - i * 17)}%`,
                        background: colors[i % 6],
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
          <Reveal className="lp-section lp-insights">
            <div className="lp-chart">
              <div className="lp-chart-top">
                <span>YOUR WEEK, IN PERSPECTIVE</span>
                <small>Illustrative preview</small>
              </div>
              <div className="lp-chart-number">
                12<span>h</span> 30<span>m</span>
                <small>of time made intentional</small>
              </div>
              <div className="lp-bars">
                {[35, 65, 45, 88, 58, 100, 40].map((h, i) => (
                  <div key={i}>
                    <motion.i
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.07 }}
                      style={{ background: colors[i % 6] }}
                    />
                    <span>{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                  </div>
                ))}
              </div>
              <div className="lp-chart-key">
                <span>● Study</span>
                <span>● Projects</span>
                <span>● Personal</span>
              </div>
            </div>
            <div>
              <span className="lp-eyebrow">05 / MAKE TIME VISIBLE</span>
              <h2>
                Know where
                <br />
                your day goes.
              </h2>
              <p>
                Estimate your tasks, make space for focused work, and reflect on
                what you finished. Progress feels better when you can see it.
              </p>
              <div className="lp-reminders">
                <h3>
                  Planny remembers.
                  <br />
                  You get to breathe.
                </h3>
                {[
                  "Physics revision starts in 15 minutes.",
                  "Your project deadline is tomorrow.",
                  "Make a little room for your goal today.",
                ].map((t, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                  >
                    <Bell size={16} />
                    <span>{t}</span>
                  </motion.div>
                ))}
                <small>
                  Example reminders · delivery depends on your device settings.
                </small>
              </div>
            </div>
          </Reveal>
          <Reveal className="lp-section lp-life">
            <span className="lp-eyebrow">A LIFE DOESN’T FIT IN ONE LIST</span>
            <h2>
              Your tasks. Your goals.
              <br />
              Your time. <span>Your life.</span>
            </h2>
            <div>
              {[
                "Study",
                "Work",
                "Health",
                "Goals",
                "Projects",
                "Ideas",
                "Habits",
              ].map((t, i) => (
                <span
                  key={t}
                  style={{ "--tile": colors[i % 6] } as React.CSSProperties}
                >
                  {["✎", "↗", "♡", "◎", "▧", "✳", "↻"][i]} {t}
                </span>
              ))}
            </div>
            <p>Different parts of you. One place to bring them together.</p>
          </Reveal>
          <Reveal className="lp-section lp-day">
            <div>
              <span className="lp-eyebrow">
                06 / TOMORROW CAN FEEL DIFFERENT
              </span>
              <h2>
                Wake up.
                <br />
                Know what’s next.
                <br />
                <span>Get on with living.</span>
              </h2>
              <p>
                A little intention. Enough breathing room.
                <br />A day that feels like yours.
              </p>
              <span className="lp-day-sticker">
                MAKE ROOM
                <br />
                FOR REAL LIFE ↗
              </span>
            </div>
            <div className="lp-timeline">
              <div className="lp-timeline-top">
                A DAY WITH DIRECTION <span>Sample day</span>
              </div>
              {[
                ["09:00", "Physics revision", "45 min · Deep focus"],
                ["10:00", "Build something", "Coding · 90 min"],
                [
                  "12:30",
                  "Lunch & a little reset",
                  "Yes, breaks belong here too",
                ],
                [
                  "15:00",
                  "Move the project forward",
                  "One meaningful next step",
                ],
                ["18:30", "Move your body", "30 min · Just for you"],
                ["21:00", "A moment for tomorrow", "Review, then switch off"],
              ].map(([time, title, desc], i) => (
                <motion.div
                  key={time}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <time>{time}</time>
                  <i style={{ background: colors[i] }} />
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
          <Reveal id="features" className="lp-section lp-feature-guide">
            <span className="lp-eyebrow">GET TO KNOW YOUR WORKSPACE</span>
            <h2>
              Everything has a place.
              <br />
              <span>Including your next step.</span>
            </h2>
            <p>
              Start with a single task. Add the structure you need as your day,
              projects, and goals grow.
            </p>
            <div className="lp-feature-rows">
              {[
                [
                  "01",
                  "Today & Upcoming",
                  "See what needs your attention",
                  "Today brings current and overdue work together. Upcoming gives you a wider view so you can plan ahead instead of discovering deadlines at the last minute.",
                  "Try it: capture three things you want to finish today.",
                ],
                [
                  "02",
                  "Projects & subtasks",
                  "Make the big thing smaller",
                  "Group related tasks into a project, break work into smaller steps, and keep deadlines, priorities, and time estimates alongside the work itself.",
                  "Try it: split an assignment into research, outline, and a first draft.",
                ],
                [
                  "03",
                  "Assistant",
                  "A planning partner with context",
                  "Ask what to work on next, plan around the time you have, or turn an idea into tasks. Your assistant uses your workspace and saved conversation context. Proposed changes wait for your confirmation.",
                  "Try it: ‘I have 45 minutes. What should I focus on?’",
                ],
                [
                  "04",
                  "Focus & daily review",
                  "Give one thing your attention",
                  "Start a focus session from a task, then review what you finished at the end of the day. Use the result to make your next plan more realistic.",
                  "Try it: one task, one focused session, then a proper break.",
                ],
                [
                  "05",
                  "Routines",
                  "Give repeat work a rhythm",
                  "Keep recurring habits and regular responsibilities together with your tasks. Build consistency with a routine you can actually fit into your day.",
                  "Try it: a short evening review or a regular study session.",
                ],
                [
                  "06",
                  "Brain dump, notes & links",
                  "Catch the thought before it disappears",
                  "Brain dump is a place for loose ideas. Notes and links hold the reference material you want to return to, while search helps you find your way back.",
                  "Try it: save the idea now. Decide what to do with it later.",
                ],
              ].map(([n, label, title, description, tip], i) => (
                <article
                  key={n}
                  className="lp-feature-row"
                  style={{ "--tile": colors[i] } as React.CSSProperties}
                >
                  <span className="lp-feature-number">{n}</span>
                  <div>
                    <span className="lp-eyebrow">{label}</span>
                    <h3>{title}</h3>
                  </div>
                  <div>
                    <p>{description}</p>
                    <small>{tip}</small>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
          <Reveal className="lp-section lp-use-cases">
            <span className="lp-eyebrow">BUILT AROUND YOUR REAL DAY</span>
            <h2>
              Different lives.
              <br />
              <span>The same need for clarity.</span>
            </h2>
            <div className="lp-use-grid">
              {[
                [
                  "For students",
                  "More than the next deadline.",
                  "Bring assignments, exam revision, personal projects, and downtime into the same picture.",
                  "Revise chapter 4, draft my lab report, and fit in a workout",
                ],
                [
                  "For working professionals",
                  "Keep the important work visible.",
                  "Break deliverables into steps, track follow-ups, and protect time for work that needs your full attention.",
                  "Prepare the client presentation, review the proposal, and reply to feedback",
                ],
                [
                  "For builders & freelancers",
                  "Move the project forward.",
                  "Turn a rough idea into a project, collect useful resources, and choose a manageable next action.",
                  "Research my product idea, sketch the homepage, and test the signup flow",
                ],
              ].map(([label, title, description, prompt], i) => (
                <article
                  key={label}
                  style={{ "--tile": colors[i] } as React.CSSProperties}
                >
                  <span className="lp-eyebrow">{label}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <button
                    className="lp-text-button"
                    onClick={() => save(prompt)}
                  >
                    Start with this plan <ArrowUpRight size={16} />
                  </button>
                </article>
              ))}
            </div>
          </Reveal>
          <Reveal id="faq" className="lp-section lp-faq">
            <div>
              <span className="lp-eyebrow">
                A FEW THINGS YOU MIGHT BE WONDERING
              </span>
              <h2>
                Less guessing.
                <br />
                <span>More getting started.</span>
              </h2>
            </div>
            <div>
              {[
                [
                  "Do I have to sign up to try Planny?",
                  "No. The planning previews on this page work without an account. Create an account when you want your own workspace. The thoughts you enter in the preview are carried into your first-task setup on this device.",
                ],
                [
                  "Is the homepage demo using AI?",
                  "The homepage is a local interactive preview: it separates your input into sample tasks and shows suggested estimates. The assistant inside your signed-in workspace uses AI and your workspace context.",
                ],
                [
                  "Can the AI change my tasks by itself?",
                  "The assistant presents proposed actions for you to review and confirm. You stay in control of whether those changes are applied.",
                ],
                [
                  "Will Planny remember our conversations?",
                  "The assistant saves conversation history and a compact set of context and preferences for your account. It uses a bounded amount of context for each request, so it may not recall every detail of an old conversation.",
                ],
                [
                  "Can I use it on my laptop and phone?",
                  "Yes. Open planny.in in your browser and sign in to the same account. Your workspace syncs through your account, so you can return to your tasks from another device.",
                ],
                [
                  "What happens if my connection drops?",
                  "Task edits are kept on your device while they wait to sync. Reconnect to save pending changes to your account. The cloud AI assistant needs an internet connection.",
                ],
                [
                  "How should I start without overplanning?",
                  "Add one task you genuinely want to finish, give it a realistic estimate, and start a focus session. Projects, routines, and the assistant are there when you need more structure.",
                ],
              ].map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </Reveal>
          <Reveal id="access" className="lp-section lp-access">
            <span className="lp-eyebrow">EARLY DAYS. BIG POSSIBILITIES.</span>
            <h2>
              Help shape a calmer
              <br />
              way to get things done.
            </h2>
            <p>
              Planny is growing. Be part of it from the beginning.
              <br />
              Built for real days, and the people living them.
            </p>
            <button className="lp-text-button" onClick={go}>
              Try it for yourself <ArrowUpRight size={18} />
            </button>
          </Reveal>
          <Reveal className="lp-section lp-final">
            <span className="lp-final-spark">✳</span>
            <h2>
              Your next productive
              <br />
              day starts <span>here.</span>
            </h2>
            <p>
              Stop trying to remember everything.
              <br />
              Give your goals a plan.
            </p>
            <button className="lp-primary" onClick={go}>
              Build my first plan <ArrowUpRight size={19} />
            </button>
            <a href="#product">Explore Planny</a>
            <small>Free to try the demo · No signup needed</small>
          </Reveal>
        </main>
        <footer className="lp-footer">
          <a href="#" className="lp-brand">
            <img src="/planny-icon.svg" alt="" />
            planny
          </a>
          <span>A little less chaos. A little more you.</span>
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
              <span className="lp-eyebrow">YOUR NEXT CHAPTER</span>
              <h2 id="lp-auth-title">
                {mode === "signup" ? "Make space for you." : "Welcome back."}
              </h2>
              <p>
                {mode === "signup"
                  ? "Create your account to bring your plan into Planny."
                  : "Your workspace is right where you left it."}
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
