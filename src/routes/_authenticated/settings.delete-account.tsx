import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete account · ZOMBIEREX" },
      {
        name: "description",
        content: "Permanently delete your ZOMBIEREX account and all associated data.",
      },
      { property: "og:title", content: "Delete account · ZOMBIEREX" },
      { property: "og:description", content: "Permanently delete your ZOMBIEREX account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const navigate = useNavigate();
  const call = useServerFn(deleteMyAccount);
  const [ack, setAck] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canDelete = ack && confirm === "DELETE";

  async function onDelete() {
    if (!canDelete) return;
    setErr(null);
    setBusy(true);
    try {
      await call({ data: { confirm: "DELETE" } });
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Deletion failed. Contact support@zombierex.com.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-6 pb-24">
      <Link to="/settings" className="mono-tag" style={{ color: "var(--color-titanium)" }}>
        ← Settings
      </Link>

      <h1 className="serif mt-3 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
        Delete account
      </h1>
      <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
        This permanently removes your account and personal data from ZOMBIEREX.
      </p>

      <section
        className="mt-6 rounded-lg p-4"
        style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}
      >
        <p className="mono-tag" style={{ color: "#ff8080" }}>
          WHAT GETS DELETED
        </p>
        <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "var(--color-ash)" }}>
          <li>• Your profile, handle, bio, avatar and cover photo</li>
          <li>• All your posts, reels, comments and reactions</li>
          <li>• Your marketplace listings, ride logs and drag runs</li>
          <li>• Your saved routes, follows, direct messages and notifications</li>
          <li>• Payment tokens (transaction history retained for legal compliance)</li>
        </ul>
        <p className="mt-4 text-[12px]" style={{ color: "var(--color-silver)" }}>
          Deletion completes within 30 days. Some abuse-prevention logs are retained up to 90 days.
          Content that others have re-shared may remain visible in their copies.
        </p>
      </section>

      <section className="mt-5 space-y-3">
        <label className="flex items-start gap-3 text-[13px]" style={{ color: "var(--color-ink)" }}>
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1"
          />
          <span>I understand this action is permanent and cannot be undone.</span>
        </label>

        <label className="block">
          <span className="mono-tag text-xs" style={{ color: "var(--color-silver)" }}>
            TYPE "DELETE" TO CONFIRM
          </span>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.toUpperCase())}
            autoComplete="off"
            className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm tracking-widest"
            style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-ink)" }}
            placeholder="DELETE"
          />
        </label>

        {err && (
          <p className="text-sm" style={{ color: "#ff8080" }}>
            {err}
          </p>
        )}

        <button
          onClick={onDelete}
          disabled={!canDelete || busy}
          className="tap w-full rounded-lg px-4 py-3 text-[13px] font-medium"
          style={{
            background: canDelete ? "rgba(255,80,80,0.12)" : "transparent",
            border: "1px solid rgba(255,80,80,0.6)",
            color: canDelete ? "#ff5050" : "#7a5555",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Deleting…" : "Permanently delete my account"}
        </button>

        <Link
          to="/settings"
          className="tap block w-full rounded-lg px-4 py-3 text-center text-[13px]"
          style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}
        >
          Keep my account
        </Link>
      </section>
    </div>
  );
}
