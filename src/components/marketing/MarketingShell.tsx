import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import brandLogo from "@/assets/zombierex-logo.png.asset.json";
import { siteConfig } from "@/config/site";
import { setMarketingMode } from "@/lib/marketing-mode";

/**
 * Dark, premium chrome for every public marketing page.
 * Scoped styles live in the <style> block so the app's light theme is untouched.
 */

const NAV = [
  { href: "#about", label: "About" },
  { href: "#features", label: "Features" },
  { href: "#screens", label: "App" },
  { href: "#community", label: "Community" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    setMarketingMode(true);
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      setMarketingMode(false);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="mkt">
      <MarketingStyles />

      <header className={`mkt-nav ${solid ? "is-solid" : ""}`}>
        <div className="mkt-wrap mkt-nav-inner">
          <Link to="/" className="mkt-brand" onClick={() => setOpen(false)}>
            <img src={brandLogo.url} alt="ZOMBIEREX logo" width={28} height={28} loading="eager" />
            <span>ZOMBIEREX</span>
          </Link>

          <nav className="mkt-nav-links" aria-label="Primary">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>{n.label}</a>
            ))}
            <Link to="/download">Download</Link>
            <Link to="/legal">Legal</Link>
          </nav>

          <div className="mkt-nav-cta">
            <Link to="/auth" className="mkt-btn mkt-btn-ghost">Sign in</Link>
            <Link to="/download" className="mkt-btn mkt-btn-neon">Get the app</Link>
          </div>

          <button
            className="mkt-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>

        {open && (
          <div className="mkt-mobile-menu">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</a>
            ))}
            <Link to="/download" onClick={() => setOpen(false)}>Download</Link>
            <Link to="/contact" onClick={() => setOpen(false)}>Contact</Link>
            <Link to="/legal" onClick={() => setOpen(false)}>Legal Center</Link>
            <Link to="/auth" onClick={() => setOpen(false)} className="mkt-btn mkt-btn-neon">Sign in</Link>
          </div>
        )}
      </header>

      <main>{children}</main>

      <MarketingFooter />
      <CookieConsent />
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-wrap">
        <div className="mkt-footer-grid">
          <div>
            <div className="mkt-brand">
              <img src={brandLogo.url} alt="" width={28} height={28} loading="lazy" />
              <span>ZOMBIEREX</span>
            </div>
            <p className="mkt-muted mkt-footer-blurb">
              {siteConfig.subheadline}
            </p>
            <div className="mkt-social">
              {siteConfig.social.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer noopener">{s.label}</a>
              ))}
            </div>
          </div>

          <div>
            <h3>Product</h3>
            <Link to="/download">Download</Link>
            <a href="/#features">Features</a>
            <a href="/#screens">Screenshots</a>
            <a href="/#community">Community</a>
          </div>

          <div>
            <h3>Company</h3>
            <Link to="/contact">Contact</Link>
            <a href={`mailto:${siteConfig.contact.business}`}>Business enquiries</a>
            <a href={`mailto:${siteConfig.contact.press}`}>Press</a>
            <a href={`mailto:${siteConfig.contact.support}`}>Support</a>
          </div>

          <div>
            <h3>Legal</h3>
            <Link to="/legal">Legal Center</Link>
            <Link to="/legal/privacy">Privacy Policy</Link>
            <Link to="/legal/terms">Terms of Service</Link>
            <Link to="/legal/cookies">Cookie Policy</Link>
            <Link to="/legal/community-guidelines">Community Guidelines</Link>
            <Link to="/legal/dmca">Copyright / DMCA</Link>
          </div>
        </div>

        <div className="mkt-footer-base">
          <span>© {new Date().getFullYear()} ZOMBIEREX. All rights reserved.</span>
          <span>{siteConfig.contact.location}</span>
        </div>
      </div>
    </footer>
  );
}

