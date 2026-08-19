import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { confirmDialog, promptDialog } from "@/lib/confirm";
import {
  BarChart,
  BarMeter,
  CockpitHeader,
  Gauge,
  Lamp,
} from "@/components/command/instruments";
import {
  checkOwner,
  getOwnerMetrics,
  listOwnerFlags,
  setFeatureFlag,
  getMaintenance,
  setGlobalMaintenance,
  setModuleMaintenance,
  listUsersForOwner,
  setUserSuspension,
  setUserVerified,
  setUserRoles,
  listBroadcasts,
  createBroadcast,
  dismissBroadcast,
  listRecentPosts,
  setPostHidden,
  listOpenReports,
  resolveReport,
  listAuditLog,
} from "@/lib/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/")({
  head: () => ({
    meta: [
      { title: "Owner Control Center · ZOMBIEREX" },
      {
        name: "description",
        content: "Super Administrator control center — full platform authority.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Owner Control Center · ZOMBIEREX" },
      { property: "og:description", content: "Platform-wide command and audit." },
    ],
  }),
  component: OwnerConsole,
});

type Tab = "overview" | "flags" | "maintenance" | "users" | "content" | "broadcasts" | "audit";

function OwnerConsole() {
  const check = useServerFn(checkOwner);
  const gate = useQuery({
    queryKey: ["owner", "gate"],
    queryFn: () => check({ data: undefined as any }),
    retry: false,
  });

  const [tab, setTab] = useState<Tab>("overview");

  if (gate.isLoading)
    return (
      <Shell>
        <p className="p-6 text-sm opacity-60">Verifying owner credentials…</p>
      </Shell>
    );
  if (!gate.data?.isOwner) {
    return (
      <Shell>
        <div className="p-8 text-center">
          <p className="mono-tag" style={{ color: "var(--color-heat)" }}>
            ERR·403 · UNAUTHORIZED
          </p>
          <h1 className="mt-2 text-2xl display-xl">OWNER CLEARANCE REQUIRED</h1>
          <p className="mt-2 text-sm opacity-70">
            This surface is reserved for the platform owner.
          </p>
          <Link to="/" className="btn-ghost mt-6 inline-flex">
            Return home
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{
          borderColor: "var(--color-hair)",
          background: "color-mix(in oklab, var(--color-canvas) 88%, transparent)",
        }}
      >
        <div
          aria-hidden
          style={{
            height: 2,
            background:
              "linear-gradient(90deg, #c07a12, rgba(192,122,18,0.15) 45%, rgba(0,200,83,0.6))",
          }}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="mono-tag truncate" style={{ color: "#c07a12" }}>
              ROOT · SITE B · OWNER CONSOLE
            </p>
            <h1 className="display-xl truncate text-lg sm:text-xl">Command Center</h1>
          </div>
          <span
            className="mono-tag shrink-0 rounded-full px-2.5 py-1 text-[10px] tracking-widest"
            style={{
              background: "rgba(0,200,83,0.12)",
              color: "#00a344",
              border: "1px solid rgba(0,200,83,0.4)",
            }}
          >
            ● LIVE
          </span>
        </div>
        <TabBar tab={tab} onChange={setTab} />
      </div>


      <div className="p-5 pb-24">
        {tab === "overview" && <OverviewTab />}
        {tab === "flags" && <FlagsTab />}
        {tab === "maintenance" && <MaintenanceTab />}
        {tab === "users" && <UsersTab />}
        {tab === "content" && <ContentTab />}
        {tab === "broadcasts" && <BroadcastsTab />}
        {tab === "audit" && <AuditTab />}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-canvas)" }}>
      {children}
    </div>
  );
}

