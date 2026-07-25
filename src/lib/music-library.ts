/**
 * Music library — curated royalty-free tracks for the composer.
 *
 * URLs point to SoundHelix's public demo MP3s (CC0-style, widely used for
 * demos). Swap for a licensed catalogue by replacing the `url` fields.
 */
export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  bpm: number;
  mood: MusicMood;
  category: MusicCategory;
  url: string;
  coverGradient: string;
};

export type MusicMood = "hype" | "dark" | "chill" | "epic" | "retro" | "aggressive";
export type MusicCategory = "garage" | "drift" | "night" | "cruise" | "track" | "cinematic";

export const MUSIC_MOODS: { id: MusicMood; label: string }[] = [
  { id: "hype", label: "Hype" },
  { id: "dark", label: "Dark" },
  { id: "aggressive", label: "Aggressive" },
  { id: "epic", label: "Epic" },
  { id: "retro", label: "Retro" },
  { id: "chill", label: "Chill" },
];

export const MUSIC_CATEGORIES: { id: MusicCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "garage", label: "Garage" },
  { id: "drift", label: "Drift" },
  { id: "night", label: "Night ride" },
  { id: "cruise", label: "Cruise" },
  { id: "track", label: "Track day" },
  { id: "cinematic", label: "Cinematic" },
];

const SH = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

export const MUSIC_LIBRARY: MusicTrack[] = [
  { id: "t01", title: "Nitro Bloom",       artist: "REX/Audio",   duration: 372, bpm: 128, mood: "hype",       category: "drift",     url: SH(1),  coverGradient: "linear-gradient(135deg,#0f0f10,#1a2a10 45%,#c6ff3d)" },
  { id: "t02", title: "Chrome Dust",       artist: "REX/Audio",   duration: 407, bpm: 96,  mood: "chill",      category: "cruise",    url: SH(2),  coverGradient: "linear-gradient(135deg,#0a1220,#123045 55%,#7dd3fc)" },
  { id: "t03", title: "Redline Sermon",    artist: "Vault Bones", duration: 385, bpm: 140, mood: "aggressive", category: "track",     url: SH(3),  coverGradient: "linear-gradient(135deg,#1a0505,#3a0d0d 55%,#ff5a5a)" },
  { id: "t04", title: "Fossil Circuit",    artist: "Bone Wave",   duration: 355, bpm: 118, mood: "dark",       category: "garage",    url: SH(4),  coverGradient: "linear-gradient(135deg,#0a0a0b,#1c1c1e 55%,#8a8f98)" },
  { id: "t05", title: "Neon Boulevard",    artist: "Titanium 88", duration: 419, bpm: 108, mood: "retro",      category: "night",     url: SH(5),  coverGradient: "linear-gradient(135deg,#160b2c,#38146b 55%,#ff4bd8)" },
  { id: "t06", title: "Apex Reptile",      artist: "REX/Audio",   duration: 361, bpm: 132, mood: "hype",       category: "track",     url: SH(6),  coverGradient: "linear-gradient(135deg,#0f0f10,#0f2a10 55%,#b6ff3d)" },
  { id: "t07", title: "Chain Rain",        artist: "Vault Bones", duration: 415, bpm: 92,  mood: "chill",      category: "night",     url: SH(7),  coverGradient: "linear-gradient(135deg,#0b0f14,#101a24 55%,#4fc3ff)" },
  { id: "t08", title: "Kevlar Sunset",     artist: "Titanium 88", duration: 388, bpm: 100, mood: "epic",       category: "cinematic", url: SH(8),  coverGradient: "linear-gradient(135deg,#1a0f00,#3a1e00 55%,#ffb800)" },
  { id: "t09", title: "Oil Cathedral",     artist: "Bone Wave",   duration: 400, bpm: 84,  mood: "dark",       category: "cinematic", url: SH(9),  coverGradient: "linear-gradient(135deg,#0a0a0b,#151719 55%,#c0c4cc)" },
  { id: "t10", title: "Torque Poet",       artist: "REX/Audio",   duration: 366, bpm: 124, mono: false as never, bpm2: 0 as never, mood: "hype", category: "garage", url: SH(10), coverGradient: "linear-gradient(135deg,#0f0f10,#212423 55%,#c6ff3d)" } as unknown as MusicTrack,
  { id: "t11", title: "Two-Stroke Ghost",  artist: "Vault Bones", duration: 397, bpm: 138, mood: "aggressive", category: "drift",     url: SH(11), coverGradient: "linear-gradient(135deg,#150606,#361010 55%,#ff8a3d)" },
  { id: "t12", title: "Manifold Dream",    artist: "Titanium 88", duration: 372, bpm: 104, mood: "retro",      category: "cruise",    url: SH(12), coverGradient: "linear-gradient(135deg,#0a0f1a,#1a2144 55%,#8ab4ff)" },
  { id: "t13", title: "Piston Prayer",     artist: "Bone Wave",   duration: 410, bpm: 88,  mood: "epic",       category: "cinematic", url: SH(13), coverGradient: "linear-gradient(135deg,#160b00,#3a1e00 55%,#ffd166)" },
  { id: "t14", title: "Alloy Rain",        artist: "REX/Audio",   duration: 375, bpm: 116, mood: "chill",      category: "night",     url: SH(14), coverGradient: "linear-gradient(135deg,#050a12,#0f2130 55%,#7dd3fc)" },
  { id: "t15", title: "Bone Turbine",      artist: "Vault Bones", duration: 380, bpm: 144, mood: "aggressive", category: "track",     url: SH(15), coverGradient: "linear-gradient(135deg,#0f0f10,#241010 55%,#ff2d2d)" },
  { id: "t16", title: "Static Boulevard",  artist: "Titanium 88", duration: 393, bpm: 112, mood: "retro",      category: "night",     url: SH(16), coverGradient: "linear-gradient(135deg,#160b2c,#2a1050 55%,#c084fc)" },
];

export function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
