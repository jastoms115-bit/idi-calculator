# IDI — Ijimari Degradation Index

Field-deployable PWA for pump/motor condition monitoring. React + Vite + Firebase.

## What's built

- **Auth (Section 2 of the build prompt), done properly:** sign-up, sign-in, password reset, friendly error messages for every Firebase error code, and — the actual fix for the original bug — routing gated on `onAuthStateChanged` via an `authReady` flag (`src/contexts/AuthContext.jsx`, `src/App.jsx`), so the app never redirects based on a `null` `auth.currentUser` read before Firebase has restored the session.
- **Profile completion flow** with the three tracked booleans (`onboarding_completed`, `profile_completed`, `welcome_voice_played`) kept separate, per spec.
- **Firestore offline persistence** enabled at init (`src/firebase/config.js`) — no hand-built offline queue needed for document writes.
- **IDI scoring engine** (`src/lib/idiEngine.js`) — full implementation of the Framework Spec math: Shewhart control-chart scoring, phase unbalance (NEMA MG-1), one-sided pressure/flow decline scoring, run-hours provisional mapping, and weight renormalization by data availability. Covered by tests in `src/lib/__tests__/idiEngine.test.js`.
- **Firestore & Storage security rules** enforcing the four roles (technician/engineer/supervisor/administrator) at the database level, not just in the UI.
- **Dashboard** wired to a live (offline-capable) Firestore query for asset condition counts.
- Instrument-panel visual system (`src/styles/index.css`) — dark graphite, amber accent, condition-band colors used consistently as data encoding.

## What's built (this round)

- **Asset CRUD** (`src/pages/assets/`) — list with search/status/condition filters, register/edit form (engineer+), and a detail hub showing current score, quick actions, equipment info, photos, and recent readings/maintenance. Delete is intentionally not exposed in the UI — archive/reactivate is the supported path (Section 12), matching `firestore.rules` restricting hard delete to administrators.
- **Readings / assessment form** (`src/pages/assessments/AssessmentForm.jsx`) — live-scores every field change through `src/lib/scoring.js` → `idiEngine.js` as you type, so the technician sees the composite score and breakdown *before* saving. On save it writes the assessment, updates the asset's cached `current_score`/`current_condition_category`, and logs an audit entry.
- **Baselines** (`src/pages/baselines/BaselineForm.jsx`) — computes mean/std per parameter from the last N readings (editable before saving), shows the active baseline and full version history. Baselines are create-only per `firestore.rules`; re-baselining creates a new version rather than mutating the old one.
- **Trends** (`src/pages/assets/AssetTrend.jsx`) — composite-score history as a dependency-free inline SVG chart (`src/components/TrendChart.jsx`) with condition-band reference lines, plus the full reading history below it.
- **Maintenance** (`src/pages/maintenance/`) — list with status filters, create/edit form (engineer+; read-only view for technicians) covering type, priority, status, scheduling, and completion.
- **Photo upload** (`src/components/PhotoUpload.jsx`) — reusable widget wired into assets, assessments, and maintenance, uploading to Cloudinary under a `{collection}/{id}/**` folder convention.
- **Sync Centre** (`src/pages/SyncCentre.jsx`) — online/offline status, per-collection pending-write counts (via `hasPendingWrites` metadata), and a manual sync check using `waitForPendingWrites`.
- **Audit trail** (`src/pages/AuditTrail.jsx`) — supervisor+ only, reads the append-only `auditLog` collection every mutating action now writes to via `src/lib/audit.js`.
- **Learning Centre** (`src/pages/LearningCentre.jsx`) — reference guide that pulls its weights/thresholds directly from `idiEngine.js` constants, so it can't drift out of sync with the actual scoring logic.
- **Bottom tab nav** (`src/components/Nav.jsx`) — Home / Assets / Maintenance / Sync / Learn, with an Audit tab that only renders for supervisor+.

New Firestore composite indexes this requires are declared in `firestore.indexes.json` — deploy alongside the rules:
```
firebase deploy --only firestore:rules,firestore:indexes
```

## What's still stubbed

Reports/export and the admin `systemConfig` editor (weights/thresholds tuning UI) are not built — `idiEngine.js` reads `DEFAULT_WEIGHTS`/`CONDITION_THRESHOLDS` as constants today rather than from `systemConfig`.

