# Our Hidden Universe

`Our Hidden Universe` is a fully responsive cinematic romantic web app for long-distance couples, built with React + Vite + Tailwind + Framer Motion and Firebase-ready secure services.

## Features

- Dark romantic visual system (black, deep purple, rose gold, soft pink)
- Glassmorphism UI with smooth transitions and floating star particles
- Cinematic landing page with typewriter hero message and ambient music toggle
- Secure login (email/password + couple secret access code)
- Protected routes with session persistence
- Private chat with:
  - real-time message subscriptions (Firebase)
  - client-side encrypted text messages (AES-GCM/PBKDF2)
  - seen status
  - typing indicator
  - voice note support
  - image sharing
  - self-destruct timer
  - custom emoji + quick reaction (`Miss You ❤️`)
- Memory timeline with addable milestones and polaroid style cards
- Open-When emotional vault section
- Hidden `/birthday-surprise` route with confetti, fireworks pulse, balloons, animated cake, countdown, letter typing animation
- Easter eggs:
  - click stars for hidden notes
  - keyboard shortcuts (`LOVE`, `MOON`, `Ctrl+Shift+H`)
  - dynamic theme shift
- Extras:
  - shared playlist
  - next-meeting countdown
  - dream board
  - couple bucket list
  - daily quote generator
  - relationship stats

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS
- Framer Motion
- Firebase Auth + Firestore + Storage
- Vercel deployment config

## Project Structure

```text
our-hidden-universe/
  docs/
    DEPLOYMENT.md
    FIREBASE_SCHEMA.md
  src/
    components/
      AmbientMusicToggle.jsx
      ChatPanel.jsx
      ExtrasPanel.jsx
      FloatingHeart.jsx
      GlowButton.jsx
      OpenWhenPanel.jsx
      PageShell.jsx
      ProtectedRoute.jsx
      SectionTitle.jsx
      StarField.jsx
      TimelinePanel.jsx
      Typewriter.jsx
    context/
      AuthContext.jsx
    data/
      demoData.js
    hooks/
      useEasterEggs.js
    pages/
      BirthdaySurprise.jsx
      Landing.jsx
      Login.jsx
      Universe.jsx
    services/
      chatService.js
      encryption.js
      firebase.js
    styles/
      index.css
    utils/
      date.js
    App.jsx
    main.jsx
  .env.example
  firebase.rules
  storage.rules
  tailwind.config.js
  postcss.config.js
  vercel.json
  vite.config.js
  package.json
```

## Environment Variables

Use `.env.example`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_COUPLE_ACCESS_CODE=
VITE_BIRTHDAY_DATE=
```

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Firebase Notes

1. Enable Email/Password auth.
2. Deploy [firebase.rules](/C:/Users/LENOVO/Documents/Codex/2026-05-26/create-a-fully-responsive-modern-romantic/firebase.rules) and [storage.rules](/C:/Users/LENOVO/Documents/Codex/2026-05-26/create-a-fully-responsive-modern-romantic/storage.rules).
3. For production, keep Firebase config in Vercel environment variables.

## Security Summary

- HTTPS: provided by Vercel
- Auth guards: React protected routes + Firebase auth checks
- Access control: couple access code + Firestore/Storage rules
- E2E encrypted text chat: Web Crypto (`AES-GCM` + `PBKDF2-SHA256`)
- Secure media handling: authenticated Storage paths and rules

## Deployment

See [docs/DEPLOYMENT.md](/C:/Users/LENOVO/Documents/Codex/2026-05-26/create-a-fully-responsive-modern-romantic/docs/DEPLOYMENT.md) for complete deployment steps.
