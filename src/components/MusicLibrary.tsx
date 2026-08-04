/**
 * MusicLibrary — full-screen picker with browse, filter, preview & trim.
 *
 * Emits a SelectedTrack (id, url, startAt, volume) back to the composer.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MUSIC_CATEGORIES,
  MUSIC_LIBRARY,
  MUSIC_MOODS,
  formatDuration,
  type MusicCategory,
  type MusicMood,
  type MusicTrack,
} from "@/lib/music-library";

export type SelectedTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  startAt: number; // seconds
  volume: number; // 0..1
};

type Props = {
  open: boolean;
  initial?: SelectedTrack | null;
  onClose: () => void;
  onConfirm: (t: SelectedTrack | null) => void;
};

export function MusicLibrary({ open, initial, onClose, onConfirm }: Props) {
  const [category, setCategory] = useState<MusicCategory | "all">("all");
  const [mood, setMood] = useState<MusicMood | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [startAt, setStartAt] = useState<number>(initial?.startAt ?? 0);
  const [volume, setVolume] = useState<number>(initial?.volume ?? 0.8);
  const audioRef = useRef<HTMLAudioElement>(null);

  const filtered = useMemo(() => {
    return MUSIC_LIBRARY.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (mood !== "all" && t.mood !== mood) return false;
      if (query && !`${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [category, mood, query]);

  const selected = useMemo(
    () => MUSIC_LIBRARY.find((t) => t.id === selectedId) ?? null,
    [selectedId],
  );

  // Load new track on select
  useEffect(() => {
    if (!selected || !audioRef.current) return;
    audioRef.current.src = selected.url;
    audioRef.current.currentTime = startAt;
    audioRef.current.volume = volume;
    audioRef.current.play().catch(() => {
      /* autoplay blocked */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  if (!open) return null;

  const confirm = () => {
    if (!selected) {
      onConfirm(null);
      return;
    }
    onConfirm({
      id: selected.id,
      title: selected.title,
      artist: selected.artist,
      url: selected.url,
      startAt,
      volume,
    });
    audioRef.current?.pause();
  };

  const close = () => {
    audioRef.current?.pause();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: "var(--color-obsidian, #0a0a0b)" }}
    >
      <audio ref={audioRef} preload="none" />

      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(10,10,11,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-hair)",
        }}
      >
        <button
          onClick={close}
          className="mono-tag tap px-2 py-1"
          style={{ color: "var(--color-titanium)" }}
        >
          ← Close
        </button>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
          ♪ MUSIC LIBRARY
        </p>
        <button
          onClick={confirm}
          disabled={!selected}
          className="mono-tag tap px-3 py-1 rounded-full"
          style={{
            background: selected ? "var(--color-neon)" : "transparent",
            color: selected ? "var(--color-obsidian)" : "var(--color-silver)",
            border: selected ? "none" : "1px solid var(--color-hair-strong)",
            opacity: selected ? 1 : 0.6,
          }}
        >
          Use
        </button>
      </header>

      {/* Search + filters */}
      <div className="px-4 pt-3 space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks or artists…"
          className="w-full rounded-lg px-3 py-2 text-[13px]"
          style={{
            background: "var(--color-graphite)",
            color: "var(--color-ink)",
            border: "1px solid var(--color-hair)",
          }}
        />
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {MUSIC_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id as MusicCategory | "all")}
            >
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          <Chip active={mood === "all"} onClick={() => setMood("all")}>
            Any mood
          </Chip>
          {MUSIC_MOODS.map((m) => (
            <Chip key={m.id} active={mood === m.id} onClick={() => setMood(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-40">
        {filtered.length === 0 ? (
          <p className="mono-tag pt-8 text-center" style={{ color: "var(--color-silver)" }}>
            No tracks match — clear a filter.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((t) => (
              <TrackRow
                key={t.id}
                t={t}
                active={t.id === selectedId}
                onSelect={() => {
                  setSelectedId(t.id);
                  setStartAt(0);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Bottom tray */}
      {selected && (
        <div
          className="fixed inset-x-0 bottom-0 px-4 pt-3 pb-5 space-y-3"
          style={{
            background: "rgba(10,10,11,0.96)",
            backdropFilter: "blur(14px)",
            borderTop: "1px solid var(--color-hair)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 shrink-0 rounded-md"
              style={{
                background: selected.coverGradient,
                border: "1px solid var(--color-hair-strong)",
              }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[13px] font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                {selected.title}
              </p>
              <p className="mono-tag truncate" style={{ color: "var(--color-silver)" }}>
                {selected.artist} · {selected.bpm} BPM · {formatDuration(selected.duration)}
              </p>
            </div>
            <button
              onClick={() => {
                if (!audioRef.current) return;
                if (audioRef.current.paused) audioRef.current.play().catch(() => {});
                else audioRef.current.pause();
              }}
              className="tap grid h-10 w-10 place-items-center rounded-full"
              style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}
              aria-label="Play/pause preview"
            >
              ▶
            </button>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
                Start at
              </span>
              <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                {formatDuration(startAt)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, selected.duration - 5)}
              step={1}
              value={startAt}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStartAt(v);
                if (audioRef.current) audioRef.current.currentTime = v;
              }}
              className="w-full accent-[var(--color-neon)]"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>
                Volume
              </span>
              <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-[var(--color-neon)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TrackRow({
  t,
  active,
  onSelect,
}: {
  t: MusicTrack;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className="tap flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left"
        style={{
          background: active ? "rgba(198,255,61,0.08)" : "transparent",
          border: active ? "1px solid var(--color-neon)" : "1px solid transparent",
        }}
      >
        <div
          className="h-11 w-11 shrink-0 rounded-md"
          style={{ background: t.coverGradient, border: "1px solid var(--color-hair-strong)" }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>
            {t.title}
          </p>
          <p className="mono-tag truncate" style={{ color: "var(--color-silver)" }}>
            {t.artist} · {t.bpm} BPM
          </p>
        </div>
        <span
          className="mono-tag"
          style={{ color: active ? "var(--color-neon)" : "var(--color-titanium)" }}
        >
          {formatDuration(t.duration)}
        </span>
      </button>
    </li>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mono-tag tap shrink-0 px-3 py-1.5 rounded-full"
      style={{
        color: active ? "var(--color-obsidian)" : "var(--color-ink)",
        background: active ? "var(--color-neon)" : "transparent",
        border: "1px solid var(--color-hair-strong)",
      }}
    >
      {children}
    </button>
  );
}
