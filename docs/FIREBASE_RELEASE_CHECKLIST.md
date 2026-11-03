# OHS Firebase production release checklist

This is an **operator checklist**, not a claim that production Firebase has been verified or updated. GitHub/Vercel deployments do not publish Firestore rules.

## 1. Confirm existing data before changing databases

In an authorized Firebase CLI session, list databases **read-only**:

```bash
npx firebase-tools firestore:databases:list --project secret-space0
```

OHS intentionally uses the *named* Firestore database `default` (no parentheses). Firebase's `(default)` is a different database. Select `default` in the Firebase console and verify the expected `couples` collection and its member documents before publishing rules. Do not migrate or delete anything just to satisfy the app.

## 2. Review and publish the matching rules explicitly

The repo's `firebase.json` targets `"firestore": { "database": "default" }`. Compare currently published rules with `firestore.rules`, preserving any console-only changes. Run `npm run test:rules` on the exact release commit, then explicitly deploy Firestore rules to the named database only after reviewing the difference. This step is independent of Vercel.

This release adds two distinct private document types:
- `accountRooms/{uid}`: only the authenticated account can read/write its own pointer; a write requires proof of membership in that room.
- `couples/{roomCode}/surprises/sun`: only members can read; only the room creator can upload a bounded JPEG data URI.

Existing accounts that lost **both** local storage and the new `accountRooms` pointer must enter their original couple code once. This recovery feature is forward-compatible, **not** a migration of historical accounts.

## 3. Treat Storage as a separate unresolved backend issue

Official Firebase Storage rules documentation currently limits `firestore.get()` and `firestore.exists()` lookups to the `(default)` Firestore database. OHS membership lives in the *named* `default` database. Existing `storage.rules` checks `/databases/(default)/documents/couples/...`, so do not assume those rules authorize member media correctly.

**Do not loosen Storage rules to `request.auth != null`.** Choose and implement one audited solution before claiming media upload reliability:
- a privileged, authenticated backend that checks named-database membership and brokers uploads/downloads; or
- a planned, verified migration to `(default)` with rules, clients, server, data, and access-control tests moved together.

The new small Sun Surprise image deliberately uses member-protected Firestore rather than the incompatible Storage lookup. It does **not** fix other message, memory, or right-now media uploads.

## 4. Private surprise: previous photo is not automatically private

This release removes `public/secret-sun-surprise.jpeg` from the new site. The photo remains retrievable from old deployed builds, version history, caches, or anyone who already saved it. A new private photo should be uploaded by the universe creator through the Sun surprise UI **after** member rules are published. Removing a public asset cannot revoke copies already obtained. The romantic secret word is a visual reveal only; Firestore Auth + membership is the actual authorization.

## 5. Verify Vercel server configuration without exposing secrets

Under the **OHS project** and production target, verify the existence (not values) of `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY`. Configure them directly in the Vercel UI/secure secrets store; do not commit or paste private keys in chat. Also configure and verify a TURN provider if reliable remote calls are required.

Use **Us → Call readiness → Test call server** while signed in; use **Test TURN connectivity** separately. A green Vite build alone does not validate admin credentials, notifications, or TURN relay allocation.

## 6. Two-person acceptance test

Use two dedicated test accounts to check: create code → copy/share → join → reload with cached code → restore from account pointer after localStorage is cleared → open Sun surprise and upload a new private image → ensure outsiders cannot read it → synchronized playback and buffering recovery → camera/microphone and TURN diagnostics → video call across two devices/networks.

The opt-in GitHub workflow `.github/workflows/call-acceptance.yml` requires `OHS_TEST_USER_A_EMAIL`, `OHS_TEST_USER_A_PASSWORD`, `OHS_TEST_USER_B_EMAIL`, `OHS_TEST_USER_B_PASSWORD`, and `OHS_TEST_COUPLE_CODE` to be configured as GitHub Actions secrets.

Avoid sending the production couple code, passwords, private keys, or personal photos in public issue comments or chat.
