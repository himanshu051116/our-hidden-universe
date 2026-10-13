# OHS Calling — infrastructure and acceptance

## Deployment boundary
Changes remain in draft PR #24. Do not merge or deploy until call and push tests pass. Build success does not prove real networks or notifications.

## Cloudflare TURN or coturn
Create a Cloudflare Realtime TURN key at https://developers.cloudflare.com/realtime/turn/generate-credentials/ .
Set these server-only environment variables in the authoritative Vercel ohs project:
- CLOUDFLARE_TURN_KEY_ID
- CLOUDFLARE_TURN_API_TOKEN (secret)
- Optional CLOUDFLARE_TURN_TTL_SECONDS (default 14400).
Cloudflare is preferred if present. Alternatively keep coturn via TURN_URLS and TURN_SHARED_SECRET. The endpoint always verifies a Firebase ID token and couple membership; Cloudflare's permanent secret never reaches clients. The Firebase Admin server configuration below is necessary for both providers.

## Real background call notifications
Configure the following in Vercel when ready: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY (secret), VITE_FIREBASE_VAPID_KEY (public web push key). Optional PUBLIC_SITE_ORIGIN = https://ohs.vercel.app .
Never commit secrets, paste private keys into chat, or use client-side VITE_ variables for private credentials. VAPID is build-time and requires a new deployment.
Enable Firebase Cloud Messaging API. The Firebase Admin SDK can deliver messages to Firebase Installation IDs (FIDs); browser push messages are data-only and shown by the OHS service worker.
Android native FCM requires Google Services/native integration. iOS native Capacitor APNs tokens are not FCM tokens: OHS marks that path unsupported until an iOS-specific adapter is added. Browser iOS Web Push requires an eligible installed Home Screen PWA.

## Reproducible two-account browser acceptance
Create two dedicated Firebase accounts and join them to a dedicated test couple, without real user data.
Configure GitHub Actions Secrets: OHS_TEST_USER_A_EMAIL, OHS_TEST_USER_A_PASSWORD, OHS_TEST_USER_B_EMAIL, OHS_TEST_USER_B_PASSWORD, OHS_TEST_COUPLE_CODE.
Then choose GitHub Actions > Two-account calling acceptance > Run workflow, selecting the branch. It builds and tests locally on GitHub Actions with fake camera and microphone. It does not deploy Vercel and does not exercise production TURN API endpoints.
These checks require real test credentials. Missing credentials fail the manual job explicitly.

## Must-pass real-device validation before release
1. Audio and video calls in both directions on two authenticated devices.
2. Different Wi-Fi/mobile-data networks; confirm audible remote audio and live remote video.
3. Call Readiness > TURN connectivity gathers a real relay candidate on each target device.
4. Drop one network and reconnect; prove bounded recovery or informative failure.
5. Background the page to test foreground Firestore/browser notification handling.
6. After FCM provisioning, close installed PWA and verify OS notification opens the right call.
7. Validate missed/declined/ended state and stale alert expiry.
8. Check mobile Chrome, iOS installed PWA if targeted, and service-worker updates after release.
TURN credentials issued, FCM registration allowed, and unit tests passing do not themselves prove end-to-end delivery.