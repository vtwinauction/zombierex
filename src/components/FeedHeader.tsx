import { Link } from "@tanstack/react-router";
import brandLogo from "@/assets/zombierex-logo.png.asset.json";
import { IconLens, IconEnginePulse, IconGauge } from "./icons/RexIcons";
import { ShoppingCart } from "lucide-react";

export function FeedHeader({ dark = false }: { dark?: boolean }) {
  const cls = dark ? "text-white" : "";
  const iconStyle = dark
    ? { background: "rgba(255,255,255,0.10)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)" }
    : { background: "rgba(255,255,255,0.85)", color: "var(--color-matte)", border: "1px solid var(--color-hair)" };

  const chip = "tap grid h-9 w-9 place-items-center backdrop-blur-md";
  const clip = {
    clipPath:
      "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)",
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] ${cls}`}
    >
      <div className="flex items-center gap-2">
        <div
          className="grid h-8 w-8 place-items-center overflow-hidden"
          style={{
            clipPath: "polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)",
            background: "#0e0f11",
            boxShadow: dark ? "0 0 0 1px rgba(255,255,255,0.15)" : "0 0 0 1px var(--color-hair)",
          }}
        >
          <img src={brandLogo.url} alt="ZOMBIEREX" className="h-full w-full object-cover" />
        </div>
        <div className="leading-tight">
          <p className={`font-display text-[15px] font-bold tracking-tight ${dark ? "text-white" : ""}`} style={dark ? {} : { color: "var(--color-matte)" }}>
            ZOMBIEREX
          </p>
          <p className="mono-tag" style={{ color: dark ? "rgba(255,255,255,0.65)" : "var(--color-titanium)", fontSize: 9, letterSpacing: "0.14em" }}>
            FOR·YOU · FOLLOWING · NEARBY
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/search" className={chip} style={{ ...clip, ...iconStyle }} aria-label="Discover">
          <IconLens size={16} />
        </Link>
        <Link to="/notifications" className={chip} style={{ ...clip, ...iconStyle }} aria-label="Notifications">
          <IconEnginePulse size={16} />
        </Link>
        <Link to="/messages" className={chip} style={{ ...clip, ...iconStyle }} aria-label="Messages">
          <IconGauge size={16} />
        </Link>
      </div>
    </header>
  );
}
