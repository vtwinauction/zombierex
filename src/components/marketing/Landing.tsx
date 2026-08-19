import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Video,
  Gauge,
  Trophy,
  Calendar,
  ScanLine,
  Award,
  Car,
  Users,
  Map,
  Navigation,
  Store,
  Wrench,
  Briefcase,
  MessageCircle,
  Bell,
  Flag,
  ShieldCheck,
  Star,
  ChevronDown,
  ArrowRight,
  ArrowUpRight,
  Mail,
  MapPin,
  Check,
  Send,
  Hand,
  Heart,
  ZoomIn,
  RefreshCw,
  Vibrate,
  Fingerprint,
  Smartphone,
  MousePointerClick as PointerClick,
} from "lucide-react";
import { toast } from "sonner";
import { siteConfig } from "@/config/site";
import { MarketingShell } from "./MarketingShell";
import { slugify } from "@/config/feature-guides";
import { StoreButtons } from "./StoreButtons";
import heroBg from "@/assets/auth-jungle-bg.jpg";
import { BoneRule, HexBolt, ClawPiston } from "./ThemeDecor";

const ICONS: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  video: Video,
  gauge: Gauge,
  trophy: Trophy,
  calendar: Calendar,
  scan: ScanLine,
  award: Award,
  car: Car,
  users: Users,
  map: Map,
  navigation: Navigation,
  store: Store,
  wrench: Wrench,
  briefcase: Briefcase,
  message: MessageCircle,
  bell: Bell,
  flag: Flag,
  shield: ShieldCheck,
};

/** Reveals children once they scroll into view. */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Visible by default so content never depends on observer timing.
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    const t = window.setTimeout(() => setSeen(true), 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
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
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    const t = window.setTimeout(() => setOn(true), 900);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };

  }, []);
  const n = useCountUp(value, on);
  return (
    <span ref={ref}>
      {n >= 1000 ? n.toLocaleString() : n}
      {suffix}
    </span>
  );
}

/** Small numbered section header used across the page. */
function SectionHead({
  index,
  eyebrow,
  title,
  body,
  align = "left",
}: {
  index: string;
  eyebrow: string;
  title: string;
  body?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`mkt-head ${align === "center" ? "is-center" : ""}`}>
      <p className="mkt-eyebrow">
        <span className="mkt-head-idx">{index}</span>
        {eyebrow}
      </p>
      <h2>{title}</h2>
      {body && <p className="mkt-head-body">{body}</p>}
    </div>
  );
}

export function Landing() {
  return (
    <MarketingShell>
      <LandingStyles />
      <Hero />
      <Marquee />
      <StatsBand />
      <About />
      <Features />
      <WhyChoose />
      <Screens />
      <TrailerBlock />
      <BoneRule />
      <Testimonials />
      <DownloadCta />
      <Faq />
      <TouchBlock />
      <ContactBlock />

    </MarketingShell>
  );
}

