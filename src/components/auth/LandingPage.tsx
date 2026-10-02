import React, { useState } from "react";
import { ArrowRight, CalendarDays, Sparkles, Timer, Zap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const LandingPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const result = mode === "signup" ? await signUp(email, password, name) : await signIn(email, password);
    setBusy(false);
    if (result.error) setStatus(result.error);
    else if ("requiresConfirmation" in result && result.requiresConfirmation) setStatus("Check your email once to confirm your account, then sign in here.");
  };

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <div className="landing-logo"><img src="/planny-icon.svg" alt="" /><span>Planny</span></div>
        <button onClick={() => setMode(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "I already have an account" : "Create an account"}</button>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker"><Zap size={14} /> Your day, finally on your side</span>
          <h1>Less planning.<br /><em>More finishing.</em></h1>
          <p>Planny remembers how you work, finds what matters next, and turns messy thoughts into a day you can actually finish.</p>
          <div className="landing-proof">
            <span><Sparkles size={16} /> Personal AI that remembers</span>
            <span><CalendarDays size={16} /> Tasks that fit your real schedule</span>
            <span><Timer size={16} /> Focus without the noise</span>
          </div>
        </div>
        <div className="landing-signup">
          <div className="landing-card-accent">✳</div>
          <p className="landing-step">START IN ABOUT A MINUTE</p>
          <h2>{mode === "signup" ? "Build a day that works." : "Welcome back."}</h2>
          <p>{mode === "signup" ? "Answer a few quick questions after signup and Planny will shape itself around you." : "Your tasks, preferences and assistant memory are waiting."}</p>
          <form onSubmit={submit}>
            {mode === "signup" && <label>Your name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="What should Planny call you?" /></label>}
            <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            {status && <p className="landing-status" role="status">{status}</p>}
            <button className="landing-submit" disabled={busy}>{busy ? "One moment…" : mode === "signup" ? "Start building my day" : "Open my Planny"}<ArrowRight size={17} /></button>
          </form>
          <button className="landing-switch" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setStatus(null); }}>{mode === "signup" ? "Already use Planny? Sign in" : "New here? Create your account"}</button>
        </div>
      </section>
      <div className="landing-marquee"><span>CAPTURE → PLAN → FOCUS → FINISH</span><span>CALMER DAYS · CLEARER PRIORITIES · REAL PROGRESS</span></div>
    </main>
  );
};
