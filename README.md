# Nexora

**Nexora** is a futuristic SaaS platform with a Discord-powered onboarding
experience, a polished landing page, and a scalable dashboard foundation.

This repo ships **Phase 1** — authentication, design system, landing page,
and a dashboard scaffold. Phase 2 will layer real product features on top.

## Stack

- **Next.js 15** (App Router, TypeScript) — server components & file-based routing
- **Tailwind CSS** — futuristic dark theme with neon accents & glassmorphism
- **NextAuth** — Discord OAuth + JWT sessions
- **MongoDB** + **Mongoose** — persistent storage with cached connections
- **`@auth/mongodb-adapter`** — NextAuth user/account persistence

## Project structure

```
src/
├─ app/                    # Next.js App Router routes
│  ├─ api/auth/[...nextauth]/  # NextAuth handler
│  ├─ dashboard/           # Authenticated dashboard
│  ├─ login/               # Discord sign-in page
│  ├─ globals.css          # Tailwind + design tokens
│  └─ page.tsx             # Landing page
├─ components/
│  ├─ icons/               # Single icon set (consistent style)
│  ├─ landing/             # Marketing site sections
│  ├─ layout/              # Sidebar, Topbar
│  └─ ui/                  # Reusable primitives (Button, Card, ...)
├─ config/                 # Site config (nav, branding)
├─ lib/                    # auth, mongodb, mongoose, utils
├─ models/                 # Mongoose schemas
├─ providers/              # Client-side providers (SessionProvider)
├─ types/                  # Module augmentations
└─ middleware.ts           # Protects /dashboard/*
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local with your MongoDB URI and Discord OAuth credentials

# 3. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Discord OAuth setup

1. Create an application at <https://discord.com/developers/applications>.
2. Add an OAuth2 redirect URL:
   `http://localhost:3000/api/auth/callback/discord`
3. Copy the Client ID + Client Secret into `.env.local`.

### Generate a NextAuth secret

```bash
openssl rand -base64 32
```

## Scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the dev server              |
| `npm run build` | Production build                  |
| `npm run start` | Run the production build          |
| `npm run lint`  | Lint with `eslint-config-next`    |

## Roadmap

- **Phase 1 (this release)** — Discord auth, landing page, dashboard shell, design system, MongoDB foundations.
- **Phase 2 (next)** — Real metrics, automations, multi-workspace, billing, integrations.
