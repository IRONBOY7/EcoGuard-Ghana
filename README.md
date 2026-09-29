# EcoGuard Ghana — React Full-Stack Prototype

A student innovation prototype for satellite-based environmental monitoring in Ghana.

## Stack
- React + Vite frontend
- Node.js + Express backend
- Lucide React icons
- REST API
- Responsive CSS

## Run locally
1. Install Node.js.
2. In this folder run:
   `npm install`
3. Run:
   `npm run dev`
4. Open `http://localhost:5173`

The API runs on `http://localhost:4000`.

## Data persistence (MVP)

Alert/agency data lives in `server/db.json` (committed as seed data) and
every write is saved back to it, so reports survive server restarts.

> Free-tier hosts such as Render use ephemeral disks: the file resets when
> the service itself restarts. For disk that survives restarts on a free
> plan, use a host with a persistent volume (e.g. Fly.io) or move to
> Firestore (see ARCHITECTURE.md).

## Deploy (Render free tier)

1. Push this repo to GitHub (history: `git init`, add remote, push).
2. Render dashboard → New → Web Service → select the repo (render.yaml
   is picked up automatically).
3. Add the `VITE_FIREBASE_*` env vars in Render (from `.env.example`)
   if you want the Auth UI live; add `FIREBASE_SERVICE_ACCOUNT`
   (service-account JSON) to enforce sign-in on `/api` writes.
   Without them the app runs in open MVP demo mode.
4. Deploy. The service sleeps when idle and wakes in ~30s.

## Mobile web app (PWA)

- Open `http://localhost:5173` on your phone (same Wi-Fi) or any page served
  from `dist/` over HTTPS, then use the browser menu → **Add to Home screen**
  (Android) or **Share → Add to Home Screen** (iOS) to install it.
- The production build registers a service worker that caches the app shell
  plus map/font tiles for offline viewing. API data always stays live.
  The worker is never registered in dev, so local iteration is never stale.

## API
- `GET /api/health`
- `GET /api/monitoring/summary`
- `GET /api/alerts`
- `GET /api/agencies`
- `POST /api/alerts/:id/verify`

## Important
The displayed monitoring results are demonstration data. Real satellite imagery, AI change detection, GIS layers, authentication, notifications and authorized agency workflows require additional integrations and validation.

Replace the Earth Engine button destination in `src/main.jsx` when the public EcoGuard Ghana Earth Engine App URL is available.
