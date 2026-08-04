import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getBusinessDashboard, updateBusinessShowcase } from "@/lib/business.functions";

export const Route = createFileRoute("/_authenticated/business/showcase")({
  head: () => ({ meta: [{ title: "Edit showcase · ZOMBIEREX" }] }),
  component: EditShowcase,
});

function EditShowcase() {
  const nav = useNavigate();
  const dash = useServerFn(getBusinessDashboard);
  const save = useServerFn(updateBusinessShowcase);
  const q = useQuery({ queryKey: ["business", "dashboard"], queryFn: () => dash() });

  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [gallery, setGallery] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const v = q.data?.vendor as any;
    if (!v) return;
    setWebsite(v.website ?? "");
    setPhone(v.phone ?? "");
    setEmail(v.email ?? "");
    setDescription(v.description ?? "");
    setGallery((v.gallery ?? []).join("\n"));
  }, [q.data]);

  if (q.isLoading)
    return (
      <p className="p-8 mono-tag" style={{ color: "var(--color-silver)" }}>
        Loading…
      </p>
    );
  if (!q.data?.vendor)
    return (
      <p className="p-8" style={{ color: "var(--color-ink)" }}>
        Apply as a vendor first.
      </p>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await save({
        data: {
          website: website || undefined,
          phone: phone || undefined,
          email: email || undefined,
          description: description || undefined,
          gallery: gallery
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      nav({ to: "/business" });
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const fs = {
    background: "var(--color-obsidian)",
    border: "1px solid var(--color-hair)",
    borderRadius: 8,
    color: "var(--color-ink)",
  } as const;

  return (
    <div className="pb-32">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ◆ SHOWCASE
        </p>
        <h1 className="serif mt-2 text-3xl" style={{ color: "var(--color-ink)" }}>
          Contact & gallery
        </h1>
      </header>
      <form onSubmit={submit} className="mt-6 space-y-3 px-5">
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://your-site.com"
          className="w-full px-3 py-2 text-[13px]"
          style={fs}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="w-full px-3 py-2 text-[13px]"
          style={fs}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Business email"
          className="w-full px-3 py-2 text-[13px]"
          style={fs}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="About your business"
          className="w-full px-3 py-2 text-[13px]"
          style={fs}
        />
        <label className="block text-[11px]" style={{ color: "var(--color-silver)" }}>
          Gallery URLs (one per line)
          <textarea
            value={gallery}
            onChange={(e) => setGallery(e.target.value)}
            rows={5}
            className="mt-1 w-full px-3 py-2 text-[13px]"
            style={fs}
          />
        </label>
        {err && (
          <p className="text-[12px]" style={{ color: "#ff8080" }}>
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="tap w-full px-4 py-3 text-[13px]"
          style={{
            background: "var(--color-neon)",
            color: "#000",
            borderRadius: 10,
            fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
