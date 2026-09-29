# EcoGuard Ghana — TODO

> Legend: [ ] open · [x] done. "Future" rows mirror the Now-vs-Future map in ARCHITECTURE.md §2.

## Immediate (prototype correctness)

- [ ] Register the Cloud project with Earth Engine (Cloud Console → Earth Engine → register; accept ToS) — blocks any live EE feature
- [ ] Enable Email/Password sign-in (Firebase Console → Authentication → Sign-in method) — blocks all auth
- [ ] Generate a service-account key (Project settings → Service accounts) and run `node functions/seed.js --admin-email you@example.com` to load demo data + grant yourself admin — key file stays out of git
- [ ] Set `EE_APP_URL` in `src/main.jsx` to the public Earth Engine App URL once published
- [ ] Verify the "Explore Historical Images" deep link (`earth.google.com/web/search/Ghana`) resolves correctly; fall back to `https://earth.google.com/` if not
- [ ] Add previous-day fallback for the NASA GIBS daily layer when yesterday's mosaic is missing
- [ ] Connect the local folder to GitHub (`git init` + remote) so pushes don't need the temp-clone flow

## Short-term (make it real)

- [x] Backend code complete (Firestore schema + rules, Cloud Functions, Auth UI, seed script — committed as `feat: add Firebase backend`)
- [ ] Deploy remaining backend: upgrade project to Blaze (Functions requirement), click Storage Get Started, redeploy `functions` + `storage`
- [ ] Verify end-to-end verification flow (sign in → request → evidence → authority confirm) after Blaze upgrade
- [ ] Custom monitoring area: let users pick coordinates instead of the fixed Kumasi window
- [ ] Add 2024/2025 EOX mosaic years as comparison options (layers exist: `s2cloudless-2024_3857`, `s2cloudless-2025_3857`)
- [ ] Field-validate the VARI/bare-soil prototype estimates (Tano-Offin, Upper Wassaw, Custom) or replace with published figures when available
- [ ] Add a basic smoke-test script (health + summary + alerts + verify-404) to run before demos
- [ ] Test PWA install + offline mode on a real Android/iOS device

## Future (reserved — adopt a row only when its trigger is met)

- [ ] Live satellite ingest + automated change detection (replace demo metrics)
- [ ] Google Earth Engine tile layers in Before/After cards (swap `eoxTileUrl` templates)
- [ ] Auth + Citizen / Collector / Gov-Admin roles and the full report lifecycle
- [ ] Agency accounts with dispatch → accept → complete workflows and notifications
- [ ] EcoPoints, rewards, quizzes, communities
- [ ] AI chat / vision / voice features (Gemini) and voice reporting
- [ ] API hardening: validation, rate limiting, error handling
- [ ] Public launch checklist (custom domain, analytics, uptime monitor)
