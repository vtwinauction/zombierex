import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createCommunityEvent, getCommunityBySlug } from "@/lib/communities.functions";

const TYPES = ["meet","ride","drag","drift","track_day","off_road","bike_night","show","cars_coffee","rally","monster_truck"] as const;

export const Route = createFileRoute("/_authenticated/communities/$slug/events/new")({
  head: () => ({ meta: [
    { title: "New Event · ZOMBIEREX Communities" },
    { name: "description", content: "Schedule a ride, meet, or event for your community." },
    { property: "og:title", content: "New Event · ZOMBIEREX Communities" },
    { property: "og:description", content: "Schedule a ride, meet, or event for your community." },
  ] }),
  component: NewEvent,
});

function NewEvent() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("meet");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [cover, setCover] = useState("");
  const [limit, setLimit] = useState<string>("");

  const fetchC = useServerFn(getCommunityBySlug);
  const create = useServerFn(createCommunityEvent);
  const { data } = useQuery({ queryKey: ["community", slug], queryFn: () => fetchC({ data: { slug } }) });

  const mut = useMutation({
    mutationFn: () => create({ data: {
      club_id: data!.club.id,
      title,
      description: desc || undefined,
      event_type: type,
      starts_at: new Date(startsAt).toISOString(),
      location: location || undefined,
      cover_url: cover || undefined,
      guest_limit: limit ? Number(limit) : undefined,
    } }),
    onSuccess: () => navigate({ to: "/communities/$slug", params: { slug } }),
  });

  return (
    <div className="pb-24">
      <div className="px-4 pt-4">
        <Link to="/communities/$slug" params={{ slug }} className="mono-tag" style={{ color: "var(--color-titanium)" }}>← Back</Link>
        <h1 className="serif mt-2 text-[26px] italic" style={{ color: "var(--color-ink)" }}>New event</h1>
        <p className="mono-tag mt-1" style={{ color: "var(--color-titanium)" }}>in {data?.club.name ?? slug}</p>

        <div className="mt-6 space-y-4">
          <F label="Title">
            <Input value={title} onChange={setTitle} placeholder="Sunday Canyon Run" />
          </F>
          <F label="Event type">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {TYPES.map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className="shrink-0 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider"
                  style={{
                    background: type === t ? "var(--color-neon)" : "var(--color-graphite)",
                    color: type === t ? "var(--color-obsidian)" : "var(--color-ink)",
                    border: "1px solid var(--color-hair)",
                  }}>{t.replace("_"," ")}</button>
              ))}
            </div>
          </F>
          <F label="Starts at">
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }} />
          </F>
          <F label="Location"><Input value={location} onChange={setLocation} placeholder="Angeles Crest Highway, CA" /></F>
          <F label="Cover image URL"><Input value={cover} onChange={setCover} placeholder="https://…" /></F>
          <F label="Guest limit (optional)">
            <input type="number" min={1} value={limit} onChange={(e) => setLimit(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px]"
              style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }} />
          </F>
          <F label="Description">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4}
              className="w-full resize-none rounded-lg px-3 py-2 text-[13px]"
              style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }} />
          </F>

          {mut.error && <p className="text-[12px]" style={{ color: "#ff8080" }}>{(mut.error as Error).message}</p>}

          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !title || !startsAt}
            className="tap w-full rounded-full py-3 text-[12px] font-bold uppercase tracking-wider"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", letterSpacing: "0.14em", opacity: mut.isPending ? 0.5 : 1 }}
          >
            {mut.isPending ? "Creating…" : "Create event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><p className="mono-tag mb-1.5" style={{ color: "var(--color-neon)", fontSize: 10 }}>{label}</p>{children}</div>);
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-[13px]"
      style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }} />
  );
}