## Offline-first architecture — and why it costs nothing

Auth and Firestore run on Firebase's **Spark plan**, which is permanently free — no card required, no monthly fee, no time limit. Photo storage runs on **Cloudinary's** free tier instead of Firebase Storage, since Firebase Storage now requires a linked billing card even to stay within its free quota. There's no separate "app API" to host or pay for: the browser talks directly to Cloud Firestore (Firebase SDK) and Cloudinary (unsigned upload), and `firestore.rules` is the database's authorization layer. No server, no container, nothing to keep running.

**Local storage (device).** `src/firebase/config.js` initializes Firestore with `persistentLocalCache`, mirroring the database into IndexedDB on-device. Reads and writes work identically with zero connectivity — an offline write succeeds immediately from the UI's perspective and just sits queued locally (`snapshot.metadata.hasPendingWrites` drives the "pending" dot seen on asset/maintenance rows). `vite.config.js`'s `VitePWA` plugin precaches the app shell itself (HTML/JS/CSS) too, so the app *opens* offline, not just its data.

**Cloud storage (sync).** The same write that queued locally syncs to Cloud Firestore automatically the moment a connection reappears — nothing to trigger by hand. Cloudinary (photos) has no built-in offline queue, so `src/lib/offlineQueue.js` adds one: a small IndexedDB store holding a photo's bytes locally when offline. `src/lib/photoSync.js` uploads everything queued as soon as `usePhotoQueueSync()` (mounted once in `App.jsx`) sees the browser reconnect, then patches the real Cloudinary URL into the right Firestore doc.

**Hosting.** `firebase.json` + `.firebaserc` configure Firebase Hosting to serve the built app (`npm run build` → `dist/`) as static files over Firebase's global CDN with automatic SSL — also part of Spark, at no cost.

**Staying free.** Spark's daily quotas (50K Firestore reads, 20K writes, 1GB Firestore storage, 10GB Hosting storage, 360MB/day Hosting transfer) comfortably cover a small maintenance team, with no card on file at all. Cloudinary's free tier (25 credits/month, roughly 25GB combined storage+bandwidth) covers photo uploads the same way, also with no card. Nothing in this app requires Cloud Functions or the Blaze plan.

## Setup

1. **Create a Firebase project** at console.firebase.google.com.
2. **Enable Email/Password auth:** Authentication → Sign-in method → Email/Password → Enable.
3. **Create a Firestore database** (production mode).
4. **Create a free Cloudinary account** at cloudinary.com (no card required) for photo storage — see `src/lib/cloudinary.js` for the exact setup steps (copy your cloud name, create an unsigned upload preset). Firebase Storage isn't used by this app, since it now requires a linked billing card even on the free tier.
5. Copy `.env.example` to `.env.local` and fill in your Firebase web app's config (Project Settings → General → Your apps → add a web app if you haven't) plus the two Cloudinary values from step 4. **Double-check every Firebase value belongs to this same project** — a mismatched key is the most common cause of a sign-in that silently does nothing.
6. Put your project id in `.firebaserc` (replacing the placeholder).
7. Install and run:
   ```
   npm install
   npm run dev
   ```
8. Deploy rules, indexes, and Hosting together (requires the Firebase CLI: `npm install -g firebase-tools`, then `firebase login`):
   ```
   npm run build
   firebase deploy
   ```
   Or push just one piece, e.g. after only editing `firestore.rules`:
   ```
   firebase deploy --only firestore:rules
   ```
   (Firebase Hosting/Firestore only — Cloudinary needs no deploy step, uploads go straight from the browser.)
9. Run the engine tests:
   ```
   npm test
   ```

## Verifying auth actually works before building further

1. `npm run dev`, open the app, create a brand-new account. You should land on **Complete Profile**, not a blank screen or spinner.
2. Fill the profile, save, confirm you land on **Dashboard** and hear/see the welcome greeting.
3. Refresh the page. You should stay on Dashboard, not bounce back to Welcome.
4. Sign out, sign back in with the wrong password — confirm a visible error appears and the form is usable again immediately.
5. In DevTools, go offline, refresh — the shell and any previously-loaded assets should still render (PWA cache + Firestore offline cache).

If any of these fail, check the `.env.local` values against Firebase Console first — that's the top cause.