function Hero() {
  const shots = siteConfig.screenshots;
  return (
    <section className="mkt-hero">
      <img src={heroBg} alt="" className="mkt-hero-bg" aria-hidden="true" />
      <div className="mkt-hero-veil" aria-hidden="true" />
      <div className="mkt-hero-grid" aria-hidden="true" />
      <div className="mkt-wrap mkt-hero-inner">
        <div className="mkt-hero-copy">
          <Reveal>
            <p className="mkt-eyebrow mkt-eyebrow-stamp">
              <ClawPiston size={15} />
              {siteConfig.tagline}
            </p>
            <h1 className="mkt-hero-title">
              The world&rsquo;s automotive <span className="mkt-neon">social network.</span>
            </h1>
            <p className="mkt-hero-sub">{siteConfig.subheadline}</p>
            <div className="mkt-hero-cta">
              <StoreButtons />
            </div>
            <div className="mkt-hero-meta">
              <span>
                <Check size={13} /> Free to join
              </span>
              <span>
                <Check size={13} /> iOS &amp; Android
              </span>
              <span>
                <Check size={13} /> 90+ countries
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="mkt-hero-stage" aria-hidden="true">
            <div className="mkt-hero-glow" />
            {shots.slice(0, 3).map((s, i) => (
              <span key={i} className={`mkt-hero-phone p${i + 1}`}>
                <span className="mkt-phone-notch" />
                <img src={s.src} alt="" loading={i === 0 ? "eager" : "lazy"} />
              </span>
            ))}
            <span className="mkt-hero-badge">
              <Gauge size={14} /> 0&ndash;100 verified
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [...siteConfig.communities, ...siteConfig.communities];
  return (
    <div className="mkt-marquee" aria-hidden="true">
      <div className="mkt-marquee-track">
        {items.map((c, i) => (
          <span key={`${c}-${i}`}>
            {c}
            <i>/</i>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatsBand() {
  return (
    <section id="community" className="mkt-band">
      <div className="mkt-wrap">
        <div className="mkt-stats">
          {siteConfig.stats.slice(0, 4).map((s) => (
            <div key={s.label} className="mkt-stat">
              <div className="mkt-stat-value">
                <StatValue value={s.value} suffix={s.suffix} />
              </div>
              <div className="mkt-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="mkt-section">
      <div className="mkt-wrap">
        <div className="mkt-split">
          <Reveal>
            <SectionHead
              index="01"
              eyebrow="About"
              title="Built by enthusiasts, for enthusiasts."
              body="ZOMBIEREX exists for the people who wake up thinking about compression ratios, apex speed and the smell of race fuel — a single home for every corner of automotive culture."
            />
            <p className="mkt-muted mkt-about-p">
              Share your build, verify your times, plan your routes, sell your parts, and find your
              crew — anywhere in the world.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mkt-chips">
              {siteConfig.communities.map((c) => (
                <span key={c} className="mkt-chip">
                  {c}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const spotlight = siteConfig.features.slice(0, 3);
  const rest = siteConfig.features.slice(3);
  return (
    <section id="features" className="mkt-section">
      <div className="mkt-wrap">
        <SectionHead
          index="02"
          eyebrow="Features"
          title="Everything the scene needs, in one app."
          body="Eighteen core systems engineered for speed, precision and community."
        />

        <div className="mkt-bento">
          {spotlight.map((f, i) => {
            const Icon = ICONS[f.icon] ?? Sparkles;
            return (
              <Reveal key={f.title} delay={i * 70}>
                <Link
                  to="/features/$slug"
                  params={{ slug: slugify(f.title) }}
                  className="mkt-card mkt-spot"
                  aria-label={`How to use ${f.title}`}
                >
                  <span className="mkt-spot-icon">
                    <Icon size={22} strokeWidth={1.6} />
                  </span>
                  <h3>{f.title}</h3>
                  <p className="mkt-muted">{f.body}</p>
                  <span className="mkt-textlink">
                    How to use <ArrowUpRight size={14} />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <div className="mkt-grid mkt-grid-tight">
          {rest.map((f, i) => {
            const Icon = ICONS[f.icon] ?? Sparkles;
            return (
              <Reveal key={f.title} delay={(i % 4) * 50}>
                <Link
                  to="/features/$slug"
                  params={{ slug: slugify(f.title) }}
                  className="mkt-card mkt-feature"
                  aria-label={`How to use ${f.title}`}
                >
                  <span className="mkt-feature-bolt">
                    <HexBolt size={11} />
                  </span>
                  <span className="mkt-feature-icon">
                    <Icon size={17} strokeWidth={1.75} />
                  </span>
                  <h3>{f.title}</h3>
                  <p className="mkt-muted">{f.body}</p>
                </Link>
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
        <SectionHead index="03" eyebrow="Why ZOMBIEREX" title="A platform that respects your time." />
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
        <SectionHead
          index="04"
          eyebrow="The app"
          title="Designed to premium standards."
          body="Swipe through the interface riders and drivers use every day."
        />

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
        <SectionHead index="05" eyebrow="Trailer" title="See it running." />
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

function Testimonials() {
  return (
    <section className="mkt-section">
      <div className="mkt-wrap">
        <SectionHead index="06" eyebrow="Riders & drivers" title="What the community says." />
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
                    <span className="mkt-muted">
                      {t.handle} · {t.location}
                    </span>
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
              <h2 className="mkt-cta-title">Start your engine.</h2>
              <p className="mkt-muted mkt-cta-sub">
                Version {siteConfig.downloads.version} · {siteConfig.downloads.releaseDate}. Free to
                download, free to join.
              </p>
              <div style={{ marginTop: 22 }}>
                <StoreButtons />
              </div>
              <Link to="/download" className="mkt-textlink">
                All download options <ArrowRight size={14} />
              </Link>
            </div>
            <ul className="mkt-release">
              {siteConfig.downloads.releaseNotes.map((r) => (
                <li key={r}>
                  <Check size={14} /> {r}
                </li>
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
        <SectionHead index="07" eyebrow="FAQ" title="Questions, answered." />
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

const GESTURES = [
  { icon: PointerClick, title: "Tap", body: "Ignite a reel, open a listing, or fire a reaction instantly." },
  { icon: Hand, title: "Swipe", body: "Flick vertically through reels, horizontally through stories." },
  { icon: Heart, title: "Double-tap", body: "Drop a claw-mark like straight on the media surface." },
  { icon: ZoomIn, title: "Pinch", body: "Zoom telemetry maps and inspect build photos in detail." },
  { icon: RefreshCw, title: "Pull to refresh", body: "Drag down anywhere to resync feed, atlas, and garage." },
  { icon: Vibrate, title: "Haptics", body: "Every confirmed action answers back with a machined pulse." },
  { icon: Fingerprint, title: "Biometric unlock", body: "Face or fingerprint gate on your private garage." },
  { icon: Smartphone, title: "One-hand reach", body: "Floating pill nav sits inside your thumb arc." },
];

function TouchBlock() {
  return (
    <section id="touch" className="mkt-section">
      <div className="mkt-wrap">
        <SectionHead
          index="08"
          eyebrow="Touch"
          title="Built for thumbs, gloves and speed."
          body="Every interaction is tuned for a phone in motion — large targets, native gestures, instant feedback."
        />
        <div className="mkt-touch">
          {GESTURES.map((g, i) => {
            const Icon = g.icon;
            return (
              <Reveal key={g.title} delay={i * 50}>
                <div className="mkt-card mkt-touch-card">
                  <span className="mkt-touch-ico">
                    <Icon size={18} />
                  </span>
                  <h3>{g.title}</h3>
                  <p className="mkt-muted">{g.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const TOPICS = [
  "Support",
  "Business & partnerships",
  "Advertising",
  "Press",
  "Legal",
  "Other",
] as const;

function ContactBlock() {
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const routeTo =
    topic === "Business & partnerships" || topic === "Advertising"
      ? siteConfig.contact.business
      : topic === "Press"
        ? siteConfig.contact.press
        : topic === "Legal"
          ? siteConfig.contact.legal
          : siteConfig.contact.support;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().slice(0, 100);
    const em = email.trim().slice(0, 255);
    const msg = message.trim().slice(0, 2000);
    if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || msg.length < 10) {
      toast.error("Add your name, a valid email and a message of at least 10 characters.");
      return;
    }
    const subject = encodeURIComponent(`[${topic}] ${n}`);
    const body = encodeURIComponent(`${msg}\n\n— ${n} (${em})`);
    window.location.href = `mailto:${routeTo}?subject=${subject}&body=${body}`;
    toast.success("Opening your email app…");
  };

  return (
    <section id="contact" className="mkt-section">
      <div className="mkt-wrap">
        <SectionHead index="09" eyebrow="Contact" title="Talk to us." />
        <div className="mkt-split">
          <form className="mkt-card mkt-form" onSubmit={submit}>
            <label className="mkt-field">
              <span>Topic</span>
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="mkt-field">
              <span>Name</span>
              <input
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label className="mkt-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="mkt-field">
              <span>Message</span>
              <textarea
                rows={5}
                value={message}
                maxLength={2000}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
              />
            </label>
            <button type="submit" className="mkt-btn mkt-btn-neon" style={{ justifySelf: "start" }}>
              <Send size={15} /> Send message
            </button>
            <p className="mkt-muted" style={{ fontSize: 11.5 }}>
              Sends via your email app to <strong>{routeTo}</strong>.
            </p>
          </form>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.support}`}>
              <Mail size={16} />
              <h3>Support</h3>
              <p className="mkt-muted">{siteConfig.contact.support}</p>
            </a>
            <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.business}`}>
              <Briefcase size={16} />
              <h3>Business &amp; partnerships</h3>
              <p className="mkt-muted">{siteConfig.contact.business}</p>
            </a>
            <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.legal}`}>
              <ShieldCheck size={16} />
              <h3>Legal</h3>
              <p className="mkt-muted">{siteConfig.contact.legal}</p>
            </a>
            <div className="mkt-card mkt-contact">
              <MapPin size={16} />
              <h3>Headquarters</h3>
              <p className="mkt-muted">{siteConfig.contact.location}</p>
            </div>
            <Link to="/contact" className="mkt-textlink">
              Full contact page <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


function LandingStyles() {
  return (
    <style>{`
/* ---------- HERO ---------- */
.mkt-hero { position: relative; overflow: hidden; }
.mkt-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .14; filter: saturate(.85); }
.mkt-hero-veil {
  position: absolute; inset: 0;
  background:
    radial-gradient(90% 70% at 12% 6%, rgba(0,200,83,0.14), transparent 60%),
    linear-gradient(180deg, rgba(250,250,250,0.86) 0%, rgba(250,250,250,0.92) 60%, #fafafa 100%);
}
.mkt-hero-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: .55;
  background-image:
    linear-gradient(rgba(10,10,10,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(10,10,10,0.045) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(80% 70% at 25% 30%, #000 0%, transparent 80%);
}
.mkt-hero-inner {
  position: relative; display: grid; gap: 44px; align-items: center;
  padding: 76px 22px 68px;
}
@media (min-width: 980px) {
  .mkt-hero-inner { grid-template-columns: 1.05fr 0.95fr; gap: 40px; padding: 104px 22px 96px; }
}
.mkt-hero-title {
  font-size: clamp(38px, 6.2vw, 68px); line-height: 1.0; margin: 16px 0 20px;
  font-weight: 600; letter-spacing: -0.045em; color: var(--txt); max-width: 12ch;
}
.mkt-neon { color: var(--neon); }
.mkt-hero-sub { font-size: clamp(14.5px, 1.6vw, 17px); line-height: 1.66; color: var(--txt-2); max-width: 500px; }
.mkt-hero-cta { margin-top: 30px; }
.mkt-hero-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; font-size: 12px; color: var(--txt-2); }
.mkt-hero-meta span {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 999px;
  border: 1px solid var(--line); background: rgba(255,255,255,0.85);
}
.mkt-hero-meta svg { color: var(--neon); }

.mkt-hero-stage { position: relative; height: 420px; display: none; }
@media (min-width: 700px) { .mkt-hero-stage { display: block; } }
@media (min-width: 980px) { .mkt-hero-stage { height: 520px; } }
.mkt-hero-glow {
  position: absolute; inset: 8% 6%; border-radius: 50%;
  background: radial-gradient(circle at 50% 45%, rgba(0,200,83,0.20), transparent 62%);
  filter: blur(22px);
}
.mkt-hero-phone {
  position: absolute; display: block; overflow: hidden;
  border-radius: 30px; padding: 8px;
  background: linear-gradient(160deg,#2a2d31,#0c0e11);
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 50px 90px -50px rgba(0,0,0,0.65);
}
.mkt-hero-phone img { width: 100%; height: 100%; object-fit: cover; border-radius: 23px; display: block; }
.mkt-hero-phone.p1 { width: 42%; aspect-ratio: 9/19; left: 6%; top: 12%; transform: rotate(-6deg); z-index: 2; }
.mkt-hero-phone.p2 { width: 46%; aspect-ratio: 9/19; left: 32%; top: 0; transform: rotate(2deg); z-index: 3; }
.mkt-hero-phone.p3 { width: 38%; aspect-ratio: 9/19; right: 0; top: 24%; transform: rotate(8deg); z-index: 1; opacity: .95; }
.mkt-hero-badge {
  position: absolute; left: 2%; bottom: 6%; z-index: 4;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: 600;
  background: rgba(255,255,255,0.94); border: 1px solid var(--line);
  box-shadow: 0 20px 40px -26px rgba(0,0,0,0.45);
}
.mkt-hero-badge svg { color: var(--neon); }

/* ---------- MARQUEE ---------- */
.mkt-marquee { overflow: hidden; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: #fff; }
.mkt-marquee-track {
  display: flex; gap: 26px; white-space: nowrap; padding: 13px 0;
  font-family: var(--font-mono, monospace); font-size: 11px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--txt-3);
  animation: mktSlide 46s linear infinite; width: max-content;
}
.mkt-marquee-track span { display: inline-flex; gap: 26px; align-items: center; }
.mkt-marquee-track i { color: var(--neon); font-style: normal; }
@keyframes mktSlide { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ---------- SECTION SYSTEM ---------- */
.mkt-band { padding: 40px 0; }
.mkt-head { max-width: 720px; margin-bottom: 40px; }
.mkt-head.is-center { margin-inline: auto; text-align: center; }
.mkt-head-idx {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 18px; padding: 0 5px; border-radius: 5px;
  background: var(--neon-soft); color: var(--neon-2); font-size: 9.5px;
}
.mkt-head h2 { font-size: clamp(28px, 4.4vw, 44px); line-height: 1.06; margin: 14px 0 14px; letter-spacing: -0.038em; }
.mkt-head-body { font-size: 15px; line-height: 1.7; color: var(--txt-2); }
.mkt-about-p { font-size: 14px; line-height: 1.7; max-width: 560px; }

/* ---------- BENTO SPOTLIGHT ---------- */
.mkt-bento { display: grid; gap: 16px; grid-template-columns: 1fr; margin-bottom: 16px; }
@media (min-width: 860px) { .mkt-bento { grid-template-columns: repeat(3, 1fr); } }
.mkt-spot {
  display: flex; flex-direction: column; align-items: flex-start; gap: 10px;
  min-height: 220px; padding: 26px; color: inherit; text-decoration: none;
  background: linear-gradient(180deg, #ffffff, #f7f9f8);
}
.mkt-spot h3 { font-size: 19px; letter-spacing: -0.025em; margin-top: 4px; }
.mkt-spot p { font-size: 14px; line-height: 1.6; }
.mkt-spot .mkt-textlink { margin-top: auto; }
.mkt-spot-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 14px; color: var(--neon-2);
  background: linear-gradient(180deg, rgba(0,200,83,0.18), rgba(0,200,83,0.05));
  border: 1px solid rgba(0,200,83,0.32);
}

/* ---------- FEATURE GRID ---------- */
.mkt-grid-tight { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
.mkt-feature { position: relative; overflow: hidden; display: block; color: inherit; text-decoration: none; padding: 20px; }
.mkt-feature h3 { font-size: 14.5px; margin: 14px 0 6px; letter-spacing: -0.02em; }
.mkt-feature p { font-size: 13px; line-height: 1.55; }
.mkt-feature-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 11px;
  background: linear-gradient(180deg, rgba(0,200,83,0.14), rgba(0,200,83,0.04));
  border: 1px solid rgba(0,200,83,0.26); color: var(--neon-2);
  transition: transform 220ms ease, box-shadow 220ms ease;
}
.mkt-card:hover .mkt-feature-icon { transform: translateY(-1px); box-shadow: 0 8px 22px -12px rgba(0,200,83,0.6); }
.mkt-feature-bolt { position: absolute; top: 10px; right: 10px; color: rgba(107,107,107,0.4); line-height: 0; }
.mkt-feature:hover .mkt-feature-bolt { color: var(--neon); }

.mkt-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.mkt-chip {
  padding: 9px 14px; border-radius: 999px; border: 1px solid var(--line);
  font-size: 12px; color: var(--txt-2); background: #ffffff;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
}
.mkt-chip:hover { color: var(--txt); border-color: rgba(0,200,83,0.45); background: var(--neon-soft); }

.mkt-split { display: grid; gap: 34px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 900px) { .mkt-split { grid-template-columns: 1.15fr 1fr; gap: 60px; } }

.mkt-decor { position: absolute; pointer-events: none; color: rgba(107,107,107,0.45); }
.mkt-eyebrow-stamp { display: inline-flex; align-items: center; gap: 8px; }
.mkt-eyebrow-stamp svg { color: var(--neon); }

.mkt-bone-rule { display: flex; align-items: center; gap: 14px; max-width: 1180px; margin: 0 auto; padding: 0 20px; color: rgba(107,107,107,0.5); }
.mkt-bone-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--line), transparent); }
.mkt-bone-svg { width: 116px; height: 26px; flex: 0 0 auto; filter: drop-shadow(0 0 10px rgba(0,200,83,0.22)); }

.mkt-why { display: grid; gap: 18px; grid-template-columns: 1fr; }
@media (min-width: 720px) { .mkt-why { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1050px) { .mkt-why { grid-template-columns: repeat(3, 1fr); } }
.mkt-why-item { display: flex; gap: 14px; padding: 18px 0; border-top: 1px solid var(--line); }
.mkt-why-num { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--neon); padding-top: 3px; }
.mkt-why-item h3 { font-size: 15px; margin-bottom: 6px; }
.mkt-why-item p { font-size: 13px; line-height: 1.55; }

.mkt-shots { display: flex; gap: 18px; overflow-x: auto; padding: 6px 2px 22px; scroll-snap-type: x mandatory; }
.mkt-shots::-webkit-scrollbar { height: 4px; }
.mkt-shots::-webkit-scrollbar-thumb { background: rgba(10,10,10,0.18); border-radius: 4px; }
.mkt-phone { flex: 0 0 auto; scroll-snap-align: center; text-align: center; transition: transform 260ms cubic-bezier(.2,.7,.2,1), opacity 260ms ease; opacity: .62; }
.mkt-phone.is-active { opacity: 1; transform: translateY(-6px); }
.mkt-phone-frame { position: relative; display: block; width: 214px; height: 440px; border-radius: 34px; padding: 9px; background: linear-gradient(160deg,#26292d,#0d0f12); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 40px 90px -44px rgba(0,0,0,0.5); overflow: hidden; }
.mkt-phone-frame img { width: 100%; height: 100%; object-fit: cover; border-radius: 27px; }
.mkt-phone-notch { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 68px; height: 16px; border-radius: 999px; background: #050607; z-index: 2; }
.mkt-phone-caption { display: block; margin-top: 12px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--txt-2); }

.mkt-video { position: relative; border-radius: 20px; overflow: hidden; border: 1px solid var(--line); aspect-ratio: 16/9; background: var(--bg-2); }
.mkt-video img, .mkt-video video { width: 100%; height: 100%; object-fit: cover; }
.mkt-video-veil { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; background: linear-gradient(180deg, rgba(250,250,250,0.4), rgba(250,250,250,0.9)); }

.mkt-stats { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; grid-template-columns: repeat(2, 1fr); }
@media (min-width: 780px) { .mkt-stats { grid-template-columns: repeat(4, 1fr); } }
.mkt-stat { background: #ffffff; padding: 24px 18px; }
.mkt-stat-value { font-family: var(--font-display, sans-serif); font-size: clamp(24px,3.4vw,34px); font-weight: 700; letter-spacing: -0.03em; color: var(--txt); font-variant-numeric: tabular-nums; }
.mkt-stat-label { margin-top: 6px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--txt-2); }

.mkt-quote blockquote { font-size: 15px; line-height: 1.6; margin: 14px 0 18px; }
.mkt-stars { display: flex; gap: 3px; color: var(--neon); }
.mkt-quote figcaption { display: flex; align-items: center; gap: 11px; }
.mkt-quote figcaption img { width: 38px; height: 38px; border-radius: 999px; object-fit: cover; }
.mkt-quote figcaption strong { display: block; font-size: 13px; }
.mkt-quote figcaption span span { font-size: 11.5px; }

.mkt-cta-panel { display: grid; gap: 32px; padding: 34px; border-radius: 22px; border: 1px solid rgba(0,200,83,0.28); background: radial-gradient(120% 140% at 0% 0%, rgba(0,200,83,0.1), #ffffff 55%); }
@media (min-width: 900px) { .mkt-cta-panel { grid-template-columns: 1.3fr 1fr; align-items: center; padding: 48px; } }
.mkt-cta-title { font-size: clamp(28px,4.4vw,42px); margin: 12px 0; letter-spacing: -0.038em; }
.mkt-cta-sub { max-width: 460px; line-height: 1.65; font-size: 14px; }
.mkt-release { display: grid; gap: 12px; }
.mkt-release li { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: var(--txt-2); }
.mkt-release svg { color: var(--neon); flex: 0 0 auto; margin-top: 2px; }
.mkt-textlink { display: inline-flex; align-items: center; gap: 7px; margin-top: 16px; font-size: 13px; font-weight: 600; color: var(--neon-2); }

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

/* ---------- TOUCH ---------- */
.mkt-touch { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
.mkt-touch-card { padding: 20px; height: 100%; transition: transform .18s ease, border-color .18s ease; }
.mkt-touch-card:hover { transform: translateY(-3px); border-color: var(--neon); }
.mkt-touch-ico {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 12px;
  border: 1px solid var(--line); color: var(--neon);
  background: rgba(0,224,94,0.08);
}
.mkt-touch-card h3 { font-size: 14px; margin: 13px 0 6px; }
.mkt-touch-card p { font-size: 13px; line-height: 1.6; }

/* ---------- CONTACT FORM ---------- */
.mkt-form { display: grid; gap: 14px; padding: 24px; }
.mkt-field { display: grid; gap: 7px; }
.mkt-field > span { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--txt-2); }
.mkt-field input, .mkt-field textarea, .mkt-field select {
  width: 100%; padding: 12px 13px; border-radius: 11px;
  background: #ffffff; border: 1px solid var(--line);
  color: var(--txt); font-size: 14px; outline: none; min-height: 44px;
}
.mkt-field select option { background: #ffffff; color: #0a0a0a; }
.mkt-field input:focus, .mkt-field textarea:focus, .mkt-field select:focus { border-color: var(--neon); box-shadow: 0 0 0 3px rgba(0,224,94,0.14); }
.mkt-field textarea { resize: vertical; }



@media (prefers-reduced-motion: reduce) {
  .mkt-marquee-track { animation: none; }
}
    `}</style>
  );
}