const COOKIE_KEY = "zx.cookie.consent.v1";

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: true, marketing: false });
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_KEY)) setShow(true);
    } catch { /* storage blocked — stay hidden */ }
  }, []);

  const save = (value: { analytics: boolean; marketing: boolean }) => {
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify({ ...value, essential: true, at: Date.now() }));
    } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mkt-cookie" role="dialog" aria-label="Cookie preferences">
      <div>
        <strong>We use cookies</strong>
        <p className="mkt-muted">
          Essential cookies keep ZOMBIEREX working. Optional analytics help us improve the app.
          Read the <Link to="/legal/cookies">Cookie Policy</Link>.
        </p>
        {managing && (
          <div className="mkt-cookie-prefs">
            <label><input type="checkbox" checked disabled /> Essential (always on)</label>
            <label>
              <input type="checkbox" checked={prefs.analytics}
                onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))} /> Analytics
            </label>
            <label>
              <input type="checkbox" checked={prefs.marketing}
                onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))} /> Marketing
            </label>
          </div>
        )}
      </div>
      <div className="mkt-cookie-actions">
        <button className="mkt-btn mkt-btn-ghost" onClick={() => setManaging((v) => !v)}>
          {managing ? "Hide options" : "Manage"}
        </button>
        <button className="mkt-btn mkt-btn-ghost" onClick={() => save({ analytics: false, marketing: false })}>
          Reject optional
        </button>
        <button className="mkt-btn mkt-btn-neon" onClick={() => save(managing ? prefs : { analytics: true, marketing: false })}>
          Accept
        </button>
      </div>
    </div>
  );
}

