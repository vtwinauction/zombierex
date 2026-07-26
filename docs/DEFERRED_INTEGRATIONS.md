# Deferred integrations — require external accounts / credentials

These are blocked on **external** provisioning, not implementation time. Give
me the credential and I'll ship the wiring.

## 1. In-App Purchase (Apple / Google)
- **Blocker:** RevenueCat account + App Store Connect subscription products +
  Play Console subscriptions.
- **Why:** Apple Guideline 3.1.1 requires StoreKit for digital-goods
  subscriptions inside iOS apps. Stripe/Paddle can stay for the web version.
- **Deliverable when unblocked:** Capacitor `revenuecat` plugin, entitlement
  sync into `premium_memberships`, receipt webhook route at
  `/api/public/webhooks/revenuecat`.

## 2. Live streaming
- **Blocker:** Mux (recommended) or Agora account + streaming key.
- **Deliverable when unblocked:** `/live/create` route, HLS player component,
  RTMP ingest URL generation, tip integration, moderator controls.

## 3. Marketplace payments / escrow + Creator payouts
- **Blocker:** Stripe Connect Express onboarding (KYC per seller/creator).
- **Deliverable when unblocked:** Connect onboarding link generator, payment
  intent + destination charge for listings, payout dashboard, 1099 export.

## 4. Universal links / App Links final wiring
- Static association files are now published at
  `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`.
- **Blocker:** Real Apple Team ID + Android app signing SHA-256 fingerprint —
  currently placeholders (`TEAMID.com.zombierex.app`,
  `REPLACE_WITH_YOUR_APP_SIGNING_KEY_SHA256_FINGERPRINT`).
- **Deliverable when unblocked:** replace both tokens, add
  `associatedDomains` to `ios/App/App.entitlements`, add intent-filter to
  `android/app/src/main/AndroidManifest.xml`.

## 5. Background location for group rides
- **Blocker:** Apple requires justified Info.plist strings + App Review
  approval for background location.
- **Deliverable when unblocked:** `@capacitor-community/background-geolocation`
  plugin, opt-in toggle in Ride settings, per-ride start/stop lifecycle.
