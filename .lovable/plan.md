# Garage & Workshop Discovery, Profiles and Service Booking

## What already exists (reuse, don't rebuild)

- `vendors` — business profiles with slug, type, logo/cover, gallery, portfolio, services showcase, hours, lat/lng, verified/premium flags, reviews and followers. Vendor apply/dashboard/plans screens already live under `/vendor`.
- `services` — per-vendor service catalogue (name, price, duration).
- `bookings` — customer ↔ vendor ↔ service with a status enum and scheduled time.
- `business_reviews`, `subscription_plans` + `subscriptions`, messaging, notifications, payments, the Digital Garage (`vehicles`), maps (Atlas) and the owner Command Center.

So this is an **extension**, not a new system: garages become a first-class flavour of the existing business profile.

## Recommended UX flow

```text
Entry points ──► Find a Garage (full-screen discovery: Map ⇄ List)
  • Bottom nav "+"/menu       │
  • Garage vehicle page       ├─► Garage Preview sheet (photos, rating,
  • Atlas / SOS panel         │    distance, services, next slots)
  • Marketplace + Dashboard   │
                              └─► Full workshop profile /w/:slug
                                     └─► Book flow (bottom sheet, 4 steps)
                                          1 service(s)  2 vehicle + date/time
                                          3 problem notes + photos/quote
                                          4 review & confirm
                                             └─► Booking tracker /bookings/:id
```

Garage side: `/vendor/bookings` inbox (accept / reschedule / quote / status /
work photos / complete) — gated by subscription tier.

## Implementation

### Database (one migration)
- Extend `vendors`: `specialties text[]`, `brands text[]`, `vehicle_types text[]`,
  `emergency_service bool`, `response_time_mins int`, `completed_jobs_count int`,
  `price_from_cents int`, `certifications jsonb`, `team jsonb`, `policies jsonb`,
  `payment_methods text[]`, `booking_enabled bool`, `availability jsonb` (weekly slot rules).
- Extend `bookings`: `vehicle_id`, `service_ids uuid[]`, `problem_text`, `media urls[]`,
  `quote_cents`, `quote_notes`, `quote_status`, `status_history jsonb`,
  `checked_in_at`, `completed_at`, `work_media jsonb`, `currency`.
- New status enum values: `awaiting_garage`, `quotation_sent`, `awaiting_customer`,
  `scheduled`, `checked_in`, `in_progress`, `waiting_parts` (keep existing ones).
- `garage_search` RPC (security definer, distance sort by lat/lng haversine,
  filters, ranking: relevance → distance → rating → verified → featured tier).
- RLS: public read of active garages/services; customer reads/writes own bookings;
  vendor owner + staff manage their own vendor's bookings/services; admins full via
  existing role helpers. GRANTs on every new object.

### Server functions
- `src/lib/garages.functions.ts` — `searchGarages` (public), `getGaragePreview`,
  `getGarageProfile`, `getGarageAvailability`.
- `src/lib/bookings.functions.ts` — `createBooking`, `myBookings`, `getBooking`,
  `cancelBooking`, `respondToQuote`; vendor-side `vendorBookings`,
  `updateBookingStatus`, `sendQuote`, `addWorkMedia` — all verifying vendor ownership
  and the vendor's active subscription tier.
- Plan gating in `src/lib/feature-gate.server.ts` style helper reading
  `subscription_plans.features` JSON (portfolio limits, quotes, analytics,
  featured placement) — nothing hard-coded in the UI.

### Screens
- `/garages` — discovery (map + list toggle, location prompt, filter chips for
  motorcycle/car/brand/tyres/electrical/engine/body/detailing/tuning/emergency,
  search box, sort).
- `/w/$slug` — workshop profile reusing the existing profile shell + business tabs
  (Posts, Portfolio, Services, Reviews, About/Map, Book).
- Booking bottom sheet component (shared by preview, profile and vehicle page).
- `/bookings` and `/bookings/$id` — customer tracker with status timeline.
- `/vendor/bookings` — garage inbox and job board.
- Owner Command Center: plans CRUD (price, features, trial, active) plus garage
  subscription oversight added to the existing businesses module.

### Entry points wired
Menu + bottom nav discovery, "Book a service" on `/garage/$id` vehicle pages and
fleet-health due items, Atlas/SOS "Roadside help", vendor dashboard card.

### Quality bar
Loading/empty/error states everywhere, optimistic status updates, toast feedback,
notifications on every status change, mobile-first layouts matching the existing
titanium/signal design language, and a smoke test covering
discover → preview → book → accept → quote → complete → review.
