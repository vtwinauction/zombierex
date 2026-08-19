import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandMark, MissionLabel } from "@/components/zx/Brand";
import hangarBg from "@/assets/hangar-access.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · ZOMBIEREX" },
      { name: "description", content: "Sign in or create your ZOMBIEREX account." },
    ],
  }),
  validateSearch: (raw): { redirect?: string } => {
    const r =
      typeof raw.redirect === "string" && raw.redirect.startsWith("/") ? raw.redirect : undefined;
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
            data: {
              full_name: displayName || parsedEmail.split("@")[0],
              dob,
              tos_accepted_at: new Date().toISOString(),
            },
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
        e instanceof z.ZodError
          ? (e.errors[0]?.message ?? "Invalid input")
          : e instanceof Error
            ? e.message
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

  const heading =
    mode === "signin" ? "System access" : mode === "signup" ? "New rider clearance" : "Access recovery";
  const sub =
    mode === "signin"
      ? "Authenticate to enter the ZombieRex network."
      : mode === "signup"
        ? "Provision your rider identity. Takes 20 seconds."
        : "We'll transmit a reset link to your inbox.";

  return (
    <div
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5 py-12"
      style={{ background: "var(--color-paper-1)" }}
    >
      {/* cinematic hangar plate, washed into the light hull */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-cover bg-center"
        style={{
          backgroundImage: `url(${hangarBg})`,
          opacity: 0.3,
          maskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.55) 55%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.55) 55%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(72% 46% at 50% 0%, color-mix(in oklab, var(--color-neon) 12%, transparent), transparent 72%)",
        }}
      />
      {/* engineering grid */}
      <div
        aria-hidden
        className="hud-grid-fine pointer-events-none absolute inset-0 opacity-70"
        style={{
          maskImage: "radial-gradient(78% 62% at 50% 38%, #000, transparent 88%)",
          WebkitMaskImage: "radial-gradient(78% 62% at 50% 38%, #000, transparent 88%)",
        }}
      />

      {/* corner mission markers */}
      <div className="pointer-events-none absolute inset-4 hidden sm:block">
        <span className="mono-tag absolute left-0 top-0">ZX · ACCESS TERMINAL</span>
        <span className="mono-tag absolute right-0 top-0">LAT 26.2°N / LON 50.6°E</span>
        <span className="mono-tag absolute bottom-0 left-0">BUILD v1.0 · SECURE CHANNEL</span>
        <span className="mono-tag absolute bottom-0 right-0" style={{ color: "var(--color-neon)" }}>
          ◆ ONLINE
        </span>
      </div>

      <div className="relative w-full max-w-md space-y-5">
        <div className="boot-line flex flex-col items-center text-center">
          <BrandMark size={104} treatment="scan" />
          <h1
            className="display-xl mt-5 text-[34px] uppercase tracking-[0.14em]"
            style={{ color: "var(--color-ink-0)" }}
          >
            ZOMBIE<span style={{ color: "var(--color-neon)" }}>REX</span>
          </h1>
          <p className="mono-tag mt-2 tracking-[0.38em]">{heading}</p>
        </div>


        <div className="panel-tech bracketed notch space-y-5 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b pb-3">
            <MissionLabel>
              {mode === "signin" ? "AUTH · 01" : mode === "signup" ? "ENROL · 02" : "RECOVER · 03"}
            </MissionLabel>
            <span className="mono-tag">{sub.length > 0 ? "SECURE" : ""}</span>
          </div>

          <p className="text-[13px]" style={{ color: "var(--color-ash)" }}>
            {sub}
          </p>

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
                <span className="etch flex-1" />
                <span className="mono-tag">OR</span>
                <span className="etch flex-1" />
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="mono-tag">CALLSIGN</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  className="zx-input mt-1"
                  placeholder="Rex Rider"
                />
              </label>
            )}
            <label className="block">
              <span className="mono-tag">EMAIL</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="zx-input mt-1"
                placeholder="you@ride.com"
              />
            </label>
            {mode !== "forgot" && (
              <label className="block">
                <span className="mono-tag">PASSKEY</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="zx-input mt-1"
                  placeholder="At least 8 characters"
                />
              </label>
            )}

            {mode === "signup" && (
              <>
                <label className="block">
                  <span className="mono-tag">DATE OF BIRTH</span>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="zx-input mt-1"
                    style={{ colorScheme: "light" }}
                  />
                  <span className="mt-1 block text-[11px]" style={{ color: "var(--color-ash)" }}>
                    You must be at least 13 to sign up.
                  </span>
                </label>

                <label
                  className="flex items-start gap-2 pt-1 text-xs"
                  style={{ color: "var(--color-ash)" }}
                >
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      to="/legal/terms"
                      className="underline"
                      style={{ color: "var(--color-neon)" }}
                    >
                      Terms
                    </Link>
                    ,{" "}
                    <Link
                      to="/legal/privacy"
                      className="underline"
                      style={{ color: "var(--color-neon)" }}
                    >
                      Privacy Policy
                    </Link>
                    , and{" "}
                    <Link
                      to="/legal/community-guidelines"
                      className="underline"
                      style={{ color: "var(--color-neon)" }}
                    >
                      Community Guidelines
                    </Link>
                    .
                  </span>
                </label>
              </>
            )}

            {err && (
              <p
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  color: "var(--color-heat)",
                  background: "rgba(225,29,42,0.06)",
                  border: "1px solid rgba(225,29,42,0.28)",
                }}
                role="alert"
              >
                ⚠ {err}
              </p>
            )}
            {msg && (
              <p className="text-sm" style={{ color: "var(--color-neon)" }}>
                ✓ {msg}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-neon w-full justify-center">
              {busy
                ? "AUTHENTICATING…"
                : mode === "signin"
                  ? "ACCESS PLATFORM"
                  : mode === "signup"
                    ? "PROVISION ACCOUNT"
                    : "SEND RESET LINK"}
            </button>
          </form>

          <div className="flex justify-between text-xs" style={{ color: "var(--color-ash)" }}>
            {mode === "signin" ? (
              <>
                <button onClick={() => setMode("forgot")} className="underline underline-offset-2">
                  Forgot passkey?
                </button>
                <button onClick={() => setMode("signup")} className="underline underline-offset-2">
                  Request clearance
                </button>
              </>
            ) : (
              <button onClick={() => setMode("signin")} className="underline underline-offset-2">
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* system telemetry strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ["SYSTEM", "ONLINE"],
            ["NETWORK", "CONNECTED"],
            ["SECURITY", "ACTIVE"],
          ].map(([k, v]) => (
            <div key={k} className="panel-tech px-2 py-2 text-center">
              <p className="mono-tag" style={{ fontSize: 8.5 }}>
                {k}
              </p>
              <p
                className="readout mt-0.5 text-[10px] font-bold tracking-[0.14em]"
                style={{ color: "var(--color-neon)" }}
              >
                {v}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/" className="mono-tag underline underline-offset-2">
            ← RETURN TO BASE
          </Link>
        </div>
      </div>
    </div>
  );
}
