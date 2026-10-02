import React, { useEffect, useState } from "react";
import { isRealSupabaseConfigured } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { X, Mail, Lock, User, ArrowRight, Check } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
}) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setMessage(null);
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        const res = await signIn(email, password);
        if (res.error) setError(res.error);
        else onClose();
      } else if (mode === "signup") {
        const res = await signUp(email, password, fullName);
        if (res.error) setError(res.error);
        else if (res.requiresConfirmation)
          setMessage(
            "Account created. Check your email to confirm your address, then sign in.",
          );
        else onClose();
      } else if (mode === "forgot") {
        const res = await resetPassword(email);
        if (res.error) setError(res.error);
        else setMessage("Password reset instructions sent to your email.");
      }
    } catch (err: any) {
      setError(err?.message || "Authentication error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-surface-100 border border-surface-border p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand header */}
        <div className="flex items-center space-x-2.5 mb-6">
          <img src="/planny-icon.svg" alt="" className="w-10 h-10 rounded-xl" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Planny OS
            </h2>
            <p className="text-xs text-muted-foreground">
              Cross-Platform AI Productivity
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium text-foreground">
            {mode === "login"
              ? "Welcome back"
              : mode === "signup"
                ? "Create an account"
                : "Reset password"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "login"
              ? "Access your tasks, routines, and memory across all devices"
              : mode === "signup"
                ? "Sync instantly across Mac, Windows, iOS, and Android"
                : "Enter your email to receive recovery instructions"}
          </p>
        </div>

        {!isRealSupabaseConfigured() && (
          <p className="text-xs text-muted-foreground mb-4">
            Local workspace mode. No cloud account or password authentication is
            active until Supabase is connected.
          </p>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Yatharth Vishnoi"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-surface-200 border border-surface-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface-200 border border-surface-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-surface-200 border border-surface-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>
              {isLoading
                ? "Processing..."
                : mode === "login"
                  ? "Sign In"
                  : mode === "signup"
                    ? "Create Account"
                    : "Send Instructions"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-indigo-400 font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-indigo-400 font-medium hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
