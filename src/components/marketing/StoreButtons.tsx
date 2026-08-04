import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * App store buttons using the authentic Apple + Google Play marks,
 * wrapped in ZOMBIEREX chrome (titanium bevel, neon edge glow).
 */

function AppleMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.25 3.03-.9.92-2.02 1.45-3.06 1.36-.13-1.1.42-2.24 1.2-3.02.87-.9 2.14-1.5 3.11-1.37zM20.6 17.13c-.53 1.22-.78 1.76-1.46 2.84-.95 1.5-2.29 3.36-3.95 3.37-1.47.02-1.85-.96-3.85-.95-2 .01-2.42.97-3.89.95-1.66-.02-2.93-1.7-3.88-3.19C.9 15.95.62 10.98 2.3 8.34c1.19-1.87 3.07-2.97 4.84-2.97 1.8 0 2.93 1 4.42 1 1.44 0 2.32-1 4.4-1 1.58 0 3.25.86 4.44 2.34-3.9 2.14-3.27 7.7.2 9.42z" />
    </svg>
  );
}

function GooglePlayMark({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <path
        fill="#00c853"
        d="M47 21.4C41.2 27.6 38 36.5 38 48v416c0 11.5 3.2 20.4 9 26.6l2.2 2.1 233-233v-5.5l-233-233L47 21.4z"
      />
      <path
        fill="#d7dbe0"
        d="M360 359.2l-77.8-77.9v-5.5l77.9-77.9 1.7 1L454 251c26.4 15 26.4 39.5 0 54.6l-92.2 52.4-1.8 1.2z"
      />
      <path
        fill="#9aa2ab"
        d="M361.8 358l-79.6-79.6L47 490.6c8.7 9.2 23.1 10.4 39.3 1.2L361.8 358z"
      />
      <path
        fill="#f2f4f6"
        d="M361.8 156.8L86.3 20.2C70.1 11 55.7 12.2 47 21.4l235.2 235.2 79.6-79.8z"
        opacity=".85"
      />
    </svg>
  );
}

export function StoreButtons({ compact = false }: { compact?: boolean }) {
  const { ios, android } = siteConfig.downloads;
  return (
    <div className="zx-stores">
      <StoreStyles />
      <StoreLink
        href={ios}
        icon={<AppleMark size={compact ? 19 : 23} />}
        top="Download on the"
        bottom="App Store"
        compact={compact}
      />
      <StoreLink
        href={android}
        icon={<GooglePlayMark size={compact ? 18 : 21} />}
        top="Get it on"
        bottom="Google Play"
        compact={compact}
      />
    </div>
  );
}

function StoreLink({
  href,
  icon,
  top,
  bottom,
  compact,
}: {
  href: string | null;
  icon: React.ReactNode;
  top: string;
  bottom: string;
  compact: boolean;
}) {
  const label = href ? top : "Coming soon";
  const inner = (
    <>
      <span className="zx-store-icon">{icon}</span>
      <span className="zx-store-text">
        <span className="zx-store-top">{label}</span>
        <span className="zx-store-bottom" style={{ fontSize: compact ? 14 : 16.5 }}>
          {bottom}
        </span>
      </span>
    </>
  );
  if (!href) {
    return (
      <span className="zx-store" aria-disabled="true">
        {inner}
      </span>
    );
  }
  return (
    <a className="zx-store" href={href} target="_blank" rel="noreferrer noopener">
      {inner}
    </a>
  );
}

function StoreStyles() {
  return (
    <style>{`
.zx-stores { display: flex; flex-wrap: wrap; gap: 12px; }
.zx-store {
  position: relative; display: inline-flex; align-items: center; gap: 12px;
  padding: 11px 20px 11px 16px; border-radius: 14px;
  background:
    linear-gradient(180deg, #1a1a1a, #0a0a0a) padding-box,
    linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05)) border-box;
  border: 1px solid transparent;
  color: #fafafa; overflow: hidden; isolation: isolate;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 14px 34px -22px rgba(0,0,0,0.55);
  transition: transform 160ms cubic-bezier(.2,.7,.2,1), box-shadow 240ms ease, border-color 240ms ease;
}
.zx-store::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.16) 50%, transparent 58%);
  transform: translateX(-120%); transition: transform 700ms ease;
}
.zx-store:hover::after { transform: translateX(120%); }
.zx-store:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 20px 46px -24px rgba(0,200,83,0.55);
}
.zx-store[aria-disabled="true"] { opacity: .62; }
.zx-store-icon { display: grid; place-items: center; color: #fafafa; filter: drop-shadow(0 0 10px rgba(0,200,83,0.35)); }

.zx-store-text { display: grid; text-align: left; line-height: 1.15; }
.zx-store-top {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: #00e05c;
}
.zx-store-bottom { font-weight: 700; letter-spacing: -0.015em; }
    `}</style>
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
    return () => {
      cancelled = true;
    };
  }, [size]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        padding: 10,
        background: "#fff",
        display: "grid",
        placeItems: "center",
      }}
      aria-label="QR code to download ZOMBIEREX"
    >
      {src ? (
        <img src={src} width={size - 20} height={size - 20} alt="Scan to download ZOMBIEREX" />
      ) : (
        <QrCode size={40} color="#07080a" />
      )}
    </div>
  );
}
