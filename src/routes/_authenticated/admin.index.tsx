import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Console · ZOMBIEREX" },
      { name: "description", content: "Moderation, vendors, health, and platform ops." },
      { property: "og:title", content: "Admin Console · ZOMBIEREX" },
      { property: "og:description", content: "Moderation, vendors, health, and platform ops." },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  return (
    <div className="px-5">
      <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
        QUICK ACTIONS
      </p>
      <div className="mt-3 space-y-2">
        <Link
          to="/admin/vendors"
          className="block w-full px-4 py-3 text-[13px]"
          style={{
            background: "transparent",
            border: "1px solid var(--color-hair-strong)",
            borderRadius: 6,
            color: "var(--color-ink)",
          }}
        >
          ◈ Review vendor applications →
        </Link>
      </div>

      <p className="mono-tag mt-8" style={{ color: "var(--color-silver)" }}>
        ABOUT
      </p>
      <p className="mt-2 text-[12px] leading-snug" style={{ color: "var(--color-silver)" }}>
        Admin actions are audited. Approving a vendor grants the{" "}
        <span className="mono-tag">VENDOR</span> role and activates their metallic verification
        badge. Rejecting revokes the role.
      </p>
    </div>
  );
}
