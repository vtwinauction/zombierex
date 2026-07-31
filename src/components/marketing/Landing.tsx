import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Video, Gauge, Trophy, Calendar, ScanLine, Award, Car, Users, Map,
  Navigation, Store, Wrench, Briefcase, MessageCircle, Bell, Flag, ShieldCheck,
  Star, ChevronDown, ArrowRight, Mail, MapPin, Check,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { MarketingShell } from "./MarketingShell";
import { StoreButtons } from "./StoreButtons";
import heroBg from "@/assets/auth-jungle-bg.jpg";

const ICONS: Record<string, typeof Sparkles> = {
  sparkles: Sparkles, video: Video, gauge: Gauge, trophy: Trophy, calendar: Calendar,
  scan: ScanLine, award: Award, car: Car, users: Users, map: Map, navigation: Navigation,
  store: Store, wrench: Wrench, briefcase: Briefcase, message: MessageCircle, bell: Bell,
  flag: Flag, shield: ShieldCheck,
};

/** Reveals children once they scroll into view. */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Visible by default so content never depends on observer timing.
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    // Safety net: never leave content hidden if the observer misfires.
    const t = window.setTimeout(() => setSeen(true), 1200);
    return () => { io.disconnect(); window.clearTimeout(t); };
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "none" : "translateY(18px)",
        transition: `opacity 640ms ease ${delay}ms, transform 640ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function useCountUp(target: number, active: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const dur = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return n;
}

function StatValue({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const n = useCountUp(value, on);
  return <span ref={ref}>{n >= 1000 ? n.toLocaleString() : n}{suffix}</span>;
}

export function Landing() {
  return (
    <MarketingShell>
      <LandingStyles />
      <Hero />
      <About />
      <Features />
      <WhyChoose />
      <Screens />
      <TrailerBlock />
      <Stats />
      <Testimonials />
      <DownloadCta />
      <Faq />
      <ContactBlock />
    </MarketingShell>
  );
}

function Hero() {
  return (
    <section className="mkt-hero">
      <img src={heroBg} alt="" className="mkt-hero-bg" aria-hidden="true" />
      <div className="mkt-hero-veil" aria-hidden="true" />
      <div className="mkt-wrap mkt-hero-inner">
        <Reveal>
          <p className="mkt-eyebrow">{siteConfig.tagline}</p>
          <h1 className="mkt-hero-title">
            The world's<br />automotive<br /><span className="mkt-neon">social network.</span>
          </h1>
          <p className="mkt-hero-sub">{siteConfig.subheadline}</p>
          <div className="mkt-hero-cta">
            <StoreButtons />
          </div>
          <div className="mkt-hero-meta">
            <span><Check size={13} /> Free to join</span>
            <span><Check size={13} /> iOS &amp; Android</span>
            <span><Check size={13} /> 90+ countries</span>
          </div>
        </Reveal>
      </div>
      <a href="#about" className="mkt-scroll-hint" aria-label="Scroll to content"><ChevronDown size={18} /></a>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-split">
          <Reveal>
            <div className="mkt-section-head">
              <p className="mkt-eyebrow">About</p>
              <h2>Built by enthusiasts, for enthusiasts.</h2>
              <p>
                ZOMBIEREX exists for the people who wake up thinking about compression ratios,
                apex speed and the smell of race fuel. It is a single home for every corner of
                automotive culture — from garage builds and midnight runs to judged competitions
                and international rallies.
              </p>
              <p style={{ marginTop: 14 }}>
                Share your build, verify your times, plan your routes, sell your parts,
                and find your crew — anywhere in the world.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="mkt-chips">
              {siteConfig.communities.map((c) => (
                <span key={c} className="mkt-chip">{c}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-section-head">
          <p className="mkt-eyebrow">Features</p>
          <h2>Everything the scene needs, in one app.</h2>
          <p>Eighteen core systems engineered for speed, precision and community.</p>
        </div>
        <div className="mkt-grid">
          {siteConfig.features.map((f, i) => {
            const Icon = ICONS[f.icon] ?? Sparkles;
            return (
              <Reveal key={f.title} delay={(i % 4) * 60}>
                <article className="mkt-card mkt-feature">
                  <span className="mkt-feature-icon"><Icon size={18} strokeWidth={1.75} /></span>
                  <h3>{f.title}</h3>
                  <p className="mkt-muted">{f.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhyChoose() {
  return (
    <section className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-section-head">
          <p className="mkt-eyebrow">Why ZOMBIEREX</p>
          <h2>A platform that respects your time.</h2>
        </div>
        <div className="mkt-why">
          {siteConfig.why.map((w, i) => (
            <Reveal key={w.title} delay={(i % 3) * 70}>
              <div className="mkt-why-item">
                <span className="mkt-why-num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{w.title}</h3>
                  <p className="mkt-muted">{w.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Screens() {
  const [active, setActive] = useState(0);
  const shots = siteConfig.screenshots;
  return (
    <section id="screens" className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-section-head">
          <p className="mkt-eyebrow">The app</p>
          <h2>Designed to premium standards.</h2>
          <p>Swipe through the interface riders and drivers use every day.</p>
        </div>

        <div className="mkt-shots" role="group" aria-label="App screenshots">
          {shots.map((s, i) => (
            <button
              key={i}
              className={`mkt-phone ${i === active ? "is-active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={s.caption}
              aria-pressed={i === active}
            >
              <span className="mkt-phone-frame">
                <span className="mkt-phone-notch" />
                <img src={s.src} alt={`ZOMBIEREX ${s.caption} screen`} loading="lazy" />
              </span>
              <span className="mkt-phone-caption">{s.caption}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrailerBlock() {
  const { videoUrl, poster } = siteConfig.trailer;
  return (
    <section className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-section-head">
          <p className="mkt-eyebrow">Trailer</p>
          <h2>See it running.</h2>
        </div>
        <Reveal>
          <div className="mkt-video">
            {videoUrl ? (
              <video src={videoUrl} poster={poster} controls playsInline preload="none" />
            ) : (
              <>
                <img src={poster} alt="ZOMBIEREX app trailer preview" loading="lazy" />
                <div className="mkt-video-veil">
                  <p className="mkt-eyebrow">Official trailer</p>
                  <p style={{ fontSize: 15, marginTop: 8 }}>Dropping with launch.</p>
                </div>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section id="community" className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-section-head">
          <p className="mkt-eyebrow">Community</p>
          <h2>A global paddock.</h2>
        </div>
        <div className="mkt-stats">
          {siteConfig.stats.map((s) => (
            <div key={s.label} className="mkt-stat">
              <div className="mkt-stat-value"><StatValue value={s.value} suffix={s.suffix} /></div>
              <div className="mkt-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-section-head">
          <p className="mkt-eyebrow">Riders &amp; drivers</p>
          <h2>What the community says.</h2>
        </div>
        <div className="mkt-grid">
          {siteConfig.testimonials.map((t, i) => (
            <Reveal key={t.handle} delay={i * 80}>
              <figure className="mkt-card mkt-quote">
                <div className="mkt-stars" aria-label={`${t.rating} out of 5`}>
                  {Array.from({ length: t.rating }).map((_, k) => (
                    <Star key={k} size={13} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <blockquote>“{t.quote}”</blockquote>
                <figcaption>
                  <img src={t.avatar} alt="" loading="lazy" />
                  <span>
                    <strong>{t.name}</strong>
                    <span className="mkt-muted">{t.handle} · {t.location}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadCta() {
  return (
    <section id="download" className="mkt-section">
      <div className="mkt-wrap">
        <Reveal>
          <div className="mkt-cta-panel">
            <div>
              <p className="mkt-eyebrow">Download</p>
              <h2 style={{ fontSize: "clamp(28px,4.4vw,42px)", margin: "12px 0 12px" }}>
                Start your engine.
              </h2>
              <p className="mkt-muted" style={{ maxWidth: 460, lineHeight: 1.65, fontSize: 14 }}>
                Version {siteConfig.downloads.version} · {siteConfig.downloads.releaseDate}.
                Free to download, free to join.
              </p>
              <div style={{ marginTop: 22 }}><StoreButtons /></div>
              <Link to="/download" className="mkt-textlink">
                All download options <ArrowRight size={14} />
              </Link>
            </div>
            <ul className="mkt-release">
              {siteConfig.downloads.releaseNotes.map((r) => (
                <li key={r}><Check size={14} /> {r}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-section-head">
          <p className="mkt-eyebrow">FAQ</p>
          <h2>Questions, answered.</h2>
        </div>
        <div className="mkt-faq">
          {siteConfig.faqs.map((f, i) => (
            <div key={f.q} className={`mkt-faq-item ${open === i ? "is-open" : ""}`}>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span>{f.q}</span>
                <ChevronDown size={16} />
              </button>
              {open === i && <p className="mkt-muted">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactBlock() {
  return (
    <section id="contact" className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-section-head">
          <p className="mkt-eyebrow">Contact</p>
          <h2>Talk to us.</h2>
        </div>
        <div className="mkt-grid">
          <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.support}`}>
            <Mail size={16} /><h3>Support</h3><p className="mkt-muted">{siteConfig.contact.support}</p>
          </a>
          <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.business}`}>
            <Briefcase size={16} /><h3>Business &amp; partnerships</h3><p className="mkt-muted">{siteConfig.contact.business}</p>
          </a>
          <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.legal}`}>
            <ShieldCheck size={16} /><h3>Legal</h3><p className="mkt-muted">{siteConfig.contact.legal}</p>
          </a>
          <div className="mkt-card mkt-contact">
            <MapPin size={16} /><h3>Headquarters</h3><p className="mkt-muted">{siteConfig.contact.location}</p>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Link to="/contact" className="mkt-btn mkt-btn-ghost">Open contact form</Link>
        </div>
      </div>
    </section>
  );
}

function LandingStyles() {
  return (
    <style>{`
.mkt-hero { position: relative; min-height: 92svh; display: flex; align-items: center; overflow: hidden; }
.mkt-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .5; }
.mkt-hero-veil {
  position: absolute; inset: 0;
  background:
    radial-gradient(120% 80% at 20% 10%, rgba(0,224,94,0.14), transparent 60%),
    linear-gradient(180deg, rgba(7,8,10,0.55) 0%, rgba(7,8,10,0.82) 55%, #07080a 100%);
}
.mkt-hero-inner { position: relative; padding: 120px 20px 90px; }
.mkt-hero-title { font-size: clamp(42px, 9vw, 86px); line-height: 0.95; margin: 16px 0 20px; font-weight: 700; }
.mkt-neon { color: var(--neon); text-shadow: 0 0 44px rgba(0,224,94,0.45); }
.mkt-hero-sub { font-size: clamp(15px, 2vw, 18px); line-height: 1.6; color: var(--txt-2); max-width: 560px; }
.mkt-hero-cta { margin-top: 30px; }
.mkt-hero-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 26px; font-size: 12px; color: var(--txt-2); }
.mkt-hero-meta span { display: inline-flex; align-items: center; gap: 6px; }
.mkt-hero-meta svg { color: var(--neon); }
.mkt-scroll-hint { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); color: var(--txt-2); animation: mktBob 2.4s ease-in-out infinite; }
@keyframes mktBob { 0%,100% { transform: translate(-50%,0); } 50% { transform: translate(-50%,7px); } }

.mkt-split { display: grid; gap: 34px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 900px) { .mkt-split { grid-template-columns: 1.15fr 1fr; gap: 60px; } }
.mkt-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.mkt-chip { padding: 9px 14px; border-radius: 999px; border: 1px solid var(--line); font-size: 12px; color: var(--txt-2); background: rgba(255,255,255,0.03); }

.mkt-feature h3 { font-size: 15px; margin: 14px 0 6px; }
.mkt-feature p { font-size: 13px; line-height: 1.55; }
.mkt-feature-icon { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 11px; background: rgba(0,224,94,0.1); border: 1px solid rgba(0,224,94,0.28); color: var(--neon); }

.mkt-why { display: grid; gap: 18px; grid-template-columns: 1fr; }
@media (min-width: 720px) { .mkt-why { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1050px) { .mkt-why { grid-template-columns: repeat(3, 1fr); } }
.mkt-why-item { display: flex; gap: 14px; padding: 18px 0; border-top: 1px solid var(--line); }
.mkt-why-num { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--neon); padding-top: 3px; }
.mkt-why-item h3 { font-size: 15px; margin-bottom: 6px; }
.mkt-why-item p { font-size: 13px; line-height: 1.55; }

.mkt-shots { display: flex; gap: 18px; overflow-x: auto; padding: 6px 2px 22px; scroll-snap-type: x mandatory; }
.mkt-shots::-webkit-scrollbar { height: 4px; }
.mkt-shots::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 4px; }
.mkt-phone { flex: 0 0 auto; scroll-snap-align: center; text-align: center; transition: transform 260ms cubic-bezier(.2,.7,.2,1), opacity 260ms ease; opacity: .62; }
.mkt-phone.is-active { opacity: 1; transform: translateY(-6px); }
.mkt-phone-frame { position: relative; display: block; width: 214px; height: 440px; border-radius: 34px; padding: 9px; background: linear-gradient(160deg,#26292d,#0d0f12); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 40px 90px -40px rgba(0,0,0,0.95); overflow: hidden; }
.mkt-phone-frame img { width: 100%; height: 100%; object-fit: cover; border-radius: 27px; }
.mkt-phone-notch { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 74px; height: 18px; border-radius: 999px; background: #050607; z-index: 2; }
.mkt-phone-caption { display: block; margin-top: 12px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--txt-2); }

.mkt-video { position: relative; border-radius: 20px; overflow: hidden; border: 1px solid var(--line); aspect-ratio: 16/9; background: #000; }
.mkt-video img, .mkt-video video { width: 100%; height: 100%; object-fit: cover; }
.mkt-video-veil { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; background: linear-gradient(180deg, rgba(7,8,10,0.35), rgba(7,8,10,0.85)); }

.mkt-stats { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; grid-template-columns: repeat(2, 1fr); }
@media (min-width: 780px) { .mkt-stats { grid-template-columns: repeat(4, 1fr); } }
.mkt-stat { background: var(--bg); padding: 26px 18px; }
.mkt-stat-value { font-family: var(--font-display, sans-serif); font-size: clamp(24px,3.4vw,34px); font-weight: 700; letter-spacing: -0.03em; color: var(--neon); font-variant-numeric: tabular-nums; }
.mkt-stat-label { margin-top: 6px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--txt-2); }

.mkt-quote blockquote { font-size: 15px; line-height: 1.6; margin: 14px 0 18px; }
.mkt-stars { display: flex; gap: 3px; color: var(--neon); }
.mkt-quote figcaption { display: flex; align-items: center; gap: 11px; }
.mkt-quote figcaption img { width: 38px; height: 38px; border-radius: 999px; object-fit: cover; }
.mkt-quote figcaption strong { display: block; font-size: 13px; }
.mkt-quote figcaption span span { font-size: 11.5px; }

.mkt-cta-panel { display: grid; gap: 32px; padding: 34px; border-radius: 22px; border: 1px solid rgba(0,224,94,0.24); background: radial-gradient(120% 140% at 0% 0%, rgba(0,224,94,0.12), rgba(255,255,255,0.02) 55%); }
@media (min-width: 900px) { .mkt-cta-panel { grid-template-columns: 1.3fr 1fr; align-items: center; padding: 48px; } }
.mkt-release { display: grid; gap: 12px; }
.mkt-release li { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: var(--txt-2); }
.mkt-release svg { color: var(--neon); flex: 0 0 auto; margin-top: 2px; }
.mkt-textlink { display: inline-flex; align-items: center; gap: 7px; margin-top: 18px; font-size: 13px; color: var(--neon); }

.mkt-faq { border-top: 1px solid var(--line); }
.mkt-faq-item { border-bottom: 1px solid var(--line); }
.mkt-faq-item button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 16px; padding: 19px 0; text-align: left; font-size: 15px; font-weight: 500; color: var(--txt); }
.mkt-faq-item svg { flex: 0 0 auto; transition: transform 220ms ease; color: var(--txt-2); }
.mkt-faq-item.is-open svg { transform: rotate(180deg); color: var(--neon); }
.mkt-faq-item p { padding: 0 0 20px; font-size: 14px; line-height: 1.7; max-width: 760px; }

.mkt-contact { display: block; }
.mkt-contact svg { color: var(--neon); }
.mkt-contact h3 { font-size: 14px; margin: 12px 0 5px; }
.mkt-contact p { font-size: 13px; }
    `}</style>
  );
}
