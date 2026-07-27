/**
 * Shared UI types. Pure — no data, no assets, safe to import from anywhere
 * without dragging mock-data into a bundle.
 *
 * Kept in sync with the shapes rendered by the feed, reels, stories, and
 * telemetry components; the server-fn layer maps its DB rows onto these.
 */

export type User = {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  verified?: boolean;
  location: string;
};

export type Vehicle = {
  id: string;
  name: string;
  type: "Motorcycle" | "Car";
  year: number;
  hp: number;
  cover: string;
  ownerId: string;
  mods: string[];
};

export type Post = {
  id: string;
  user: User;
  vehicle?: Vehicle;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
  tags: string[];
};

export type EventItem = {
  id: string;
  title: string;
  kind: "Ride" | "Meet" | "Rally" | "Race";
  date: string;
  time: string;
  location: string;
  distance: string;
  attending: number;
  cover: string;
  club: string;
};

export type Listing = {
  id: string;
  title: string;
  price: string;
  condition: "New" | "Used" | "Refurbished";
  image: string;
  location: string;
  seller: User;
  category: "Vehicle" | "Parts" | "Gear";
};

export type Club = {
  id: string;
  name: string;
  members: number;
  city: string;
  cover: string;
  tag: string;
};

export type Chat = {
  id: string;
  user: User;
  lastMessage: string;
  timeAgo: string;
  unread: number;
  online?: boolean;
};

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  icon: "trophy" | "flame" | "bolt" | "route" | "wrench" | "medal";
  earned: boolean;
  rarity: "common" | "rare" | "legendary";
};

export type WorkshopEntry = {
  id: string;
  date: string;
  title: string;
  shop: string;
  mileage: string;
  cost: string;
  status: "done" | "upcoming";
};

export type Reel = {
  id: string;
  user: User;
  vehicle?: Vehicle;
  poster: string;
  caption: string;
  hashtags: string[];
  location?: string;
  music: { title: string; artist: string };
  likes: number;
  comments: number;
  shares: number;
  views: string;
  followed?: boolean;
  duration: number;
  taggedProduct?: { name: string; price: string };
};

export type StoryKind = "photo" | "video" | "poll" | "question" | "ride" | "event";

export type Story = {
  id: string;
  user: User;
  kind: StoryKind;
  cover: string;
  /** Full media URL for video stories (cover stays as poster/thumbnail). */
  mediaUrl?: string;
  seen?: boolean;
  live?: boolean;
  label?: string;
};
