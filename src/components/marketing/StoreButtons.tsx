import { useEffect, useState } from "react";
import { Apple, Play, QrCode } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * App store buttons. Falls back to a "Coming soon" state until the
 * store URLs are filled in inside src/config/site.ts.
 */
export function StoreButtons({ compact = false }: { compact?: boolean }) {
  const { ios, android } = siteConfig.downloads;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <StoreLink
        href={ios}
        icon={<Apple size={18} />}
        top="Download on the"
        bottom="App Store"
        compact={compact}
      />
      <StoreLink
        href={android}
        icon={<Play size={17} />}
        top="Get it on"
        bottom="Google Play"
        compact={compact}
      />
    </div>
  );
}

function StoreLink({
  href, icon, top, bottom, compact,
}: { href: string | null; icon: React.ReactNode; top: string; bottom: string; compact: boolean }) {
  const label = href ? top : "Coming soon";
  const inner = (
    <>
      {icon}
      <span style={{ display: "grid", textAlign: "left", lineHeight: 1.15 }}>
        <span style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.75 }}>{label}</span>
        <span style={{ fontSize: compact ? 13 : 15, fontWeight: 700 }}>{bottom}</span>
      </span>
    </>
  );
  if (!href) {
    return <span className="mkt-btn mkt-btn-lg" aria-disabled="true">{inner}</span>;
  }
  return (
    <a className="mkt-btn mkt-btn-lg" href={href} target="_blank" rel="noreferrer noopener">{inner}</a>
  );
}

/** Client-rendered QR code pointing at the download page. */
export function DownloadQr({ size = 168 }: { size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QR = (await import("qrcode")).default;
        const url = await QR.toDataURL(siteConfig.downloads.qrTarget, {
          width: size * 2,
          margin: 1,
          color: { dark: "#07080a", light: "#ffffff" },
        });
        if (!cancelled) setSrc(url);
      } catch {
        /* QR is decorative — silently skip if generation fails */
      }
    })();
    return () => { cancelled = true; };
  }, [size]);

  return (
    <div
      style={{
        width: size, height: size, borderRadius: 16, padding: 10,
        background: "#fff", display: "grid", placeItems: "center",
      }}
      aria-label="QR code to download ZOMBIEREX"
    >
      {src
        ? <img src={src} width={size - 20} height={size - 20} alt="Scan to download ZOMBIEREX" />
        : <QrCode size={40} color="#07080a" />}
    </div>
  );
}
