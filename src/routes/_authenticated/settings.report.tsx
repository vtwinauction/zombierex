import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsScreen, Card, Field, TextInput, PrimaryButton } from "@/components/SettingsScreen";

export const Route = createFileRoute("/_authenticated/settings/report")({
  head: () => ({
    meta: [
      { title: "Report a problem · Settings · ZOMBIEREX" },
      { name: "description", content: "Tell us if something isn't working on ZOMBIEREX." },
    ],
  }),
  component: ReportPage,
});

const CATEGORIES = ["Bug", "Payment", "Account", "Safety", "Feedback", "Other"];
const LS_KEY = "zombierex.reports.v1";

function ReportPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (!subject.trim() || !body.trim()) {
      setErr("Please add a subject and description.");
      return;
    }
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const payload = {
        user_id: userRes.user?.id ?? null,
        category,
        subject: subject.trim(),
        body: body.trim(),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        url: typeof window !== "undefined" ? window.location.href : "",
        created_at: new Date().toISOString(),
      };
      // Best-effort persist; fall back to local queue.
      let stored = false;
      try {
        const { error } = await supabase.from("feedback_reports" as any).insert(payload as any);
        stored = !error;
      } catch {}
      if (!stored) {
        const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        list.push(payload);
        localStorage.setItem(LS_KEY, JSON.stringify(list));
      }
      setSubject("");
      setBody("");
      setMsg(
        "Thanks — your report is in. We'll follow up at your registered email if we need more info.",
      );
    } catch (e: any) {
      setErr(e?.message ?? "Could not send report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsScreen
      index="06.12"
      section="REPORT"
      title="Report a problem"
      subtitle="Tell us what happened. Screenshots help a lot."
    >
      <Card>
        <div className="space-y-3">
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-[14px]"
              style={{
                background: "var(--color-graphite)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-hair-strong)",
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <TextInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary"
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-[14px]"
              style={{
                background: "var(--color-graphite)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-hair-strong)",
              }}
              placeholder="What happened, what you expected, and steps to reproduce."
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
            {busy ? "Sending…" : "Send report"}
          </PrimaryButton>
        </div>
      </Card>
    </SettingsScreen>
  );
}
