import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · ZOMBIEREX" },
      { name: "description", content: "Sign in or create your ZOMBIEREX account." },
    ],
  }),
  validateSearch: (raw): { redirect?: string } => {
    const r = typeof raw.redirect === "string" && raw.redirect.startsWith("/") ? raw.redirect : undefined;
    return r ? { redirect: r } : {};
  },
  component: AuthPage,
});

function safeDest(d: string | undefined): string {
  // Only same-origin paths, never /auth itself.
  if (!d || !d.startsWith("/") || d.startsWith("//") || d.startsWith("/auth")) return "/";
  return d;
}

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

function ageInYears(dob: string): number {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return -1;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function AuthPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { redirect: rawDest } = Route.useSearch();
  const dest = safeDest(rawDest);

  // If already signed in, bounce to the intended destination.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: dest, replace: true });
    });
  }, [navigate, dest]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const parsedEmail = emailSchema.parse(email);
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMsg("Check your inbox for a reset link.");
      } else if (mode === "signup") {
        const parsedPassword = passwordSchema.parse(password);
        const age = ageInYears(dob);
        if (age < 0) throw new Error("Enter your date of birth.");
        if (age < 13) throw new Error("You must be at least 13 years old to sign up.");
        if (!agree) throw new Error("Please accept the Terms and Privacy Policy to continue.");
        const { error } = await supabase.auth.signUp({
          email: parsedEmail,
          password: parsedPassword,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: displayName || parsedEmail.split("@")[0], dob, tos_accepted_at: new Date().toISOString() },
          },
        });
        if (error) throw error;
        setMsg("Account ready. Signing you in…");
        router.invalidate();
        navigate({ to: "/", replace: true });
      } else {
        const parsedPassword = passwordSchema.parse(password);
        const { error } = await supabase.auth.signInWithPassword({
          email: parsedEmail,
          password: parsedPassword,
        });
        if (error) throw error;
        router.invalidate();
        navigate({ to: "/", replace: true });
      }
    } catch (e) {
      const message =
        e instanceof z.ZodError ? e.errors[0]?.message ?? "Invalid input"
        : e instanceof Error ? e.message
        : "Something went wrong";
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    setErr(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      router.invalidate();
      navigate({ to: "/", replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>ZOMBIEREX · ACCESS</p>
          <h1 className="mt-2 display-xl text-3xl">
            {mode === "signin" ? "Enter the paddock" : mode === "signup" ? "Claim your handle" : "Reset access"}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ash)" }}>
            {mode === "signin" ? "Sign in to continue." : mode === "signup" ? "Free. Takes 20 seconds." : "We'll email you a reset link."}
          </p>
        </div>

        {mode !== "forgot" && (
          <div className="space-y-2">
            <button
              onClick={() => oauth("google")}
              disabled={busy}
              className="btn-ghost w-full justify-center"
              type="button"
            >
              Continue with Google
            </button>
            <button
              onClick={() => oauth("apple")}
              disabled={busy}
              className="btn-ghost w-full justify-center"
              type="button"
            >
              Continue with Apple
            </button>
            <div className="flex items-center gap-3 py-2">
              <span className="h-px flex-1" style={{ background: "var(--color-hairline)" }} />
              <span className="mono-tag text-xs" style={{ color: "var(--color-ash)" }}>OR</span>
              <span className="h-px flex-1" style={{ background: "var(--color-hairline)" }} />
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <label className="block">
              <span className="mono-tag text-xs" style={{ color: "var(--color-ash)" }}>DISPLAY NAME</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-hairline)" }}
                placeholder="Rex Rider"
              />
            </label>
          )}
          <label className="block">
            <span className="mono-tag text-xs" style={{ color: "var(--color-ash)" }}>EMAIL</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-hairline)" }}
              placeholder="you@ride.com"
            />
          </label>
          {mode !== "forgot" && (
            <label className="block">
              <span className="mono-tag text-xs" style={{ color: "var(--color-ash)" }}>PASSWORD</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-hairline)" }}
                placeholder="At least 8 characters"
              />
            </label>
          )}

          {mode === "signup" && (
            <>
              <label className="block">
                <span className="mono-tag text-xs" style={{ color: "var(--color-ash)" }}>DATE OF BIRTH</span>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink)", colorScheme: "dark" }}
                />
                <span className="mt-1 block text-[11px]" style={{ color: "var(--color-ash)" }}>
                  You must be at least 13 to sign up.
                </span>
              </label>

              <label className="flex items-start gap-2 pt-1 text-xs" style={{ color: "var(--color-ash)" }}>
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I agree to the{" "}
                  <Link to="/legal/terms" className="underline" style={{ color: "var(--color-neon)" }}>Terms</Link>,{" "}
                  <Link to="/legal/privacy" className="underline" style={{ color: "var(--color-neon)" }}>Privacy Policy</Link>, and{" "}
                  <Link to="/legal/community-guidelines" className="underline" style={{ color: "var(--color-neon)" }}>Community Guidelines</Link>.
                </span>
              </label>
            </>
          )}

          {err && <p className="text-sm" style={{ color: "var(--color-heat)" }}>{err}</p>}
          {msg && <p className="text-sm" style={{ color: "var(--color-neon)" }}>{msg}</p>}

          <button type="submit" disabled={busy} className="btn-solid w-full justify-center">
            {busy ? "…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>

        <div className="flex justify-between text-xs" style={{ color: "var(--color-ash)" }}>
          {mode === "signin" ? (
            <>
              <button onClick={() => setMode("forgot")} className="underline underline-offset-2">Forgot?</button>
              <button onClick={() => setMode("signup")} className="underline underline-offset-2">Create account</button>
            </>
          ) : (
            <button onClick={() => setMode("signin")} className="underline underline-offset-2">Back to sign in</button>
          )}
        </div>

        <div className="text-center">
          <Link to="/" className="mono-tag text-xs underline underline-offset-2" style={{ color: "var(--color-ash)" }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