const OWNER_TABS: [Tab, string][] = [
  ["overview", "Overview"],
  ["flags", "Features"],
  ["maintenance", "Maintenance"],
  ["users", "Users"],
  ["content", "Content"],
  ["broadcasts", "Broadcasts"],
  ["audit", "Audit"],
];

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const AMBER = "#c07a12";
  return (
    <div className="px-3 pb-3">
      {/* Mobile: dropdown selector */}
      <div className="relative sm:hidden">
        <select
          aria-label="Console section"
          value={tab}
          onChange={(e) => onChange(e.target.value as Tab)}
          className="mono-tag w-full appearance-none px-3 py-2.5 pr-9 text-[12px] tracking-widest"
          style={{
            borderRadius: 10,
            border: `1px solid ${AMBER}`,
            background: "linear-gradient(180deg, var(--color-ink-0), var(--color-ink-1))",
            color: "#f5efe2",
          }}
        >
          {OWNER_TABS.map(([k, label]) => (
            <option key={k} value={k} style={{ color: "#111" }}>
              {label.toUpperCase()}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
          style={{ color: AMBER }}
        >
          ▼
        </span>
      </div>

      {/* Desktop: instrument rail */}
      <div
        className="hidden gap-1 overflow-x-auto p-1 text-[12px] sm:flex"
        style={{
          borderRadius: 12,
          border: "1px solid var(--color-hair-strong)",
          background: "var(--color-paper-2)",
        }}
      >
        {OWNER_TABS.map(([k, label]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => onChange(k)}
              className="mono-tag relative whitespace-nowrap px-3 py-2 tracking-widest transition-colors"
              style={{
                borderRadius: 8,
                background: active
                  ? "linear-gradient(180deg, var(--color-ink-0), var(--color-ink-1))"
                  : "transparent",
                color: active ? "#f5efe2" : "var(--color-silver)",
                border: `1px solid ${active ? AMBER : "transparent"}`,
              }}
            >
              {active && (
                <span
                  aria-hidden
                  className="mr-1.5 inline-block align-middle"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: AMBER,
                    boxShadow: `0 0 8px ${AMBER}`,
                  }}
                />
              )}
              {label.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ─── OVERVIEW ────────────────────────────────────────────────
function OverviewTab() {
  const fn = useServerFn(getOwnerMetrics);
  const q = useQuery({
    queryKey: ["owner", "metrics"],
    queryFn: () => fn({ data: undefined as any }),
    refetchInterval: 15_000,
  });
  const m = q.data;
  const n = (v?: number) => (v ?? 0);
  const fmt = (v?: number) => (v?.toLocaleString() ?? "—");

  return (
    <div className="space-y-5">
      <CockpitHeader
        title="Flight deck"
        subtitle="Live platform telemetry — refreshed every 15 seconds."
        right={
          <Link to="/owner/command" className="btn-ghost text-xs">
            Mission Control →
          </Link>
        }
      />

      <section
        className="p-4"
        style={{
          borderRadius: 14,
          border: "1px solid var(--color-hair)",
          background: "var(--color-paper-2)",
        }}
      >
        <p className="mono-tag mb-3" style={{ color: "var(--color-silver)" }}>
          INSTRUMENT CLUSTER
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Gauge
            label="Total users"
            value={n(m?.totalUsers)}
            max={Math.max(1, n(m?.totalUsers))}
            display={fmt(m?.totalUsers)}
            unit="riders"
          />
          <Gauge
            label="Weekly active"
            value={n(m?.weeklyActive)}
            max={Math.max(1, n(m?.totalUsers))}
            display={fmt(m?.weeklyActive)}
            unit="7d"
          />
          <Gauge
            label="Signups · 24h"
            value={n(m?.signups24h)}
            max={Math.max(1, n(m?.signups24h) * 2, 10)}
            display={fmt(m?.signups24h)}
            unit="new"
          />
          <Gauge
            label="Containment"
            value={n(m?.openReports) + n(m?.suspendedUsers)}
            max={50}
            redline={0.4}
            display={fmt(n(m?.openReports) + n(m?.suspendedUsers))}
            unit="open"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BarMeter
            label="Posts · 24h"
            value={n(m?.posts24h)}
            max={Math.max(1, n(m?.posts24h), 25)}
            display={fmt(m?.posts24h)}
          />
          <BarMeter
            label="Messages · 24h"
            value={n(m?.messages24h)}
            max={Math.max(1, n(m?.messages24h), 50)}
            display={fmt(m?.messages24h)}
            tone="amber"
          />
          <BarMeter
            label="Active listings"
            value={n(m?.activeListings)}
            max={Math.max(1, n(m?.activeListings), 25)}
            display={fmt(m?.activeListings)}
          />
          <BarMeter
            label="Suspended"
            value={n(m?.suspendedUsers)}
            max={Math.max(1, n(m?.totalUsers))}
            display={fmt(m?.suspendedUsers)}
            tone="heat"
          />
        </div>
      </section>

      <section
        className="p-4"
        style={{
          borderRadius: 14,
          border: "1px solid var(--color-hair)",
          background: "var(--color-paper-2)",
        }}
      >
        <p className="mono-tag mb-3" style={{ color: "var(--color-silver)" }}>
          TELEMETRY · ACTIVITY
        </p>
        <BarChart
          series={[
            { label: "Users", value: n(m?.totalUsers) },
            { label: "Weekly", value: n(m?.weeklyActive) },
            { label: "Posts", value: n(m?.posts24h) },
            { label: "Msgs", value: n(m?.messages24h) },
            { label: "Listings", value: n(m?.activeListings) },
          ]}
        />
      </section>

      <section
        className="p-4"
        style={{
          borderRadius: 14,
          border: "1px solid var(--color-hair)",
          background: "var(--color-paper-2)",
        }}
      >
        <p className="mono-tag mb-3" style={{ color: "var(--color-silver)" }}>
          ANNUNCIATOR
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Lamp label="Open reports" active={n(m?.openReports) > 0} tone="heat">
            {fmt(m?.openReports)}
          </Lamp>
          <Lamp label="Suspended users" active={n(m?.suspendedUsers) > 0} tone="heat">
            {fmt(m?.suspendedUsers)}
          </Lamp>
          <Lamp label="Signups · 24h" active={n(m?.signups24h) > 0} tone="neon">
            {fmt(m?.signups24h)}
          </Lamp>
          <Lamp label="Posts · 24h" active={n(m?.posts24h) > 0}>
            {fmt(m?.posts24h)}
          </Lamp>
        </div>
      </section>
    </div>
  );
}


function Metric({ label, value, accent }: { label: string; value?: number; accent?: string }) {
  return (
    <div className="card-surface p-3">
      <p className="text-[10px] tracking-widest opacity-60">{label.toUpperCase()}</p>
      <p className="mt-1 text-2xl display-xl" style={{ color: accent ?? "var(--color-ink)" }}>
        {value?.toLocaleString() ?? "—"}
      </p>
    </div>
  );
}

// ─── FLAGS ───────────────────────────────────────────────────
function FlagsTab() {
  const list = useServerFn(listOwnerFlags);
  const setFn = useServerFn(setFeatureFlag);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["owner", "flags"],
    queryFn: () => list({ data: undefined as any }),
  });
  const mut = useMutation({
    mutationFn: (v: { key: string; enabled: boolean }) => setFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner", "flags"] }),
  });
  const flags = q.data ?? [];
  const grouped = flags.reduce<Record<string, typeof flags>>((acc, f: any) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, arr]) => (
        <section key={cat}>
          <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
            {cat.toUpperCase()}
          </p>
          <div className="space-y-1">
            {arr.map((f: any) => (
              <div
                key={f.key}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-hair)" }}
              >
                <div>
                  <p className="font-medium">{f.label}</p>
                  <p className="text-[11px] opacity-60">{f.description || f.key}</p>
                </div>
                <button
                  onClick={() => mut.mutate({ key: f.key, enabled: !f.enabled })}
                  disabled={mut.isPending}
                  className="rounded-full px-3 py-1 text-[11px] tracking-widest"
                  style={{
                    background: f.enabled ? "rgba(0,200,83,0.15)" : "rgba(220,38,38,0.15)",
                    color: f.enabled ? "#00c853" : "#dc2626",
                    border: `1px solid ${f.enabled ? "rgba(0,200,83,0.5)" : "rgba(220,38,38,0.5)"}`,
                  }}
                >
                  {f.enabled ? "ON" : "OFF"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── MAINTENANCE ─────────────────────────────────────────────
function MaintenanceTab() {
  const get = useServerFn(getMaintenance);
  const setG = useServerFn(setGlobalMaintenance);
  const setM = useServerFn(setModuleMaintenance);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["owner", "maintenance"],
    queryFn: () => get({ data: undefined as any }),
  });
  const [msg, setMsg] = useState("");

  const globalMut = useMutation({
    mutationFn: (v: { enabled: boolean; message: string | null }) =>
      setG({ data: { enabled: v.enabled, message: v.message } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner", "maintenance"] }),
  });
  const moduleMut = useMutation({
    mutationFn: (v: { moduleKey: string; enabled: boolean }) => setM({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner", "maintenance"] }),
  });

  const g: any = q.data?.global;
  const mods: any[] = q.data?.modules ?? [];

  return (
    <div className="space-y-6">
      <section className="card-surface p-4">
        <p className="mono-tag" style={{ color: "var(--color-heat)" }}>
          GLOBAL MAINTENANCE
        </p>
        <p className="mt-1 text-sm opacity-70">
          Enabling this locks all non-owner users out of the app with the message below.
        </p>
        <textarea
          value={msg || g?.message || ""}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="We're performing maintenance. Back shortly."
          className="mt-3 w-full rounded-md border bg-transparent p-2 text-sm"
          style={{ borderColor: "var(--color-hair-strong)" }}
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => globalMut.mutate({ enabled: true, message: msg || g?.message || null })}
            className="btn-solid"
            style={{ background: "#dc2626" }}
          >
            {g?.global_enabled ? "Update message" : "Enable maintenance"}
          </button>
          {g?.global_enabled && (
            <button
              onClick={() => globalMut.mutate({ enabled: false, message: null })}
              className="btn-ghost"
            >
              Disable
            </button>
          )}
        </div>
        {g?.global_enabled && (
          <p className="mt-2 text-[11px]" style={{ color: "#dc2626" }}>
            ACTIVE — set at {new Date(g.updated_at).toLocaleString()}
          </p>
        )}
      </section>

      <section>
        <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
          PER-MODULE MAINTENANCE
        </p>
        <div className="space-y-1">
          {mods.length === 0 && (
            <p className="text-sm opacity-60">
              No module locks. Toggle a feature flag off instead.
            </p>
          )}
          {mods.map((m) => (
            <div
              key={m.module_key}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-hair)" }}
            >
              <span>
                {m.module_key} — {m.enabled ? "LOCKED" : "OK"}
              </span>
              <button
                onClick={() => moduleMut.mutate({ moduleKey: m.module_key, enabled: !m.enabled })}
                className="btn-ghost text-[11px]"
              >
                {m.enabled ? "Unlock" : "Lock"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── USERS ───────────────────────────────────────────────────
function UsersTab() {
  const list = useServerFn(listUsersForOwner);
  const susp = useServerFn(setUserSuspension);
  const verify = useServerFn(setUserVerified);
  const roles = useServerFn(setUserRoles);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState<"" | "suspended" | "verified">("");

  const q = useQuery({
    queryKey: ["owner", "users", search, only],
    queryFn: () =>
      list({
        data: {
          search: search || undefined,
          onlySuspended: only === "suspended" ? true : undefined,
          onlyVerified: only === "verified" ? true : undefined,
          limit: 50,
          offset: 0,
        },
      }),
  });

  const suspMut = useMutation({
    mutationFn: (v: { userId: string; suspend: boolean; reason?: string }) => susp({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.suspend ? "User suspended" : "User reinstated");
      qc.invalidateQueries({ queryKey: ["owner", "users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const verMut = useMutation({
    mutationFn: (v: { userId: string; verified: boolean }) => verify({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.verified ? "Verified" : "Verification removed");
      qc.invalidateQueries({ queryKey: ["owner", "users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const roleMut = useMutation({
    mutationFn: (v: { userId: string; roles: any[] }) => roles({ data: v }),
    onSuccess: () => {
      toast.success("Roles updated");
      qc.invalidateQueries({ queryKey: ["owner", "users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or @username"
          className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-hair-strong)" }}
        />
        <select
          value={only}
          onChange={(e) => setOnly(e.target.value as any)}
          className="rounded-md border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--color-hair-strong)" }}
        >
          <option value="">All</option>
          <option value="verified">Verified</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="space-y-1">
        {(q.data?.rows ?? []).map((u: any) => (
          <div
            key={u.id}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-hair)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {u.display_name || u.username || u.id.slice(0, 8)}
                  {u.is_verified && (
                    <span className="ml-1" style={{ color: "#00c853" }}>
                      ◆
                    </span>
                  )}
                  {u.is_premium && <span className="ml-1 text-[10px] opacity-70">PREMIUM</span>}
                </p>
                <p className="text-[11px] opacity-60">
                  @{u.username || "—"} · lvl {u.level ?? 1} · {u.xp_total ?? 0} XP
                </p>
              </div>
              {u.is_suspended && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: "rgba(220,38,38,0.15)", color: "#dc2626" }}
                >
                  SUSPENDED
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                onClick={async () => {
                  let reason: string | undefined;
                  if (!u.is_suspended) {
                    const r = await promptDialog({
                      title: "Suspend user",
                      description: `Provide a reason for suspending @${u.username ?? u.id.slice(0, 8)}. This is recorded in the audit log.`,
                      placeholder: "Reason (e.g. repeated harassment)",
                      confirmLabel: "Suspend",
                      destructive: true,
                      required: true,
                      multiline: true,
                    });
                    if (r === null) return;
                    reason = r;
                  } else {
                    if (
                      !(await confirmDialog({
                        title: "Reinstate user?",
                        description: "They will regain access immediately.",
                        confirmLabel: "Reinstate",
                      }))
                    )
                      return;
                  }
                  suspMut.mutate({ userId: u.id, suspend: !u.is_suspended, reason });
                }}
                className="btn-ghost text-[11px]"
              >
                {u.is_suspended ? "Unsuspend" : "Suspend"}
              </button>
              <button
                onClick={() => verMut.mutate({ userId: u.id, verified: !u.is_verified })}
                className="btn-ghost text-[11px]"
              >
                {u.is_verified ? "Unverify" : "Verify"}
              </button>
              <button
                onClick={async () => {
                  const input = await promptDialog({
                    title: "Set roles",
                    description: "Comma-separated: owner, admin, moderator, standard.",
                    defaultValue: "standard",
                    placeholder: "standard, moderator",
                    required: true,
                  });
                  if (!input) return;
                  const list = input
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  roleMut.mutate({ userId: u.id, roles: list });
                }}
                className="btn-ghost text-[11px]"
              >
                Set roles
              </button>
            </div>
          </div>
        ))}
        {q.isLoading && <p className="text-sm opacity-60">Loading…</p>}
      </div>
    </div>
  );
}

// ─── CONTENT ─────────────────────────────────────────────────
function ContentTab() {
  const listP = useServerFn(listRecentPosts);
  const hide = useServerFn(setPostHidden);
  const listR = useServerFn(listOpenReports);
  const resolve = useServerFn(resolveReport);
  const qc = useQueryClient();
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [targetFilter, setTargetFilter] = useState<
    "" | "post" | "user" | "comment" | "listing" | "message"
  >("");

  const posts = useQuery({
    queryKey: ["owner", "posts"],
    queryFn: () => listP({ data: { limit: 30 } }),
  });
  const reports = useQuery({
    queryKey: ["owner", "reports"],
    queryFn: () => listR({ data: undefined as any }),
  });

  const hideMut = useMutation({
    mutationFn: (v: { postId: string; hidden: boolean }) => hide({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.hidden ? "Post hidden" : "Post restored");
      qc.invalidateQueries({ queryKey: ["owner", "posts"] });
      qc.invalidateQueries({ queryKey: ["owner", "metrics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const resolveMut = useMutation({
    mutationFn: (v: { id: string; action: "dismiss" | "action_taken" }) => resolve({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.action === "dismiss" ? "Report dismissed" : "Action recorded");
      qc.invalidateQueries({ queryKey: ["owner", "reports"] });
      qc.invalidateQueries({ queryKey: ["owner", "metrics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  // Group open reports by target so duplicates surface as a single row with a count.
  const grouped = useMemo(() => {
    const rows: any[] = reports.data ?? [];
    const filtered = rows.filter(
      (r) =>
        (!reasonFilter || (r.reason ?? "").toLowerCase().includes(reasonFilter.toLowerCase())) &&
        (!targetFilter || r.target_type === targetFilter),
    );
    const map = new Map<
      string,
      {
        key: string;
        target_type: string;
        target_id: string;
        reasons: Record<string, number>;
        count: number;
        latest: string;
        ids: string[];
      }
    >();
    for (const r of filtered) {
      const key = `${r.target_type}:${r.target_id}`;
      const entry = map.get(key) ?? {
        key,
        target_type: r.target_type as string,
        target_id: r.target_id as string,
        reasons: {} as Record<string, number>,
        count: 0,
        latest: r.created_at as string,
        ids: [] as string[],
      };
      entry.count += 1;
      const rk = (r.reason ?? "other") as string;
      entry.reasons[rk] = (entry.reasons[rk] ?? 0) + 1;
      entry.ids.push(r.id as string);
      if (new Date(r.created_at) > new Date(entry.latest)) entry.latest = r.created_at;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || new Date(b.latest).getTime() - new Date(a.latest).getTime(),
    );
  }, [reports.data, reasonFilter, targetFilter]);

  const targetLink = (type: string, id: string): string | null => {
    if (type === "post") return `/post/${id}`;
    if (type === "user") return `/u/${id}`;
    return null;
  };

  const resolveGroup = async (
    g: { count: number; ids: string[]; target_type: string },
    action: "dismiss" | "action_taken",
  ) => {
    const ok = await confirmDialog({
      title:
        action === "dismiss"
          ? `Dismiss ${g.count} report${g.count > 1 ? "s" : ""}?`
          : `Mark ${g.count} report${g.count > 1 ? "s" : ""} as actioned?`,
      description:
        action === "dismiss"
          ? "The reports will be closed with no action. Reporters won't be notified."
          : "Confirm the offending content was removed or the account was sanctioned.",
      confirmLabel: action === "dismiss" ? "Dismiss" : "Mark actioned",
      destructive: action === "action_taken",
    });
    if (!ok) return;
    for (const id of g.ids) resolveMut.mutate({ id, action });
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="mono-tag" style={{ color: "var(--color-heat)" }}>
            OPEN REPORTS ({reports.data?.length ?? 0})
          </p>
          <div className="ml-auto flex gap-2">
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value as any)}
              className="rounded-md border bg-transparent px-2 py-1 text-[11px]"
              style={{ borderColor: "var(--color-hair-strong)" }}
            >
              <option value="">All targets</option>
              <option value="post">Posts</option>
              <option value="user">Users</option>
              <option value="comment">Comments</option>
              <option value="listing">Listings</option>
              <option value="message">Messages</option>
            </select>
            <input
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              placeholder="Filter reason…"
              className="w-32 rounded-md border bg-transparent px-2 py-1 text-[11px]"
              style={{ borderColor: "var(--color-hair-strong)" }}
            />
          </div>
        </div>
        <div className="space-y-1">
          {grouped.map((g) => {
            const link = targetLink(g.target_type, g.target_id);
            return (
              <div
                key={g.key}
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-hair)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {g.target_type} ·{" "}
                      <span style={{ color: "var(--color-heat)" }}>×{g.count}</span>
                    </p>
                    <p className="text-[11px] opacity-70">
                      {Object.entries(g.reasons)
                        .map(([r, n]) => `${r} (${n})`)
                        .join(" · ")}
                    </p>
                    <p className="text-[10px] opacity-50">
                      target {g.target_id?.slice(0, 8)} · latest{" "}
                      {new Date(g.latest).toLocaleString()}
                    </p>
                  </div>
                  {link && (
                    <Link to={link} className="btn-ghost shrink-0 text-[11px]">
                      Open
                    </Link>
                  )}
                </div>
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => resolveGroup(g, "action_taken")}
                    className="btn-ghost text-[11px]"
                  >
                    Action taken
                  </button>
                  <button
                    onClick={() => resolveGroup(g, "dismiss")}
                    className="btn-ghost text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
          {grouped.length === 0 && (
            <p className="text-sm opacity-60">No open reports match the current filter.</p>
          )}
        </div>
      </section>

      <section>
        <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
          RECENT POSTS
        </p>
        <div className="space-y-1">
          {(posts.data ?? []).map((p: any) => (
            <div
              key={p.id}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-hair)" }}
            >
              <p className="line-clamp-2">
                {p.caption || <span className="opacity-60">(no caption)</span>}
              </p>
              <p className="text-[11px] opacity-60">
                {new Date(p.created_at).toLocaleString()} · ♥ {p.likes_count} · 💬{" "}
                {p.comments_count}
                {p.is_hidden && (
                  <span className="ml-2" style={{ color: "#dc2626" }}>
                    HIDDEN
                  </span>
                )}
              </p>
              <div className="mt-1 flex gap-1">
                <Link
                  to="/post/$id"
                  params={{ id: String(p.id) }}
                  className="btn-ghost text-[11px]"
                >
                  Open
                </Link>
                <button
                  onClick={async () => {
                    if (!p.is_hidden) {
                      const ok = await confirmDialog({
                        title: "Hide post?",
                        description: "The post will be removed from feeds and profile immediately.",
                        confirmLabel: "Hide",
                        destructive: true,
                      });
                      if (!ok) return;
                    }
                    hideMut.mutate({ postId: p.id, hidden: !p.is_hidden });
                  }}
                  className="btn-ghost text-[11px]"
                >
                  {p.is_hidden ? "Restore" : "Hide"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── BROADCASTS ──────────────────────────────────────────────
function BroadcastsTab() {
  const list = useServerFn(listBroadcasts);
  const create = useServerFn(createBroadcast);
  const dismiss = useServerFn(dismissBroadcast);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["owner", "broadcasts"],
    queryFn: () => list({ data: undefined as any }),
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sev, setSev] = useState<"info" | "warning" | "critical">("info");

  const createMut = useMutation({
    mutationFn: () => create({ data: { title, body, severity: sev } }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["owner", "broadcasts"] });
    },
  });
  const dismissMut = useMutation({
    mutationFn: (id: string) => dismiss({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner", "broadcasts"] }),
  });

  return (
    <div className="space-y-4">
      <section className="card-surface p-4">
        <p className="mono-tag" style={{ color: "#00c853" }}>
          NEW BROADCAST
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="mt-2 w-full rounded-md border bg-transparent p-2 text-sm"
          style={{ borderColor: "var(--color-hair-strong)" }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message"
          rows={3}
          className="mt-2 w-full rounded-md border bg-transparent p-2 text-sm"
          style={{ borderColor: "var(--color-hair-strong)" }}
        />
        <div className="mt-2 flex items-center gap-2">
          <select
            value={sev}
            onChange={(e) => setSev(e.target.value as any)}
            className="rounded-md border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: "var(--color-hair-strong)" }}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={() => createMut.mutate()}
            disabled={!title || !body || createMut.isPending}
            className="btn-solid"
          >
            Publish
          </button>
        </div>
      </section>

      <div className="space-y-1">
        {(q.data ?? []).map((b: any) => (
          <div
            key={b.id}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-hair)" }}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {b.title} <span className="text-[10px] opacity-60">· {b.severity}</span>
              </p>
              {b.active ? (
                <button onClick={() => dismissMut.mutate(b.id)} className="btn-ghost text-[11px]">
                  Deactivate
                </button>
              ) : (
                <span className="text-[10px] opacity-60">inactive</span>
              )}
            </div>
            <p className="text-[11px] opacity-70">{b.body}</p>
            <p className="text-[10px] opacity-50">{new Date(b.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AUDIT ───────────────────────────────────────────────────
function AuditTab() {
  const list = useServerFn(listAuditLog);
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["owner", "audit", search],
    queryFn: () => list({ data: { search: search || undefined, limit: 100, offset: 0 } }),
  });

  function exportCsv() {
    const rows = q.data?.rows ?? [];
    const header = "created_at,actor_id,action,target_type,target_id";
    const body = rows
      .map((r: any) =>
        [r.created_at, r.actor_id, r.action, r.target_type, r.target_id]
          .map((v) => JSON.stringify(v ?? ""))
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owner-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search action / target"
          className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-hair-strong)" }}
        />
        <button onClick={exportCsv} className="btn-ghost text-[11px]">
          Export CSV
        </button>
      </div>
      <p className="text-[11px] opacity-60">{q.data?.count ?? 0} entries</p>
      <div className="space-y-1">
        {(q.data?.rows ?? []).map((r: any) => (
          <div
            key={r.id}
            className="rounded-md border px-3 py-2 text-[12px]"
            style={{ borderColor: "var(--color-hair)" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono">{r.action}</span>
              <span className="opacity-60">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="opacity-70">
              actor {r.actor_id?.slice(0, 8)}
              {r.target_type && (
                <>
                  {" "}
                  · {r.target_type} {r.target_id?.slice(0, 8)}
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
