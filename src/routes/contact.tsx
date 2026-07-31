import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, MapPin, Briefcase, ShieldCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact ZOMBIEREX — Support, Business & Press" },
      { name: "description", content: "Get in touch with the ZOMBIEREX team for support, partnerships, advertising, press or legal enquiries." },
      { property: "og:title", content: "Contact ZOMBIEREX" },
      { property: "og:description", content: "Support, partnerships, advertising, press and legal contacts for ZOMBIEREX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

const TOPICS = ["Support", "Business & partnerships", "Advertising", "Press", "Legal", "Other"] as const;

function ContactPage() {
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const routeTo =
    topic === "Business & partnerships" || topic === "Advertising" ? siteConfig.contact.business
      : topic === "Press" ? siteConfig.contact.press
      : topic === "Legal" ? siteConfig.contact.legal
      : siteConfig.contact.support;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || message.trim().length < 10) {
      toast.error("Add your name, email and a message of at least 10 characters.");
      return;
    }
    const subject = encodeURIComponent(`[${topic}] ${name.trim()}`);
    const body = encodeURIComponent(`${message.trim()}\n\n— ${name.trim()} (${email.trim()})`);
    window.location.href = `mailto:${routeTo}?subject=${subject}&body=${body}`;
    toast.success("Opening your email app…");
  };

  return (
    <MarketingShell>
      <section className="mkt-section" style={{ borderTop: "none", paddingTop: 56 }}>
        <div className="mkt-wrap">
          <Link to="/" className="mkt-textlink" style={{ marginBottom: 24 }}>
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="mkt-section-head" style={{ marginTop: 18 }}>
            <p className="mkt-eyebrow">Contact</p>
            <h2>Talk to the team.</h2>
            <p>We answer support requests within two business days.</p>
          </div>

          <div className="mkt-split">
            <form className="mkt-card" style={{ display: "grid", gap: 14, padding: 24 }} onSubmit={submit}>
              <label className="mkt-field">
                <span>Topic</span>
                <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="mkt-field">
                <span>Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
              </label>
              <label className="mkt-field">
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </label>
              <label className="mkt-field">
                <span>Message</span>
                <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" />
              </label>
              <button type="submit" className="mkt-btn mkt-btn-neon" style={{ justifySelf: "start" }}>
                <Send size={15} /> Send message
              </button>
              <p className="mkt-muted" style={{ fontSize: 11.5 }}>
                Sends via your email app to <strong>{routeTo}</strong>.
              </p>
            </form>

            <div style={{ display: "grid", gap: 12 }}>
              <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.support}`}>
                <Mail size={16} /><h3>Support</h3><p className="mkt-muted">{siteConfig.contact.support}</p>
              </a>
              <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.business}`}>
                <Briefcase size={16} /><h3>Business &amp; advertising</h3><p className="mkt-muted">{siteConfig.contact.business}</p>
              </a>
              <a className="mkt-card mkt-contact" href={`mailto:${siteConfig.contact.legal}`}>
                <ShieldCheck size={16} /><h3>Legal</h3><p className="mkt-muted">{siteConfig.contact.legal}</p>
              </a>
              <div className="mkt-card mkt-contact">
                <MapPin size={16} /><h3>Headquarters</h3><p className="mkt-muted">{siteConfig.contact.location}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
.mkt-field { display: grid; gap: 7px; }
.mkt-field > span { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--txt-2); }
.mkt-field input, .mkt-field textarea, .mkt-field select {
  width: 100%; padding: 12px 13px; border-radius: 11px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  color: var(--txt); font-size: 14px; outline: none;
}
.mkt-field select option { background: #0c0e11; color: #f4f5f6; }
.mkt-field input:focus, .mkt-field textarea:focus, .mkt-field select:focus { border-color: var(--neon); box-shadow: 0 0 0 3px rgba(0,224,94,0.14); }
.mkt-field textarea { resize: vertical; }
      `}</style>
    </MarketingShell>
  );
}
