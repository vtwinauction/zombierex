import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminGetVendor, adminSetVendorStatus } from "@/lib/admin.functions";

const vendorQuery = (id: string) =>
  queryOptions({ queryKey: ["admin-vendor", id], queryFn: () => adminGetVendor({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/admin/vendors/$id")({
  head: () => ({
    meta: [
      { title: "Vendor Detail · ZOMBIEREX Admin" },
      { name: "description", content: "Review vendor profile, plans, and verification." },
      { property: "og:title", content: "Vendor Detail · ZOMBIEREX Admin" },
      { property: "og:description", content: "Review vendor profile, plans, and verification." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(vendorQuery(params.id)),
  component: AdminVendorDetail,
  errorComponent: ({ error, reset }) => (
    <div className="p-6 text-foreground">
      <p className="text-sm text-red-500">Failed to load vendor: {error.message}</p>
      <button onClick={reset} className="mt-3 border border-border px-3 py-1 text-xs">
        Retry
      </button>
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-foreground">Vendor not found.</div>,
});

function AdminVendorDetail() {
  const { id } = Route.useParams();
  const { data: vendor } = useSuspenseQuery(vendorQuery(id));
  const setStatus = useServerFn(adminSetVendorStatus);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [busy, setBusy] = useState<null | "approve" | "reject" | "info">(null);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!vendor) return <div className="px-5 text-[12px]">Not found.</div>;
  const v = vendor;

  async function act(status: "approved" | "rejected" | "info_requested", label: typeof busy) {
    setBusy(label);
    setErr(null);
    try {
      await setStatus({ data: { id: v.id, status, notes: notes || undefined } });
      await qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      await qc.invalidateQueries({ queryKey: ["admin-stats"] });
      await qc.invalidateQueries({ queryKey: ["admin-vendor", v.id] });
      nav({ to: "/admin/vendors" });
    } catch (e: any) {
      setErr(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-5 pb-24">
      <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
        VENDOR · {String(v.verification_status ?? "draft").toUpperCase()}
      </p>
      <h1 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
        {v.business_name}
      </h1>
      <p className="mono-tag mt-1" style={{ color: "var(--color-silver)" }}>
        {v.business_type.replace(/_/g, " ")} · {v.slug}
      </p>

      <div
        className="surface-1 lift-1 mt-4 p-4 space-y-2 text-[12px]"
        style={{ borderRadius: 8, color: "var(--color-silver)" }}
      >
        <Row k="Legal name" v={v.legal_name} />
        <Row k="Owner" v={v.owner_name} />
        <Row k="Email" v={v.email} />
        <Row k="Phone" v={v.phone} />
        <Row k="Website" v={v.website} />
        <Row k="Trade license" v={v.trade_license_no} />
        <Row k="Tax number" v={v.tax_number} />
        <Row
          k="Address"
          v={
            [v.address_line1, v.city, v.region, v.country, v.postal_code]
              .filter(Boolean)
              .join(", ") || null
          }
        />
        <Row k="Service areas" v={(v.service_areas ?? []).join(", ") || null} />
      </div>

      {v.description && (
        <>
          <p className="mono-tag mt-4" style={{ color: "var(--color-silver)" }}>
            DESCRIPTION
          </p>
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink)" }}>
            {v.description}
          </p>
        </>
      )}

      <p className="mono-tag mt-6" style={{ color: "var(--color-silver)" }}>
        DECISION NOTES
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Optional — shown to the vendor for info requests or rejections."
        className="mt-2 w-full px-3 py-2 text-[13px]"
        style={{
          background: "transparent",
          border: "1px solid var(--color-hair-strong)",
          borderRadius: 6,
          color: "var(--color-ink)",
        }}
      />

      {err && (
        <div
          className="mt-3 rounded px-3 py-2 text-[12px]"
          style={{ background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.4)" }}
        >
          {err}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => act("approved", "approve")}
          disabled={!!busy}
          className="tap py-3 text-[12px] font-semibold uppercase tracking-wider"
          style={{
            background: "var(--color-neon)",
            color: "var(--color-obsidian)",
            borderRadius: 6,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy === "approve" ? "…" : "Approve"}
        </button>
        <button
          onClick={() => act("info_requested", "info")}
          disabled={!!busy}
          className="tap py-3 text-[12px] font-semibold uppercase tracking-wider"
          style={{
            background: "transparent",
            color: "var(--color-ink)",
            border: "1px solid var(--color-hair-strong)",
            borderRadius: 6,
          }}
        >
          {busy === "info" ? "…" : "Request info"}
        </button>
        <button
          onClick={() => act("rejected", "reject")}
          disabled={!!busy}
          className="tap py-3 text-[12px] font-semibold uppercase tracking-wider"
          style={{
            background: "transparent",
            color: "#ff7c5b",
            border: "1px solid rgba(255,124,91,0.5)",
            borderRadius: 6,
          }}
        >
          {busy === "reject" ? "…" : "Reject"}
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex gap-3">
      <span className="mono-tag w-28 shrink-0">{k}</span>
      <span style={{ color: v ? "var(--color-ink)" : "var(--color-silver)" }}>{v ?? "—"}</span>
    </div>
  );
}
