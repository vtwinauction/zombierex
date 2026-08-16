import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, uploadWithRetry } from "@/lib/media-upload";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit profile · ZOMBIEREX" },
      { name: "description", content: "Update your photo, name, bio and details." },
    ],
  }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveFn = useServerFn(updateMyProfile);

  const q = useQuery({ queryKey: ["profile", "me"], queryFn: () => fetchProfile(), retry: false });

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverImageBroken, setCoverImageBroken] = useState(false);
  const [avatarImageBroken, setAvatarImageBroken] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactDm, setContactDm] = useState(true);
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessAddress, setBusinessAddress] = useState("");

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setUserId(data.user?.id ?? "");
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const p = q.data as any;
    if (!p) return;
    setHandle(p.handle ?? "");
    setDisplayName(p.display_name ?? "");
    setBio(p.bio ?? "");
    setLocation(p.location ?? "");
    setWebsite(p.website ?? "");
    setAvatarUrl(p.avatar_url ?? "");
    setCoverUrl(p.cover_url ?? "");
    setAvatarImageBroken(false);
    setCoverImageBroken(false);
    setContactPhone(p.contact_phone ?? "");
    setContactEmail(p.contact_email ?? "");
    setContactDm(p.contact_dm_enabled !== false);
    setIsBusiness(!!p.is_business);
    setBusinessAddress(p.business_address ?? "");
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const cleanHandle = handle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
      const originalHandle = ((q.data as any)?.handle ?? "").toLowerCase();
      return saveFn({
        data: {
          handle: cleanHandle && cleanHandle !== originalHandle ? cleanHandle : undefined,
          display_name: displayName.trim() || undefined,
          bio,
          location,
          website,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          contact_dm_enabled: contactDm,
          is_business: isBusiness,
          business_address: businessAddress,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/profile" });
    },
    onError: (e: Error) => setError(e.message),
  });

  const pickImage = async (file: File, kind: "avatar" | "cover") => {
    if (!userId) {
      setError("Not signed in");
      return;
    }
    setError(null);
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingCover;
    // Instant local preview so the user sees the pick immediately. HEIC may not
    // render in Chromium, but it is converted to JPEG before upload below.
    const localPreview = URL.createObjectURL(file);
    if (kind === "avatar") {
      setAvatarImageBroken(false);
      setAvatarUrl(localPreview);
    } else {
      setCoverImageBroken(false);
      setCoverUrl(localPreview);
    }
    setBusy(true);
    try {
      const blob = await compressImage(file);
      const bucket = kind === "avatar" ? "avatars" : "vehicles";
      const res = await uploadWithRetry(blob, { userId, bucket });
      if (kind === "avatar") {
        setAvatarImageBroken(false);
        setAvatarUrl(res.url);
      } else {
        setCoverImageBroken(false);
        setCoverUrl(res.url);
      }
    } catch (e) {
      setError(`Upload failed: ${(e as Error).message}`);
      // revert preview on failure
      if (kind === "avatar") setAvatarUrl((q.data as any)?.avatar_url ?? "");
      else setCoverUrl((q.data as any)?.cover_url ?? "");
    } finally {
      URL.revokeObjectURL(localPreview);
      setBusy(false);
    }
  };

  return (
    <div className="pb-24" style={{ background: "var(--color-paper-1)" }}>
      <header className="flex items-center justify-between px-4 pt-4">
        <Link to="/profile" className="mono-tag" style={{ color: "var(--color-ink-3)" }}>
          ← Back
        </Link>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || uploadingAvatar || uploadingCover}
          className="tap rounded-lg px-4 py-2 text-[12px] font-semibold"
          style={{
            background: "var(--color-ink-0)",
            color: "var(--color-paper-0)",
            opacity: save.isPending ? 0.6 : 1,
          }}
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </header>

      <h1 className="serif px-4 pt-3 text-3xl" style={{ color: "var(--color-ink-0)" }}>
        Edit profile
      </h1>

      {/* Cover */}
      <section className="mt-4 px-4">
        <p className="mono-tag mb-2" style={{ color: "var(--color-ink-3)", fontSize: 10 }}>
          COVER PHOTO
        </p>
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            aspectRatio: "16/9",
            border: "1px solid var(--color-line)",
            background: "var(--color-paper-2)",
          }}
        >
          {coverUrl && !coverImageBroken ? (
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setCoverImageBroken(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center mono-tag"
              style={{ color: "var(--color-ink-3)" }}
            >
              {coverUrl ? "CHOOSE PHOTO AGAIN" : "NO COVER"}
            </div>
          )}
          <button
            onClick={() => coverInput.current?.click()}
            className="tap absolute right-2 bottom-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
          >
            {uploadingCover ? "Uploading…" : "Change"}
          </button>
        </div>
        <input
          ref={coverInput}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0], "cover")}
        />
      </section>

      {/* Avatar */}
      <section className="mt-4 px-4">
        <p className="mono-tag mb-2" style={{ color: "var(--color-ink-3)", fontSize: 10 }}>
          PROFILE PHOTO
        </p>
        <div className="flex items-center gap-4">
          <div
            className="h-20 w-20 shrink-0 overflow-hidden rounded-full"
            style={{ border: "2px solid var(--color-line)", background: "var(--color-paper-2)" }}
          >
            {avatarUrl && !avatarImageBroken ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setAvatarImageBroken(true)}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[10px]"
                style={{ color: "var(--color-ink-3)" }}
              >
                NONE
              </div>
            )}
          </div>
          <button
            onClick={() => avatarInput.current?.click()}
            className="tap rounded-lg px-3 py-2 text-[12px] font-semibold"
            style={{
              background: "var(--color-paper-2)",
              color: "var(--color-ink-0)",
              border: "1px solid var(--color-line)",
            }}
          >
            {uploadingAvatar ? "Uploading…" : "Change photo"}
          </button>
        </div>
        <input
          ref={avatarInput}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0], "avatar")}
        />
      </section>

      {/* Fields */}
      <section className="mt-6 space-y-4 px-4">
        <Field label="Display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            className="input"
            placeholder="Your name"
          />
        </Field>
        <Field label="Username" hint="Letters, numbers and underscores">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            maxLength={24}
            className="input"
            placeholder="handle"
          />
        </Field>
        <Field label="Bio" hint={`${bio.length}/500`}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            className="input"
            placeholder="Tell riders about you"
          />
        </Field>
        <Field label="Location">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            className="input"
            placeholder="City, Country"
          />
        </Field>
        <Field label="Website">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={255}
            className="input"
            placeholder="https://"
          />
        </Field>

        <div className="pt-4">
          <p
            className="mono-tag mb-2"
            style={{ color: "var(--color-ink-3)", fontSize: 10, letterSpacing: "0.24em" }}
          >
            CONTACT
          </p>
        </div>
        <Field label="Phone">
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            maxLength={40}
            className="input"
            placeholder="+1 555 000 0000"
            inputMode="tel"
          />
        </Field>
        <Field label="Contact email">
          <input
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            maxLength={255}
            className="input"
            placeholder="you@example.com"
            inputMode="email"
          />
        </Field>
        <label
          className="flex items-center justify-between rounded-lg px-3 py-3"
          style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
        >
          <span className="text-[13px]" style={{ color: "var(--color-ink-0)" }}>
            Allow direct messages
          </span>
          <input
            type="checkbox"
            checked={contactDm}
            onChange={(e) => setContactDm(e.target.checked)}
          />
        </label>

        <div className="pt-4">
          <p
            className="mono-tag mb-2"
            style={{ color: "var(--color-ink-3)", fontSize: 10, letterSpacing: "0.24em" }}
          >
            BUSINESS PROFILE
          </p>
        </div>
        <label
          className="flex items-center justify-between rounded-lg px-3 py-3"
          style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
        >
          <span className="text-[13px]" style={{ color: "var(--color-ink-0)" }}>
            This is a business profile
          </span>
          <input
            type="checkbox"
            checked={isBusiness}
            onChange={(e) => setIsBusiness(e.target.checked)}
          />
        </label>
        {isBusiness && (
          <Field label="Business address">
            <input
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              maxLength={240}
              className="input"
              placeholder="123 Main St, City, Country"
            />
          </Field>
        )}

        {error && (
          <p className="text-[12px]" style={{ color: "#ff6b6b" }}>
            {error}
          </p>
        )}

        <div className="pt-2">
          <Link to="/posts/mine" className="mono-tag" style={{ color: "var(--color-neon)" }}>
            MANAGE MY POSTS →
          </Link>
        </div>
      </section>

      {/* Sticky Save bar */}
      <div
        className="fixed inset-x-0 z-40 px-4 py-3"
        style={{
          bottom: 0,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          background: "var(--color-paper-0)",
          borderTop: "1px solid var(--color-line)",
        }}
      >
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || uploadingAvatar || uploadingCover}
          className="tap w-full rounded-xl py-3 text-[14px] font-bold"
          style={{
            background: "var(--color-neon)",
            color: "#000",
            opacity: save.isPending || uploadingAvatar || uploadingCover ? 0.6 : 1,
          }}
        >
          {save.isPending ? "SAVING…" : "SAVE CHANGES"}
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: var(--color-paper-0);
          color: var(--color-ink-0);
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }
        .input:focus { border-color: var(--color-neon); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-semibold" style={{ color: "var(--color-ink-0)" }}>
          {label}
        </span>
        {hint && (
          <span className="mono-tag" style={{ color: "var(--color-ink-3)", fontSize: 9 }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}
