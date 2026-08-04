import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsScreen, Card, Field, TextInput, PrimaryButton } from "@/components/SettingsScreen";

export const Route = createFileRoute("/_authenticated/settings/password")({
  head: () => ({
    meta: [
      { title: "Password · Settings · ZOMBIEREX" },
      { name: "description", content: "Change your ZOMBIEREX account password." },
    ],
  }),
  component: PasswordPage,
});

function PasswordPage() {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (next.length < 8) {
      setErr("Use at least 8 characters");
      return;
    }
    if (next !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setMsg("Password updated.");
      setNext("");
      setConfirm("");
    }
  };

  return (
    <SettingsScreen
      index="06.02"
      section="PASSWORD"
      title="Change password"
      subtitle="Pick something strong — at least 8 characters."
    >
      <Card>
        <div className="space-y-3">
          <Field label="New password">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {err && (
            <p className="text-[12px]" style={{ color: "#ff8080" }}>
              {err}
            </p>
          )}
          {msg && (
            <p className="text-[12px]" style={{ color: "var(--color-neon)" }}>
              {msg}
            </p>
          )}
          <PrimaryButton onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </PrimaryButton>
        </div>
      </Card>
    </SettingsScreen>
  );
}
