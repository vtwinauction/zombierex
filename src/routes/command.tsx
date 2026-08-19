import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getMyClearance } from "@/lib/command.functions";

/**
 * Standalone Mission Control sign-in. Separate from the consumer /auth
 * screen: no sign-up, no social providers, and access is refused unless the
 * account carries administrator scopes.
 */
export const Route = createFileRoute("/command")({
  head: () => ({
    meta: [
      { title: "Mission Control Access · ZOMBIEREX" },
      {
        name: "description",
        content: "Restricted administrator sign-in for the ZOMBIEREX Mission Control console.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Mission Control Access · ZOMBIEREX" },
      { property: "og:description", content: "Restricted ZOMBIEREX administrator console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommandAccess,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

const TEST_OPERATOR = { email: "rex.command@zombierex.com", password: "ZmbRx#Cmd2026!x7" };

function CommandAccess() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Verify clearance for the current session; deny (and sign out) otherwise.
  async function gate(afterSignIn: boolean) {
    try {
      const c = await getMyClearance();
      if (c?.hasAny) {
        await navigate({ to: "/owner/command", replace: true });
        return true;
      }
      if (afterSignIn) {
        await supabase.auth.signOut();
        setErr("This account has no administrator clearance.");
      }
    } catch {
      if (afterSignIn) setErr("Could not verify clearance. Try again.");
    }
    return false;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (data.user) await gate(false);
      if (alive) setChecking(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const em = emailSchema.safeParse(email);
    if (!em.success) return setErr(em.error.issues[0]!.message);
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) return setErr(pw.error.issues[0]!.message);

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: em.data,
      password: pw.data,
    });
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    await gate(true);
    setBusy(false);
  }

  return (
    <div
      className="hud-grid relative grid min-h-svh place-items-center px-5 py-12"
      style={{ background: "var(--color-paper-1, #fafafa)", color: "var(--color-ink)" }}
    >
      <div className="w-full max-w-sm">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ RESTRICTED · MISSION CONTROL
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">System Access</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-silver)" }}>
          Administrator credentials only. All access attempts are logged.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-3 p-4"
          style={{
            background: "var(--color-graphite, #f2f2f0)",
            border: "1px solid var(--color-hair)",
            borderRadius: 14,
          }}
        >
          <label className="block">
            <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
              OPERATOR ID
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="admin@zombierex.com"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--color-paper-1)", border: "1px solid var(--color-hair)" }}
            />
          </label>
          <label className="block">
            <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
              ACCESS KEY
            </span>
            <div className="relative mt-1">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2 pr-16 text-sm"
                style={{ background: "var(--color-paper-1)", border: "1px solid var(--color-hair)" }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px]"
                style={{ color: "var(--color-silver)" }}
              >
                {showPw ? "HIDE" : "SHOW"}
              </button>
            </div>
          </label>

          <button
            type="button"
            onClick={() => {
              setErr(null);
              setEmail(TEST_OPERATOR.email);
              setPassword(TEST_OPERATOR.password);
            }}
            className="tap w-full px-3 py-2 text-[12px]"
            style={{
              background: "transparent",
              border: "1px dashed var(--color-hair)",
              borderRadius: 10,
              color: "var(--color-silver)",
            }}
          >
            Fill test operator credentials
          </button>


          {err && (
            <p className="text-sm" style={{ color: "var(--color-heat, #c53030)" }}>
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || checking}
            className="tap w-full px-3 py-2.5 text-sm"
            style={{
              background: "var(--color-neon)",
              color: "var(--color-ink)",
              borderRadius: 10,
              fontWeight: 600,
              opacity: busy || checking ? 0.7 : 1,
            }}
          >
            {checking ? "Checking session…" : busy ? "Authenticating…" : "Authenticate"}
          </button>
        </form>

        <p className="mt-4 text-[11px]" style={{ color: "var(--color-silver)" }}>
          Not an administrator? Use the standard{" "}
          <a href="/auth" style={{ textDecoration: "underline" }}>
            member sign-in
          </a>
          .
        </p>
      </div>
    </div>
  );
}
