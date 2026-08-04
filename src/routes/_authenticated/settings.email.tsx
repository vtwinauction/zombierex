import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsScreen, Card, Field, TextInput, PrimaryButton } from "@/components/SettingsScreen";

export const Route = createFileRoute("/_authenticated/settings/email")({
  head: () => ({
    meta: [
      { title: "Email · Settings · ZOMBIEREX" },
      { name: "description", content: "Change the email you use to sign in to ZOMBIEREX." },
    ],
  }),
  component: EmailPage,
});

function EmailPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrent(data.user?.email ?? ""));
  }, []);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) {
      setErr("Enter a valid email address");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: next });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Confirmation link sent. Check both inboxes to complete the change.");
  };

  return (
    <SettingsScreen
      index="06.01"
      section="EMAIL"
      title="Email address"
      subtitle="The email you use to sign in."
    >
      <div className="space-y-3">
        <Card>
          <Field label="Current">
            <TextInput value={current} readOnly />
          </Field>
        </Card>
        <Card>
          <div className="space-y-3">
            <Field label="New email">
              <TextInput
                type="email"
                autoComplete="email"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="you@example.com"
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
            <PrimaryButton onClick={submit} disabled={busy || !next}>
              {busy ? "Sending…" : "Send confirmation"}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </SettingsScreen>
  );
}
