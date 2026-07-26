import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { exportMyData } from "@/lib/data-export.functions";

export const Route = createFileRoute("/_authenticated/settings/export")({
  head: () => ({ meta: [
    { title: "Download my data · ZOMBIEREX" },
    { name: "robots", content: "noindex" },
    { name: "description", content: "Export a copy of your ZOMBIEREX data." },
  ] }),
  component: ExportPage,
});

function ExportPage() {
  const run = useServerFn(exportMyData);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const bundle = await run();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zombierex-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data bundle is downloading.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 py-6">
      <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ PRIVACY</p>
      <h1 className="serif mt-2 text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
        Download <span className="italic" style={{ color: "var(--color-neon)" }}>my data</span>
      </h1>
      <p className="mt-3 text-[13px]" style={{ color: "var(--color-silver)" }}>
        A single JSON file containing everything you own: profile, vehicles, posts, comments,
        follows, listings, orders, rides, routes, drag runs, DMs you sent, achievements, and
        emergency contacts. Prepared on demand — nothing is stored server-side.
      </p>

      <button onClick={download} disabled={busy} className="btn-solid mt-6">
        {busy ? "Preparing…" : "Download JSON"}
      </button>

      <p className="mt-6 text-[11px]" style={{ color: "var(--color-silver)" }}>
        Under GDPR / CCPA you may also request account deletion. Go to
        Settings → Account for that irreversible flow.
      </p>
    </div>
  );
}
