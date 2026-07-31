/**
 * ZOMBIEREX marketing site configuration.
 *
 * EVERYTHING the public website shows is defined here — download links,
 * version, screenshots, stats, FAQs, testimonials, contact details.
 * Update this file (no component code) to change the website.
 */

import postCar from "@/assets/post-car-1.jpg";
import postBike from "@/assets/post-bike-1.jpg";
import eventRide from "@/assets/event-ride.jpg";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";

export const siteConfig = {
  name: "ZOMBIEREX",
  domain: "https://zombierex.com",
  tagline: "Ride. Rev. Resurrect.",
  headline: "The world's automotive social network.",
  subheadline:
    "Cars, motorcycles, drag racing, drifting, car shows, off-road and motorsport — one app for every enthusiast on the planet.",

  /** Download links — update after the app is published to the stores. */
  downloads: {
    /** Set to null to show a "Coming soon" state instead of a live link. */
    android: null as string | null, // e.g. "https://play.google.com/store/apps/details?id=com.zombierex.app"
    ios: null as string | null, // e.g. "https://apps.apple.com/app/zombierex/id000000000"
    apk: null as string | null,
    testflight: null as string | null,
    /** URL encoded into the QR code on the site. */
    qrTarget: "https://zombierex.com/download",
    version: "1.0.0",
    releaseDate: "Coming soon",
    releaseNotes: [
      "Live GPS drag racing with verified timing",
      "AI-powered feed, reels and stories",
      "Marketplace for vehicles, parts and gear",
      "Route Atlas with live maps and group rides",
    ],
  },

  /** Promotional trailer. Leave videoUrl null to show the poster + CTA only. */
  trailer: {
    videoUrl: null as string | null,
    poster: eventRide,
  },

  /** Phone-mockup carousel. Swap the images to update the showcase. */
  screenshots: [
    { src: postBike, caption: "Feed & Stories" },
    { src: postCar, caption: "Reels" },
    { src: eventRide, caption: "Events & Meets" },
    { src: postBike, caption: "Digital Garage" },
    { src: postCar, caption: "Marketplace" },
  ],

  /** Community counters. */
  stats: [
    { label: "Riders & Drivers", value: 128000, suffix: "+" },
    { label: "Posts", value: 940000, suffix: "+" },
    { label: "Reels & Videos", value: 310000, suffix: "+" },
    { label: "Events", value: 12400, suffix: "+" },
    { label: "Clubs & Crews", value: 5200, suffix: "+" },
    { label: "Verified Racers", value: 3100, suffix: "+" },
    { label: "Countries", value: 92, suffix: "" },
  ],

  communities: [
    "Motorcycles", "Cars", "Supercars", "Muscle Cars", "Off-Road", "Drag Racing",
    "Drifting", "Car Shows", "Monster Trucks", "Classic Cars", "Performance Tuning", "Motorsport",
  ],

  features: [
    { icon: "sparkles", title: "AI-Powered Feed", body: "A feed that learns what you build, ride and chase." },
    { icon: "video", title: "Reels & Stories", body: "Vertical short-form video built for engine noise." },
    { icon: "gauge", title: "Live GPS Drag Racing", body: "Verified 0–60, 60ft and quarter-mile timing." },
    { icon: "trophy", title: "Leaderboards", body: "Global and local performance records." },
    { icon: "calendar", title: "Events Calendar", body: "Meets, rallies, track days and car shows." },
    { icon: "scan", title: "AI Judging", body: "Vision-based scoring for show and build competitions." },
    { icon: "award", title: "Trophy Tracking", body: "Every podium, permanently on your profile." },
    { icon: "car", title: "Vehicle Profiles", body: "Full build sheets, mods and service history." },
    { icon: "users", title: "Clubs & Communities", body: "Crews, chapters and local scenes." },
    { icon: "map", title: "Route Planning", body: "Save roads, hotels, fuel stops and viewpoints." },
    { icon: "navigation", title: "Live Maps", body: "Real-time group ride tracking and SOS." },
    { icon: "store", title: "Marketplace", body: "Buy and sell vehicles, parts and gear." },
    { icon: "wrench", title: "Workshops & Dealers", body: "Find trusted shops, tuners and dealers." },
    { icon: "briefcase", title: "Business Pages", body: "Sponsors, performance shops and brands." },
    { icon: "message", title: "Messaging", body: "DMs, group chats and ride coordination." },
    { icon: "bell", title: "Notifications", body: "Never miss a challenge, drop or meet." },
    { icon: "flag", title: "Challenge a Racer", body: "Head-to-head, verified, anywhere." },
    { icon: "shield", title: "Verified Racers", body: "Metallic tiers earned on the strip." },
  ],

  why: [
    { title: "Built only for enthusiasts", body: "No noise. Every feature exists for people who ride and drive." },
    { title: "Modern, intuitive interface", body: "Designed to premium automotive standards, fast on any phone." },
    { title: "Global community", body: "Scenes in 90+ countries, translated and localized." },
    { title: "Fast and secure", body: "Encrypted in transit, strict access controls, active moderation." },
    { title: "Continuous updates", body: "New features shipped constantly, driven by the community." },
    { title: "Professional event ecosystem", body: "From local meets to judged competitions and payouts." },
    { title: "Everything in one app", body: "Social, racing, marketplace, maps and business — unified." },
  ],

  testimonials: [
    { name: "Hussain A.", handle: "@hussain", location: "Manama, Bahrain", rating: 5, avatar: avatar1,
      quote: "Finally an app that understands garage life. The drag timing is scary accurate." },
    { name: "Marco R.", handle: "@marco_rs", location: "Milan, Italy", rating: 5, avatar: avatar2,
      quote: "I found three track days and a buyer for my wheels in the first week." },
    { name: "Layla K.", handle: "@laylabuilds", location: "Dubai, UAE", rating: 5, avatar: avatar3,
      quote: "The reels feed is addictive, and the community is actually respectful." },
  ],

  faqs: [
    { q: "What is ZOMBIEREX?", a: "ZOMBIEREX is an all-in-one social platform for automotive and motorcycle culture — feeds, reels, stories, events, GPS drag racing, route planning, a marketplace and business pages." },
    { q: "Is ZOMBIEREX free?", a: "Yes. Creating an account, posting, following and joining communities is free. Optional premium and business features may be introduced later and will always be clearly priced." },
    { q: "How do I join events?", a: "Open the Events tab, pick a meet, ride, rally or competition and tap Join. Some events are hosted by clubs or businesses and may require approval or a ticket." },
    { q: "Is GPS drag racing accurate?", a: "Runs are recorded with high-frequency GPS sampling and validated automatically. Accuracy depends on your device, satellite lock and conditions — results are for entertainment and community comparison, not official certification." },
    { q: "Can businesses advertise?", a: "Yes. Workshops, dealers, performance shops and sponsors can create business pages, list products and run promoted placements." },
    { q: "Which countries are supported?", a: "ZOMBIEREX is available worldwide wherever the app stores operate. The interface currently ships in English with Arabic support." },
    { q: "How do I become a verified creator?", a: "Build a consistent posting history, then apply from Creator → Apply. Verification reviews authenticity, activity and community standing." },
    { q: "How is my privacy handled?", a: "We collect only what the app needs to work, never sell personal data, and give you export and deletion tools. See the Privacy Policy in the Legal Center." },
  ],

  contact: {
    support: "support@zombierex.com",
    business: "business@zombierex.com",
    legal: "legal@zombierex.com",
    press: "press@zombierex.com",
    location: "Manama, Kingdom of Bahrain",
  },

  social: [
    { label: "Instagram", href: "https://instagram.com/zombierex" },
    { label: "TikTok", href: "https://tiktok.com/@zombierex" },
    { label: "YouTube", href: "https://youtube.com/@zombierex" },
    { label: "X", href: "https://x.com/zombierex" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
