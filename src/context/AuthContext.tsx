import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isRealSupabaseConfigured } from "../lib/supabase";
import { syncEngine } from "../lib/sync";
import type { Profile } from "../types/database";

type User = { id: string; email: string };
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password?: string,
    fullName?: string,
  ) => Promise<{ error?: string; requiresConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  completeOnboarding: (data: {
    fullName: string;
    areas: string[];
    persona: string;
    wastedHours: string;
    taskSystem: string;
    blockers: string[];
    planningStyle: string;
    taskBehavior: string;
    routines: Array<{ title: string; time: string }>;
  }) => Promise<void>;
}
const makeProfile = (user: User): Profile => ({
  id: user.id,
  email: user.email,
  full_name: user.email ? user.email.split("@")[0] : "My workspace",
  avatar_url: null,
  start_of_day: "08:00",
  end_of_day: "22:00",
  reminder_preference: "at_time",
  theme: "light",
  managed_areas: ["Study", "Work", "Personal"],
  onboarding_completed: true,
  onboarding_data: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    let revision = 0;
    let appliedUserId: string | null | undefined;
    const apply = async (next: User | null) => {
      const nextUserId = next?.id || null;
      // Supabase emits token/session refresh events when a background tab is
      // revisited. The same account is already hydrated, so clearing and
      // reloading it would briefly remount onboarding.
      if (appliedUserId !== undefined && appliedUserId === nextUserId) return;
      appliedUserId = nextUserId;
      const current = ++revision;
      if (!alive) return;
      syncEngine.setUser(nextUserId);
      setUser(next);
      setProfile(null);
      if (next) {
        let value = makeProfile(next);
        try {
          const cached = localStorage.getItem(`orbit_profile:${next.id}`);
          if (cached) value = JSON.parse(cached);
          else if (!isRealSupabaseConfigured()) {
            const legacy = JSON.parse(
              localStorage.getItem("orbit_user_profile") || "null",
            );
            if (legacy?.id === next.id) value = legacy;
          }
          if (isRealSupabaseConfigured()) {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", next.id)
              .single();
            if (data && !error) value = data;
          }
        } catch (error) {
          console.warn("Profile cache unavailable", error);
        }
        if (!alive || current !== revision) return;
        if (localStorage.getItem(`planny_onboarding_complete:${next.id}`))
          value = { ...value, onboarding_completed: true };
        value = { ...value, theme: "light" };
        setProfile(value);
        try {
          localStorage.setItem(
            `orbit_profile:${next.id}`,
            JSON.stringify(value),
          );
        } catch {}
      }
      if (alive && current === revision) setIsLoading(false);
    };
    let unsubscribe = () => {};
    if (isRealSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        // Never await another Supabase call within its auth callback.
        window.setTimeout(() => {
          if (alive)
            void apply(
              session?.user
                ? { id: session.user.id, email: session.user.email || "" }
                : null,
            );
        }, 0);
      });
      unsubscribe = () => subscription.unsubscribe();
      void supabase.auth.getSession().then(({ data, error }) => {
        if (alive && revision === 0)
          void apply(
            !error && data.session?.user
              ? {
                  id: data.session.user.id,
                  email: data.session.user.email || "",
                }
              : null,
          );
      });
    } else {
      let local: User = { id: "user-default", email: "" };
      try {
        const cached = localStorage.getItem("orbit_auth_user");
        if (cached) local = JSON.parse(cached);
      } catch {}
      void apply(local);
    }
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    delete document.documentElement.dataset.style;
    localStorage.removeItem("orbit_interface_style");
  }, []);
  const localSignIn = (email: string, name?: string, onboarding = true) => {
    // Local accounts are device workspaces, not password-protected cloud identities.
    const id = `local:${email.trim().toLowerCase()}`;
    const next = { id, email: email.trim() };
    let value = {
      ...makeProfile(next),
      full_name: name || email.split("@")[0],
      onboarding_completed: onboarding,
    };
    try {
      const cached = localStorage.getItem(`orbit_profile:${id}`);
      if (cached) value = JSON.parse(cached);
    } catch {}
    syncEngine.setUser(id);
    setUser(next);
    setProfile(value);
    localStorage.setItem("orbit_auth_user", JSON.stringify(next));
    localStorage.setItem(`orbit_profile:${id}`, JSON.stringify(value));
    return {};
  };
  const signIn = async (email: string, password?: string) => {
    if (!isRealSupabaseConfigured()) return localSignIn(email);
    if (!password) return { error: "Enter your password." };
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? { error: error.message } : {};
  };
  const signUp = async (email: string, password?: string, name?: string) => {
    if (!isRealSupabaseConfigured()) return localSignIn(email, name, false);
    if (!password) return { error: "Enter a password." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name || email.split("@")[0] } },
    });
    return error
      ? { error: error.message }
      : { requiresConfirmation: !data.session };
  };
  const signOut = async () => {
    if (isRealSupabaseConfigured()) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    syncEngine.setUser(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem("orbit_auth_user");
  };
  const resetPassword = async (email: string) => {
    if (!isRealSupabaseConfigured())
      return {
        error:
          "Password recovery is available after connecting Supabase. Local workspaces do not use passwords.",
      };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return error ? { error: error.message } : {};
  };
  const saveProfile = async (value: Profile) => {
    // Persist first so setup remains complete during a slow/offline cloud save.
    setProfile(value);
    localStorage.setItem(`orbit_profile:${value.id}`, JSON.stringify(value));
    if (isRealSupabaseConfigured()) {
      const { error } = await supabase.from("profiles").upsert(value);
      if (error)
        console.warn("Profile cloud sync will retry later", error.message);
    }
  };
  const completeOnboarding: AuthContextType["completeOnboarding"] = async (data) => {
    if (profile) {
      const value = {
        ...profile,
        full_name: data.fullName.trim() || profile.full_name,
        managed_areas: data.areas,
        onboarding_completed: true,
        onboarding_data: data,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(`planny_onboarding_complete:${profile.id}`, "1");
      await saveProfile(value);
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isOnboarded:
          !!profile?.onboarding_completed ||
          !!(user &&
            localStorage.getItem(`planny_onboarding_complete:${user.id}`)),
        signIn,
        signUp,
        signOut,
        resetPassword,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}
