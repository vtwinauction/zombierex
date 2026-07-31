/**
 * Public "how to use" guides for every feature shown on the marketing site.
 * Keyed by slug — the slug is derived from the feature title in site.ts.
 */

import guideDrag from "@/assets/guide-drag.jpg";
import guideAtlas from "@/assets/guide-atlas.jpg";
import guideMarket from "@/assets/guide-market.jpg";
import guideProfile from "@/assets/guide-profile.jpg";
import postBike from "@/assets/post-bike-1.jpg";
import postCar from "@/assets/post-car-1.jpg";
import eventRide from "@/assets/event-ride.jpg";
import partCarb from "@/assets/part-carb.jpg";

export type FeatureGuide = {
  slug: string;
  title: string;
  tagline: string;
  image: string;
  imageAlt: string;
  intro: string;
  steps: { title: string; body: string }[];
  tips: string[];
};

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const featureGuides: FeatureGuide[] = [
  {
    slug: "ai-powered-feed",
    title: "AI-Powered Feed",
    tagline: "A feed that learns what you build, ride and chase.",
    image: postBike,
    imageAlt: "ZOMBIEREX home feed showing a motorcycle build post",
    intro:
      "Your home tab mixes posts from riders you follow with builds the app thinks you'll care about. The more you like, save and linger, the sharper it gets.",
    steps: [
      { title: "Open the Feed tab", body: "It's the first icon in the bottom bar. Pull down anywhere to refresh." },
      { title: "React fast", body: "Double-tap a photo to like it, tap the bubble to comment, tap the flag to save it into a collection." },
      { title: "Tune what you see", body: "Use \"Not interested\" from the ••• menu on a post, and follow riders and hashtags you want more of." },
      { title: "Post your own", body: "Tap + in the bottom bar, pick photos or video, add filters, music, tags and a caption, then publish." },
    ],
    tips: ["Complete your garage first — the feed weights posts from similar vehicles.", "Saved posts live under Saved, organised into collections."],
  },
  {
    slug: "reels-and-stories",
    title: "Reels & Stories",
    tagline: "Vertical short-form video built for engine noise.",
    image: postCar,
    imageAlt: "ZOMBIEREX reels screen with a full-screen vertical clip",
    intro:
      "Reels is full-screen vertical video. Stories sit at the top of the feed and disappear after 24 hours.",
    steps: [
      { title: "Swipe through Reels", body: "Swipe up for the next clip. Video autoplays muted — tap once to unmute." },
      { title: "Use the side rail", body: "Like, comment, save, share or follow the creator without leaving the video." },
      { title: "Record a Reel", body: "Tap + → Video, trim your clip, add a track from the music library and publish." },
      { title: "Post a Story", body: "Tap your avatar in the stories rail, capture or upload, then add text and stickers." },
    ],
    tips: ["Vertical 9:16 footage fills the screen best.", "Reels with a track from the library get pushed harder in discovery."],
  },
  {
    slug: "live-gps-drag-racing",
    title: "Live GPS Drag Racing",
    tagline: "Verified 0–60, 60ft and quarter-mile timing.",
    image: guideDrag,
    imageAlt: "ZOMBIEREX drag racing timing screen with christmas tree lights",
    intro:
      "The drag module records high-frequency GPS while you launch, then validates the run and posts a verified time card.",
    steps: [
      { title: "Open Drag → New run", body: "Pick the mode: 0–60, 60ft, 1/8 or 1/4 mile." },
      { title: "Wait for GPS lock", body: "The HUD turns green when satellite accuracy is good enough to certify a run." },
      { title: "Stage and launch", body: "Come to a complete stop, watch the christmas tree, then go. Timing starts automatically on movement." },
      { title: "Save the run", body: "Review the time card, add your vehicle, then publish it to your profile and the leaderboards." },
    ],
    tips: ["Always run on a closed road, private land or a track.", "Rolling starts are rejected by the validator."],
  },
  {
    slug: "leaderboards",
    title: "Leaderboards",
    tagline: "Global and local performance records.",
    image: guideDrag,
    imageAlt: "ZOMBIEREX leaderboard of verified drag times",
    intro: "Every verified run feeds ranked boards you can filter down to your city, your class or your exact model.",
    steps: [
      { title: "Open Drag → Leaderboards", body: "Default view is global, all vehicles, this month." },
      { title: "Filter it down", body: "Switch between bike and car, class, country or city to find the board you actually compete in." },
      { title: "Compare a run", body: "Tap any entry to see the full time card, splits and the vehicle spec behind it." },
      { title: "Beat it", body: "Tap Challenge on a rider to send a head-to-head request." },
    ],
    tips: ["Only validated runs are ranked.", "Boards reset monthly, but all-time records are kept on your profile."],
  },
  {
    slug: "events-calendar",
    title: "Events Calendar",
    tagline: "Meets, rallies, track days and car shows.",
    image: eventRide,
    imageAlt: "ZOMBIEREX events screen showing a group ride",
    intro: "Find what's happening near you, RSVP or buy a ticket, and see who else is going before you commit.",
    steps: [
      { title: "Open the Events tab", body: "Browse by date, distance from you, or type: meet, ride, track day, show." },
      { title: "Open an event", body: "Read the details, route, rules and the attendee list." },
      { title: "RSVP or buy a ticket", body: "Free events use RSVP; ticketed events check out in-app with your cart." },
      { title: "Host your own", body: "Tap Create event, set the location, time, capacity and whether it needs approval." },
    ],
    tips: ["Turn on event notifications so you get a reminder the day before.", "Business pages can publish recurring events."],
  },
  {
    slug: "ai-judging",
    title: "AI Judging",
    tagline: "Vision-based scoring for show and build competitions.",
    image: postCar,
    imageAlt: "ZOMBIEREX AI judge report card for a build",
    intro: "Submit photos and video of a build and the judge scores paint, fitment, welds, detail and presentation, then returns a report card.",
    steps: [
      { title: "Open Judge → Enter", body: "Pick an open competition or run a private practice score." },
      { title: "Upload the set", body: "Follow the shot list: front, rear, both sides, engine bay and detail close-ups." },
      { title: "Add the build sheet", body: "Mods, parts and work done — the judge weights declared work against what it sees." },
      { title: "Read the report card", body: "Category scores, comments and where you lost points, so the next build scores higher." },
    ],
    tips: ["Clean, even daylight scores better than harsh flash.", "Blurry or cropped shots are rejected before scoring."],
  },
  {
    slug: "trophy-tracking",
    title: "Trophy Tracking",
    tagline: "Every podium, permanently on your profile.",
    image: guideProfile,
    imageAlt: "ZOMBIEREX profile showing trophies and achievements",
    intro: "Wins from judged events, drag boards and community challenges are pinned to your profile as a permanent record.",
    steps: [
      { title: "Compete", body: "Enter a judged event, a drag board or a community challenge." },
      { title: "Get the result", body: "Placements are awarded automatically when an event closes." },
      { title: "View your case", body: "Profile → Trophies shows every podium, medal and achievement with its date." },
      { title: "Pin your best", body: "Choose up to three trophies to show at the top of your profile." },
    ],
    tips: ["Trophies are tied to the vehicle you entered, so your garage keeps its own history."],
  },
  {
    slug: "vehicle-profiles",
    title: "Vehicle Profiles",
    tagline: "Full build sheets, mods and service history.",
    image: guideProfile,
    imageAlt: "ZOMBIEREX digital garage with multiple vehicles",
    intro: "Your garage holds every bike and car you own, each with its own gallery, spec sheet, mod list and service log.",
    steps: [
      { title: "Open Profile → Garage", body: "Tap Add vehicle and pick the brand, model and year from the catalogue." },
      { title: "Fill the spec sheet", body: "Engine, power, weight, colour and the story behind the build." },
      { title: "Log mods and service", body: "Every part, install date and workshop stays on the timeline." },
      { title: "Tag posts to it", body: "Tag a vehicle when you post so its gallery builds itself over time." },
    ],
    tips: ["A complete garage gets noticeably more follows and marketplace trust."],
  },
  {
    slug: "clubs-and-communities",
    title: "Clubs & Communities",
    tagline: "Crews, chapters and local scenes.",
    image: eventRide,
    imageAlt: "ZOMBIEREX community page with members and posts",
    intro: "Communities are topic or region based groups with their own feed, challenges, events and rules.",
    steps: [
      { title: "Open Communities", body: "Browse by region, brand or discipline, or search for a club by name." },
      { title: "Join", body: "Open groups join instantly; private clubs send a request to the admins." },
      { title: "Take part", body: "Post inside the community feed, enter challenges and RSVP to member-only events." },
      { title: "Start your own", body: "Tap Create, set the name, rules, cover and whether it's open or invite-only." },
    ],
    tips: ["Admins can pin rules and promote moderators from the community settings."],
  },
  {
    slug: "route-planning",
    title: "Route Planning",
    tagline: "Save roads, hotels, fuel stops and viewpoints.",
    image: guideAtlas,
    imageAlt: "ZOMBIEREX route atlas map with hotel, fuel and food pins",
    intro: "Atlas is the route hub: record a ride, drop points of interest along it, then share it so others can run the same trip.",
    steps: [
      { title: "Open Atlas", body: "The map centres on your location as soon as GPS locks." },
      { title: "Record or plan", body: "Hit Record to capture a ride live, or drop waypoints to plan one before you leave." },
      { title: "Save points of interest", body: "Add hotels, fuel stops, restaurants and viewpoints so the route is actually usable." },
      { title: "Publish and share", body: "Publish the route or export it as GPX — anyone can import it for their next trip." },
    ],
    tips: ["Routes you save appear under Atlas → Mine.", "Imported GPX files navigate turn by turn."],
  },
  {
    slug: "live-maps",
    title: "Live Maps",
    tagline: "Real-time group ride tracking and SOS.",
    image: guideAtlas,
    imageAlt: "ZOMBIEREX live group ride map with rider positions",
    intro: "Start a group ride and everyone appears live on one map — plus an SOS button that sends your location to trusted contacts.",
    steps: [
      { title: "Open Atlas → Group ride", body: "Create a ride and share the invite link with your crew." },
      { title: "Watch the pack", body: "Every rider shows on the map with speed and distance from the leader." },
      { title: "Set trusted contacts", body: "Settings → Safety lets you choose who receives an SOS alert." },
      { title: "Trigger SOS", body: "Hold the SOS button; your live location is sent immediately with a map link." },
    ],
    tips: ["Cockpit HUD mode turns your phone landscape into a big, glanceable dash."],
  },
  {
    slug: "marketplace",
    title: "Marketplace",
    tagline: "Buy and sell vehicles, parts and gear.",
    image: guideMarket,
    imageAlt: "ZOMBIEREX marketplace listings for bikes and parts",
    intro: "A dedicated marketplace for bikes, cars, parts and gear — with filters that actually understand vehicles.",
    steps: [
      { title: "Search or filter", body: "Filter by brand, model, year, condition, price, currency and distance from you." },
      { title: "Check the seller", body: "Open the seller page for ratings, history and verified badges before you message." },
      { title: "Buy in app", body: "Add to cart and check out, or message the seller to arrange a local deal." },
      { title: "List your own", body: "Tap Sell, add photos, pick the category from the catalogue and set your price and currency." },
    ],
    tips: ["Listings with six or more photos sell far faster.", "Saved searches notify you when something matching drops."],
  },
  {
    slug: "workshops-and-dealers",
    title: "Workshops & Dealers",
    tagline: "Find trusted shops, tuners and dealers.",
    image: partCarb,
    imageAlt: "ZOMBIEREX workshop page with parts and services",
    intro: "Verified shops, tuners and dealers have their own pages with services, inventory, contact details and reviews.",
    steps: [
      { title: "Search by service", body: "Dyno tuning, paint, welding, tyres, ECU work — filter by what you actually need." },
      { title: "Read the page", body: "Opening hours, location, gallery, price guides and community reviews." },
      { title: "Get in touch", body: "Call, email, DM or open directions straight from the contact block." },
      { title: "Leave a review", body: "Rate the work after your visit so the next rider gets a better signal." },
    ],
    tips: ["Look for the verified badge — it means the business identity was checked."],
  },
  {
    slug: "business-pages",
    title: "Business Pages",
    tagline: "Sponsors, performance shops and brands.",
    image: partCarb,
    imageAlt: "ZOMBIEREX business page with contact details and inventory",
    intro: "Businesses get a page built for selling: inventory, contact channels, events and promoted placement.",
    steps: [
      { title: "Apply", body: "Menu → Vendor → Apply. Submit your business details for verification." },
      { title: "Build the page", body: "Logo, cover, description, phone, email, location and opening hours." },
      { title: "List inventory", body: "Publish products and services straight into the marketplace from your dashboard." },
      { title: "Promote", body: "Run promoted placements and track reach, clicks and orders in the dashboard." },
    ],
    tips: ["Complete contact details rank higher in local search."],
  },
  {
    slug: "messaging",
    title: "Messaging",
    tagline: "DMs, group chats and ride coordination.",
    image: postBike,
    imageAlt: "ZOMBIEREX direct messages screen",
    intro: "Direct messages with riders, sellers and shops — plus group chats for planning rides.",
    steps: [
      { title: "Open Messages", body: "The inbox splits into people you follow and requests from everyone else." },
      { title: "Start a chat", body: "Message from any profile, listing or event page." },
      { title: "Make a group", body: "Add riders to one thread to plan a meet, share a route or split costs." },
      { title: "Stay safe", body: "Report, mute or block from the thread menu. Blocking is instant and silent." },
    ],
    tips: ["Privacy settings control who can message you at all."],
  },
  {
    slug: "notifications",
    title: "Notifications",
    tagline: "Never miss a challenge, drop or meet.",
    image: guideProfile,
    imageAlt: "ZOMBIEREX notification settings screen",
    intro: "Fine-grained control over what pings you — likes, comments, follows, orders, challenges and ride alerts.",
    steps: [
      { title: "Open Settings → Notifications", body: "Push and email are separate switches." },
      { title: "Pick per activity", body: "Turn on only what matters: challenges and orders, or everything." },
      { title: "Allow system permission", body: "On first run, accept the OS prompt or enable it later in phone settings." },
      { title: "Check the tab", body: "The bell tab keeps every notification even if push is off." },
    ],
    tips: ["Order and payout notifications are worth leaving on if you sell."],
  },
  {
    slug: "challenge-a-racer",
    title: "Challenge a Racer",
    tagline: "Head-to-head, verified, anywhere.",
    image: guideDrag,
    imageAlt: "ZOMBIEREX head-to-head challenge screen",
    intro: "Send a head-to-head challenge to any rider. Both runs are GPS-verified, wherever each of you is.",
    steps: [
      { title: "Pick an opponent", body: "Tap Challenge on a profile, a leaderboard entry or a time card." },
      { title: "Set the terms", body: "Choose the discipline, class and how long they have to answer." },
      { title: "Run it", body: "Each rider records a verified run in their own time and place." },
      { title: "See the result", body: "The app compares validated times and posts the winner to both profiles." },
    ],
    tips: ["Unanswered challenges expire automatically — nobody loses by default."],
  },
  {
    slug: "verified-racers",
    title: "Verified Racers",
    tagline: "Metallic tiers earned on the strip.",
    image: guideProfile,
    imageAlt: "ZOMBIEREX profile with a metallic verified rider badge",
    intro: "Rider badges are earned, not bought. Tiers rise with verified runs, wins and clean community standing.",
    steps: [
      { title: "Record verified runs", body: "Only validated GPS runs count toward a tier." },
      { title: "Win and place", body: "Podiums on boards, judged events and challenges add weight." },
      { title: "Keep it clean", body: "Moderation strikes pause progression, so ride and post within the rules." },
      { title: "Wear it", body: "Your tier shows next to your name across the feed, marketplace and leaderboards." },
    ],
    tips: ["Tiers can move down as well as up if activity stops."],
  },
];

export const featureGuideBySlug = Object.fromEntries(
  featureGuides.map((g) => [g.slug, g]),
) as Record<string, FeatureGuide>;