function MarketingStyles() {
  return (
    <style>{`
.mkt {
  --bg: #07080a;
  --bg-2: #0c0e11;
  --line: rgba(255,255,255,0.09);
  --txt: #f4f5f6;
  --txt-2: #a4a9ae;
  --neon: #00e05e;
  --neon-2: #00a844;
  background: var(--bg);
  color: var(--txt);
  min-height: 100svh;
  font-family: var(--font-sans, "DM Sans", system-ui, sans-serif);
  scroll-behavior: smooth;
  overflow-x: hidden;
}
/* Hide the in-app chrome whenever a public marketing page is mounted. */
body:has(.mkt) > div > main > div:first-child:not(:has(.mkt)),
body:has(.mkt) nav[data-bottom-nav],
body:has(.mkt) header[data-app-chrome] { display: none !important; }
body:has(.mkt) > div > main { padding-bottom: 0 !important; }
.mkt ::selection { background: var(--neon); color: #06070a; }
.mkt-wrap { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 20px; }
.mkt-muted { color: var(--txt-2); }
.mkt h1, .mkt h2, .mkt h3 { font-family: var(--font-display, "Space Grotesk", system-ui, sans-serif); letter-spacing: -0.03em; }
.mkt-eyebrow {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--neon);
}

/* NAV */
.mkt-nav { position: sticky; top: 0; z-index: 50; transition: background 240ms ease, border-color 240ms ease; border-bottom: 1px solid transparent; }
.mkt-nav.is-solid { background: rgba(7,8,10,0.82); backdrop-filter: blur(18px); border-bottom-color: var(--line); }
.mkt-nav-inner { display: flex; align-items: center; gap: 16px; height: 64px; }
.mkt-brand { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-display, sans-serif); font-weight: 700; letter-spacing: 0.14em; font-size: 13px; color: var(--txt); }
.mkt-brand img { border-radius: 7px; object-fit: cover; }
.mkt-nav-links { display: none; gap: 22px; margin-left: auto; font-size: 13px; }
.mkt-nav-links a { color: var(--txt-2); transition: color 160ms ease; }
.mkt-nav-links a:hover { color: var(--txt); }
.mkt-nav-cta { display: none; gap: 8px; margin-left: 20px; }
.mkt-burger { margin-left: auto; display: grid; gap: 4px; padding: 8px; }
.mkt-burger span { display: block; width: 20px; height: 1.5px; background: var(--txt); }
.mkt-mobile-menu { display: grid; gap: 4px; padding: 12px 20px 20px; background: rgba(7,8,10,0.97); border-bottom: 1px solid var(--line); }
.mkt-mobile-menu a { padding: 11px 2px; color: var(--txt-2); border-bottom: 1px solid var(--line); font-size: 14px; }
.mkt-mobile-menu .mkt-btn { margin-top: 12px; border-bottom: none; }
@media (min-width: 900px) {
  .mkt-nav-links, .mkt-nav-cta { display: flex; }
  .mkt-burger, .mkt-mobile-menu { display: none; }
}

/* BUTTONS */
.mkt-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600;
  border: 1px solid var(--line); color: var(--txt); background: rgba(255,255,255,0.04);
  transition: transform 140ms cubic-bezier(.2,.7,.2,1), background 200ms ease, box-shadow 220ms ease;
  white-space: nowrap;
}
.mkt-btn:hover { transform: translateY(-1px); background: rgba(255,255,255,0.08); }
.mkt-btn-neon { background: var(--neon); color: #06070a; border-color: var(--neon-2); box-shadow: 0 10px 34px -12px rgba(0,224,94,0.7); }
.mkt-btn-neon:hover { background: #12f06e; }
.mkt-btn-ghost { background: transparent; }
.mkt-btn-lg { padding: 15px 24px; font-size: 14px; }
.mkt-btn[aria-disabled="true"] { opacity: .55; pointer-events: none; }

/* SECTION */
.mkt-section { padding: 84px 0; border-top: 1px solid var(--line); }
.mkt-section-head { max-width: 680px; margin-bottom: 40px; }
.mkt-section-head h2 { font-size: clamp(30px, 5vw, 46px); line-height: 1.02; margin: 12px 0 14px; }
.mkt-section-head p { font-size: 15px; line-height: 1.65; color: var(--txt-2); }

/* CARDS */
.mkt-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015));
  border: 1px solid var(--line); border-radius: 16px; padding: 20px;
  transition: transform 220ms cubic-bezier(.2,.7,.2,1), border-color 220ms ease, box-shadow 220ms ease;
}
.mkt-card:hover { transform: translateY(-3px); border-color: rgba(0,224,94,0.35); box-shadow: 0 24px 60px -34px rgba(0,224,94,0.5); }
.mkt-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }

/* FOOTER */
.mkt-footer { border-top: 1px solid var(--line); padding: 56px 0 40px; background: var(--bg-2); }
.mkt-footer-grid { display: grid; gap: 32px; grid-template-columns: 1fr; }
@media (min-width: 780px) { .mkt-footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }
.mkt-footer h3 { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--txt); margin-bottom: 14px; }
.mkt-footer a { display: block; font-size: 13px; color: var(--txt-2); padding: 5px 0; }
.mkt-footer a:hover { color: var(--neon); }
.mkt-footer-blurb { font-size: 13px; line-height: 1.6; margin: 14px 0; max-width: 380px; }
.mkt-social { display: flex; flex-wrap: wrap; gap: 14px; }
.mkt-social a { font-size: 12px; }
.mkt-footer-base { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 12px; color: var(--txt-2); }

/* COOKIE */
.mkt-cookie {
  position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 90;
  display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-radius: 16px; border: 1px solid var(--line);
  background: rgba(12,14,17,0.96); backdrop-filter: blur(18px);
  box-shadow: 0 30px 80px -30px rgba(0,0,0,0.9);
}
.mkt-cookie p { font-size: 12.5px; line-height: 1.6; margin-top: 4px; max-width: 560px; }
.mkt-cookie a { color: var(--neon); text-decoration: underline; }
.mkt-cookie-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.mkt-cookie-actions .mkt-btn { padding: 10px 14px; font-size: 12px; }
.mkt-cookie-prefs { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-size: 12px; color: var(--txt-2); }
.mkt-cookie-prefs label { display: inline-flex; align-items: center; gap: 7px; }
@media (min-width: 900px) { .mkt-cookie { left: auto; right: 20px; bottom: 20px; max-width: 620px; } }

@media (prefers-reduced-motion: reduce) {
  .mkt *, .mkt *::before, .mkt *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
    `}</style>
  );
}
