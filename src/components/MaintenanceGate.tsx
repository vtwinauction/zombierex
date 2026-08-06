/**
 * Global maintenance gate. When the owner switches maintenance mode on in
 * the control centre, everyone except the owner sees this screen instead of
 * the app. The owner keeps full access so the platform can be repaired.
 */
import type { ReactNode } from "react";
import { usePlatformStatus } from "@/hooks/usePlatform";
import { useOwner } from "@/hooks/useOwner";

export function MaintenanceGate({ children, bypass }: { children: ReactNode; bypass?: boolean }) {
  const { data } = usePlatformStatus();
  const { isOwner } = useOwner();

  if (bypass || !data?.global.enabled || isOwner) return <>{children}</>;

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-8 text-center">
      <p className="mono-tag text-[10px]" style={{ color: "var(--color-heat)" }}>
        SYSTEM · OFFLINE
      </p>
      <h1 className="display-xl mt-3 text-2xl">MAINTENANCE IN PROGRESS</h1>
      <p className="mt-3 max-w-sm text-[13px]" style={{ color: "var(--color-silver)" }}>
        {data.global.message ?? "ZOMBIEREX is being serviced. We'll be back shortly."}
      </p>
      {data.global.until && (
        <p className="mono-tag mt-4 text-[10px] opacity-50">
          ETA {new Date(data.global.until).toLocaleString()}
        </p>
      )}
    </div>
  );
}

/**
 * Per-module gate. Renders a compact notice when a module is switched off
 * or under maintenance, otherwise renders its children untouched.
 */
export function ModuleGate({
  status,
  label,
  children,
}: {
  status: { enabled: boolean; loading: boolean; underMaintenance: boolean; message: string | null };
  label: string;
  children: ReactNode;
}) {
  if (status.loading || status.enabled) return <>{children}</>;
  return (
    <div className="px-6 py-16 text-center">
      <p className="mono-tag text-[10px]" style={{ color: "var(--color-heat)" }}>
        {status.underMaintenance ? "MODULE · MAINTENANCE" : "MODULE · DISABLED"}
      </p>
      <h2 className="display-xl mt-2 text-xl">{label}</h2>
      <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
        {status.message ?? "This section is temporarily unavailable. Check back soon."}
      </p>
    </div>
  );
}

/** Standalone notice for early-return guards inside route components. */
export function ModuleNotice({
  status,
  label,
}: {
  status: { underMaintenance: boolean; message: string | null };
  label: string;
}) {
  return (
    <div className="px-6 py-24 text-center">
      <p className="mono-tag text-[10px]" style={{ color: "var(--color-heat)" }}>
        {status.underMaintenance ? "MODULE · MAINTENANCE" : "MODULE · DISABLED"}
      </p>
      <h2 className="display-xl mt-2 text-xl">{label}</h2>
      <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
        {status.message ?? "This section is temporarily unavailable. Check back soon."}
      </p>
    </div>
  );
}
