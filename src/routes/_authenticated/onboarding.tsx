/**
 * AI-powered onboarding — pick interests, get personalized recommendations.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { onboardingRecommendations } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Personalize · ZOMBIEREX" }] }),
  component: OnboardingPage,
});

const INTERESTS = [
  "Sportbikes",
  "Cruisers",
  "Adventure",
  "Cafe racers",
  "Vintage",
  "Electric",
  "Trackdays",
  "MotoGP",
  "Off-road",
  "Rally",
  "Supercars",
  "Muscle cars",
  "Drifting",
  "Mods",
  "Maintenance",
  "Gear",
];

type Result = Awaited<ReturnType<typeof onboardingRecommendations>>;

function OnboardingPage() {
  const call = useServerFn(onboardingRecommendations);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(name: string) {
    setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await call({ data: { interests: picked } });
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? "Could not generate recommendations.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-32">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ PERSONALIZE
        </p>
        <h1 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
          Tune ZOMBIEREX to{" "}
          <span className="italic" style={{ color: "var(--color-neon)" }}>
            your ride
          </span>
        </h1>
        <p className="mt-2 text-[12px]" style={{ color: "var(--color-silver)" }}>
          Pick a few interests. REX will hand-pick crews, events, listings, and creators for you.
        </p>
      </header>

      {!result && (
        <>
          <div className="mt-6 flex flex-wrap gap-2 px-5">
            {INTERESTS.map((i) => {
              const on = picked.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className="tap px-3 py-2 text-[12px]"
                  style={{
                    background: on ? "var(--color-neon)" : "var(--color-graphite)",
                    color: on ? "var(--color-ink)" : "var(--color-ink)",
                    border: `1px solid ${on ? "var(--color-neon)" : "var(--color-hair)"}`,
                    borderRadius: 999,
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  {i}
                </button>
              );
            })}
          </div>

          <div className="mt-8 px-5">
            <button
              onClick={submit}
              disabled={busy}
              className="tap w-full py-3 text-[13px]"
              style={{
                background: "var(--color-ink)",
                color: "var(--color-cloud, #fafafa)",
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              {busy ? "REX is curating…" : "Get my recommendations"}
            </button>
            {error && (
              <p className="mt-3 text-[12px]" style={{ color: "#ff8080" }}>
                {error}
              </p>
            )}
          </div>
        </>
      )}

      {result && (
        <div className="mt-6 space-y-6 px-5">
          <Section title="Crews for you">
            {result.clubs.map((c: any) => (
              <Link key={c.id} to={`/communities/${c.slug}` as any} className="row">
                <div>
                  <div className="text-[13px]" style={{ color: "var(--color-ink)" }}>
                    {c.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--color-silver)" }}>
                    {(c.members_count ?? 0).toLocaleString()} members
                  </div>
                </div>
              </Link>
            ))}
          </Section>
          <Section title="Events near you">
            {result.events.map((e: any) => (
              <Link key={e.id} to={`/events/${e.id}` as any} className="row">
                <div>
                  <div className="text-[13px]" style={{ color: "var(--color-ink)" }}>
                    {e.title}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--color-silver)" }}>
                    {e.location ?? "TBA"} · {new Date(e.starts_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </Section>
          <Section title="From the Vault">
            {result.listings.map((l: any) => (
              <Link key={l.id} to={`/marketplace/${l.id}` as any} className="row">
                <div>
                  <div className="text-[13px]" style={{ color: "var(--color-ink)" }}>
                    {l.title}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--color-silver)" }}>
                    {(l.price_cents / 100).toLocaleString()} {l.currency}
                  </div>
                </div>
              </Link>
            ))}
          </Section>
          <Section title="Creators to follow">
            {result.creators.map((c: any) => (
              <Link key={c.id} to={`/creator/${c.id}` as any} className="row">
                <div>
                  <div className="text-[13px]" style={{ color: "var(--color-ink)" }}>
                    {c.tagline ?? c.category}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--color-silver)" }}>
                    {(c.subscribers_count ?? 0).toLocaleString()} subscribers
                  </div>
                </div>
              </Link>
            ))}
          </Section>

          <button
            onClick={() => setResult(null)}
            className="tap w-full py-3 text-[12px]"
            style={{
              background: "var(--color-graphite)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-hair)",
              borderRadius: 12,
            }}
          >
            Refine interests
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>
        {title.toUpperCase()}
      </p>
      <div className="space-y-1.5">{children}</div>
      <style>{`
        .row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px;
          background: var(--color-graphite);
          border: 1px solid var(--color-hair);
          border-radius: 10px;
        }
      `}</style>
    </section>
  );
}
