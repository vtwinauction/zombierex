import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminListVendors } from "@/lib/admin.functions";

const STATUSES = ["pending", "info_requested", "approved", "rejected", "all"] as const;
type StatusFilter = (typeof STATUSES)[number];

const listQuery = (status: StatusFilter) =>
  queryOptions({
    queryKey: ["admin-vendors", status],
    queryFn: () => adminListVendors({ data: { status, limit: 50 } }),
  });

export const Route = createFileRoute("/_authenticated/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors · ZOMBIEREX Admin" },
      { name: "description", content: "Approve, verify and manage vendor accounts." },
      { property: "og:title", content: "Vendors · ZOMBIEREX Admin" },
      { property: "og:description", content: "Approve, verify and manage vendor accounts." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery("pending")),
  component: AdminVendors,
});

function AdminVendors() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const qc = useQueryClient();
  qc.ensureQueryData(listQuery(status));
  const { data: rows } = useSuspenseQuery(listQuery(status));

  return (
    <div className="px-5">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="chip shrink-0"
            style={{
              background: status === s ? "var(--color-obsidian)" : "transparent",
              color: status === s ? "var(--color-neon)" : "var(--color-silver)",
              borderColor: status === s ? "var(--color-obsidian)" : "var(--color-hair-strong)",
            }}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {rows.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--color-silver)" }}>
            No vendors in this queue.
          </p>
        )}
        {rows.map((v: any) => (
          <Link
            key={v.id}
            to="/admin/vendors/$id"
            params={{ id: v.id }}
            className="surface-1 lift-1 block p-4"
            style={{ borderRadius: 8 }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="serif truncate text-lg italic" style={{ color: "var(--color-ink)" }}>
                  {v.business_name}
                </p>
                <p className="mono-tag mt-1 truncate" style={{ color: "var(--color-silver)" }}>
                  {v.business_type.replace(/_/g, " ")} · {v.city ?? "—"}
                  {v.country ? `, ${v.country}` : ""}
                </p>
              </div>
              <span
                className="mono-tag shrink-0"
                style={{
                  color:
                    v.verification_status === "approved"
                      ? "var(--color-neon)"
                      : v.verification_status === "rejected"
                        ? "#ff7c5b"
                        : "var(--color-silver)",
                }}
              >
                {v.verification_status.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: "var(--color-silver)" }}>
              Submitted {v.submitted_at ? new Date(v.submitted_at).toLocaleDateString() : "—"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
