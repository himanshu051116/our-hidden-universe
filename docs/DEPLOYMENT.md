# Deployment Guide (Vercel + Firebase)

## 1) Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill Firebase values.

3. Run locally:

```bash
npm run dev
```

## 2) Firebase Setup

1. Create a Firebase project.
2. Enable `Authentication -> Email/Password`.
3. Create Firestore database in production mode.
4. Enable Storage.
5. Deploy rules:

```bash
firebase deploy --only firestore:rules,storage
```

Use the provided [firebase.rules](/C:/Users/LENOVO/Documents/Codex/2026-05-26/create-a-fully-responsive-modern-romantic/firebase.rules) and [storage.rules](/C:/Users/LENOVO/Documents/Codex/2026-05-26/create-a-fully-responsive-modern-romantic/storage.rules).

## 3) Vercel Setup

1. Push the repository to GitHub.
2. Import project in Vercel.
3. Framework preset: `Vite`.
4. Add all `VITE_...` environment variables in Vercel.
5. Deploy.

The included [vercel.json](/C:/Users/LENOVO/Documents/Codex/2026-05-26/create-a-fully-responsive-modern-romantic/vercel.json) handles client-side routing fallback.

## 4) Security Notes

1. Always enforce HTTPS in production (Vercel does this by default).
2. Keep the couple access code private and rotate it if compromised.
3. Text messages are encrypted client-side using Web Crypto AES-GCM + PBKDF2.
4. Media uploads are protected by Firebase auth/storage rules; add client-side media encryption if you require encrypted-at-rest attachments as well.
