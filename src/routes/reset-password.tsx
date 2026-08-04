import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password · ZOMBIEREX" },
      { name: "description", content: "Set a new password for your ZOMBIEREX account." },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const parsed = passwordSchema.parse(password);
      const { error } = await supabase.auth.updateUser({ password: parsed });
      if (error) throw error;
      setOk(true);
      setTimeout(() => navigate({ to: "/", replace: true }), 1200);
    } catch (e) {
      setErr(
        e instanceof z.ZodError
          ? (e.errors[0]?.message ?? "Invalid input")
          : e instanceof Error
            ? e.message
            : "Failed to reset",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
            ZOMBIEREX · RESET
          </p>
          <h1 className="mt-2 display-xl text-3xl">New credentials</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ash)" }}>
            Choose a strong password. Minimum 8 characters.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mono-tag text-xs" style={{ color: "var(--color-ash)" }}>
              NEW PASSWORD
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-hairline)" }}
            />
          </label>
          {err && (
            <p className="text-sm" style={{ color: "var(--color-heat)" }}>
              {err}
            </p>
          )}
          {ok && (
            <p className="text-sm" style={{ color: "var(--color-neon)" }}>
              Updated. Redirecting…
            </p>
          )}
          <button type="submit" disabled={busy || ok} className="btn-solid w-full justify-center">
            {busy ? "…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
