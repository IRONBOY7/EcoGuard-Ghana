# EcoGuard Ghana — Architecture & Flowcharts

> Rendered automatically on GitHub (mermaid). Paste any diagram into
> https://mermaid.live to view or export it as PNG/SVG.
>
> Scope: Sections 1–2 describe the CURRENT project in this folder
> (EcoGuard-Ghana-React-FullStack, as built — this is the active scope).
> Sections 3–9 describe the full EcoGuardian platform architecture, which is
> mostly RESERVED FOR FUTURE USE (see the Now-vs-Future map in Section 2).

## 1. Current project — as built (active scope)

Stack: React 18 + Vite on `:5173` (proxies `/api` → `:4000`) + Express
`server/index.js` on `:4000` with JSON persistence (`server/db.json`).
Run: `npm install`, then `npm run dev` (server + client together), open
http://localhost:5173. Production: `npm run build` + `npm start`
(Express serves `dist/` + API on `:4000`). Live public site:
https://eco-guard-ghana.web.app (Firebase hosting, frontend only).
Data: Firestore-first when configured (currently not) → Express demo API →
bundled demo fallback in `src/api.js`, so map pins, alerts, agencies and
stats render even on static hosting with no backend.
Mobile web app: PWA manifest + icons + production-only service worker
(`public/`), installable via Add to Home Screen.

```mermaid
flowchart TB
  Browser(["User browser<br/>localhost:5173 (dev)<br/>eco-guard-ghana.web.app (live)"])

  subgraph Serve["Serving"]
    direction LR
    Vite["Vite :5173<br/>React 18 SPA — src/main.jsx + styles.css<br/>proxy: /api → localhost:4000"]
    Expr["Express :4000 — server/index.js<br/>cors + express.json<br/>serves API + (prod) dist/"]
    Host["Firebase Hosting (static)<br/>live site + mvp preview channel<br/>no /api backend"]
  end

  Browser -->|"GET / (dev)"| Vite
  Browser -->|"GET / (public)"| Host
  Vite -->|"fetch /api/* (proxied)"| Expr

  subgraph Data["Data layer — src/api.js (independent loaders)"]
    direction TB
    FS["Firestore first (optional, unconfigured)<br/>alerts · detected_changes · authorities"]
    EXAPI["Express demo API<br/>db.json: alerts[3] + agencies[5]"]
    BUND["Bundled demo fallback<br/>DEMO_ALERTS EG-001..003<br/>DEMO_AGENCIES x5"]
    State["UI state: alerts · agencies · summary<br/>selected · apiStatus · auth · ee"]
    FS -.->|"if configured"| State
    EXAPI -->|"if reachable"| State
    BUND -->|"otherwise (e.g. hosting)"| State
  end

  Expr --> EXAPI
  Host -.->|"GET /api/* → 404"| BUND

  subgraph UI["Sections (src/main.jsx)"]
    direction TB
    Hero["#home hero + MonitoringCoverage radar<br/>API status pill (Online/Offline)"]
    Stats["stats row<br/>24 zones · 3 active · 1 high-risk<br/>verified count (live)"]
    How["#how-it-works<br/>8-step static pipeline"]
    Dash["#monitoring dashboard<br/>Leaflet live map: Esri + NASA daily toggle<br/>risk pins + legend + detection side panel"]
    BA["Before/After comparison<br/>EOX Sentinel-2 windows + published change figures"]
    Alerts["#alerts centre<br/>cards EG-001..003: risk · location<br/>coords · date · status"]
    Agencies["#agencies grid (5 agencies)"]
    EE["Earth Engine connection<br/>modal: bring-your-own-account<br/>opens EE app via VITE_EE_APP_URL"]
    Modal["detection modal (pin click)<br/>risk · date · lat/lng · verify"]
    Auth["AuthModal (Firebase Auth, when configured)"]
    About["#about + footer<br/>Detect. Alert. Protect and Restore."]
  end

  State --> Hero
  State --> Stats
  State --> Dash
  State --> Alerts
  State --> Agencies
  Dash -->|"map-pin click"| Modal

  subgraph VerifyLoop["Verification loop"]
    direction TB
    V["POST /api/alerts/:id/verify<br/>persists status to db.json<br/>404 when id unknown"]
    FB["No backend (hosting/dev without server)<br/>button shows explanatory message"]
  end

  Alerts -->|"Request verification"| V
  Modal -->|"Request field verification"| V
  V -->|"returns updated alert<br/>UI swaps it into state"| Alerts
  Alerts -.-> FB
```

## 2. Now vs Future — most appropriate at the moment

Use the left column NOW (already built and verified above). Everything on the
right is RESERVED for later — adopt a row only when its trigger is met.

| Use now (this project) | Reserved for future | Full-arch ref |
| ---------------------- | ------------------- | ------------- |
| Demo alerts (EG-001..003); verify persists to `server/db.json` | Persisted reports with Pending → Assigned → Completed lifecycle + citizen/collector/admin roles | §4 |
| Static 8-step pipeline section | Live satellite ingest + AI change detection + GIS layers | §3 |
| Leaflet live map (Esri + NASA daily toggle), risk pins + legend, detection modal, Before/After comparison | Risk filters, zone detail panels | §5 |
| Bundled demo fallback — map, alerts, agencies, stats render on static hosting | — | §1 |
| Agencies info grid (static) | Agency accounts + dispatch → accept → complete workflows | §6 |
| Earth Engine modal (bring-your-own-account); button opens modal or EE app URL | Register EE project + set `VITE_EE_APP_URL` once the EE app is published | README note |
| API status pill (Online/Offline) | 4s live polling + toasts + notification center | §3 |
| Summary stats (24 zones / 3 alerts / 1 high-risk + live verified count) | Real aggregates from a database | §7 |
| Single public view, no login | Auth + Citizen / Collector / Gov-Admin portals | §3, §5, §6 |
| — (not present) | EcoPoints, rewards, quizzes, communities | §5 |
| — (not present) | Gemini AI chat / vision / voice, Firebase Auth + Firestore + Storage, voice reporting | §3 |

Recommended slice for the moment: monitoring summary → alerts centre →
request-verification loop, with agencies as supporting info. That is the demo
that works end-to-end today.

## 3. Platform overview — request flow, auth, roles, services

```mermaid
flowchart TB
  Browser(["User browser<br/>(desktop + mobile bottom-nav)"])
  Server["server.ts — Express on :3000<br/>dev: tsx server.ts · prod: node dist/server.cjs"]
  SPA["Vite + React 19 SPA<br/>Tailwind v4 · Leaflet · Motion · Sonner · Lucide"]
  App["App.tsx<br/>auth gate · light/dark theme · role dispatch · 4s live polling"]
  Navbar["Navbar — dark-green topbar<br/>brand · role switcher · theme toggle · logout"]
  Footer["Footer — prototype disclaimer"]

  Browser -->|"GET /"| Server
  Server -->|"dev: Vite middleware<br/>prod: dist static + SPA fallback"| SPA
  SPA --> App
  App --> Navbar
  App --> Footer

  subgraph Auth["Authentication"]
    direction TB
    Gate["Login / Register card<br/>+ 1-click demo profiles<br/>(citizen, collector, admin)"]
    FirebaseAuth["Firebase Auth (optional, useFirebase flag)<br/>sign-in · sign-up · password reset<br/>Firestore user docs"]
    LocalAuth["POST /api/auth/login<br/>POST /api/auth/register"]
  end

  App -->|"no session"| Gate
  Gate -->|"Firebase mode"| FirebaseAuth
  Gate -->|"always verified by backend"| LocalAuth
  FirebaseAuth -.->|"profile mirrored"| LocalAuth
  LocalAuth -->|"session: citizen, company or admin"| App

  subgraph Portals["Role portals"]
    direction LR
    CIT["CitizenPortal<br/>citizen reporting + rewards"]
    COM["CompanyPortal<br/>collector jobs + fleet"]
    ADM["AdminPortal<br/>oversight + dispatch"]
  end

  App -->|"role = citizen"| CIT
  App -->|"role = company"| COM
  App -->|"role = admin"| ADM

  subgraph SharedUI["Shared UI services"]
    direction LR
    EcoBot["ChatBotPanel (EcoBot)<br/>POST /api/ai-chat"]
    Scanner["AI Waste Scanner (EcoVision)<br/>POST /api/analyze-image"]
    Voice["GhanaianVoiceReporter<br/>POST /api/analyze-voice"]
    CenterSearch["EcoMap center search<br/>POST /api/recycling-centers/search"]
    GenImg["AI image generation<br/>POST /api/generate-image"]
  end

  CIT --> EcoBot
  CIT --> Scanner
  CIT --> Voice
  CIT --> CenterSearch
  COM --> EcoBot
  ADM --> EcoBot
  ADM --> GenImg

  subgraph Backend["Backend + data stores"]
    direction TB
    API["Express REST — /api/*"]
    DB[("database.json<br/>users · reports · announcements<br/>notifications · rewards · communities<br/>recycling_centers · collector_assignments")]
    Gemini["Google Gemini API<br/>chat · vision · voice<br/>(GEMINI_API_KEY)"]
    FBStore[("Firebase, optional<br/>Auth · Firestore · Storage")]
    Tiles["Map tiles<br/>OpenStreetMap · Esri World Imagery"]
  end

  LocalAuth --> API
  EcoBot --> API
  Scanner --> API
  Voice --> API
  CenterSearch --> API
  GenImg --> API
  API -->|"JSON file persistence"| DB
  API -->|"AI calls"| Gemini
  API -.->|"Firebase mode"| FBStore
  SPA -->|"Leaflet tiles"| Tiles

  classDef store fill:#eef5ed,stroke:#6aaa59,color:#17231b;
  classDef entry fill:#10271b,stroke:#7ed957,color:#fff;
  class DB,Gemini,FBStore,Tiles store;
  class Browser entry;
```

## 4. Report lifecycle — Report → Action → Collection → Completion

```mermaid
flowchart TB
  F["1 · CITIZEN files report<br/>(reports tab: photo optional)<br/>earns EcoPoints · gets points notification"]
  PENDING["status = Pending"]
  TRIAGE["2 · ADMIN triage<br/>(dispatch tab: review queue)<br/>assigns report to a company"]
  ASSIGNED["status = Assigned<br/>collector_assignment record created<br/>company notified"]
  ACCEPT["3 · COLLECTOR accepts job<br/>(assignments tab)"]
  DONE["4 · COLLECTOR completes job<br/>completion photo + notes"]
  COMPLETED["status = Completed<br/>reporter gets Report Resolved notification"]
  LIVE["Live loop — App polls<br/>/api/reports + /api/announcements every 4s<br/>Sonner toasts on status change or new bulletin"]

  F --> PENDING --> TRIAGE --> ASSIGNED --> ACCEPT --> DONE --> COMPLETED
  PENDING -.-> LIVE
  ASSIGNED -.-> LIVE
  COMPLETED -.-> LIVE
```

## 5. Citizen portal — tab map

```mermaid
flowchart LR
  CIT["CitizenPortal<br/>(desktop drawer + mobile bottom nav)"]

  CIT --> HOME["home — prototype landing<br/>EcoHero + radar card · EcoStats<br/>eco tip + cleanliness score<br/>quick actions · recent incidents<br/>collection partner · EcoAlerts<br/>EcoAgencies · EcoWorkflow · EcoBot CTA"]
  CIT --> REP["reports — file dump report<br/>(earns EcoPoints)<br/>history + status tracking"]
  CIT --> SCA["scanner — EcoVision<br/>AI photo waste analysis"]
  CIT --> MAP["map — Interactive EcoMap<br/>GhanaMap (Leaflet)<br/>recycling centers directory"]
  CIT --> COV["coverage — MonitoringCoverage<br/>Leaflet zones map<br/>risk filter + Center Ghana<br/>zone detail panel<br/>Before/After comparison"]
  CIT --> REW["rewards — eco quizzes (+20 pts)<br/>redeem vouchers<br/>(POST /api/rewards/redeem)"]
  CIT --> NOT["notifications — authority bulletins<br/>alerts · mark-as-read"]
  CIT --> PROF["profile + settings<br/>theme · voice reporting · preferences"]
```

## 6. Company + Admin portals — tab map

```mermaid
flowchart LR
  COM["CompanyPortal<br/>(waste collector)"]
  COM --> CD["dashboard<br/>overview"]
  COM --> CA["collection assignments<br/>accept jobs"]
  COM --> CP["collector profile"]
  COM --> CR["optimized routes map"]
  COM --> CB["logistics EcoBot AI"]
  COM --> CH["collection history<br/>complete with proof"]
  COM --> CN["notification center"]
  COM --> CM["performance metrics"]
  COM --> CE["EcoPoints + earnings"]

  ADM["AdminPortal<br/>(gov authority)"]
  ADM --> AD["analytics dashboard"]
  ADM --> AR["complaint dispatch<br/>+ report lists"]
  ADM --> AF["collectors + fleet"]
  ADM --> AA["write announcements<br/>(broadcast bulletins)"]
  ADM --> AB["advisor EcoBot"]
```

## 7. REST API reference (full platform)

| Method | Endpoint | Used by |
| ------ | -------- | ------- |
| POST | `/api/auth/login`, `/api/auth/register` | Auth gate, demo profiles (+50 EcoPoints on citizen signup) |
| GET/POST/PUT | `/api/reports`, `/api/reports/:id`, `/api/reports/:id/assign`, `/api/reports/:id/complete` | Citizen filing + tracking, admin dispatch, collector completion |
| GET/POST | `/api/announcements` | Admin publishing, bulletin ribbon, notifications tab |
| GET/POST/PUT | `/api/notifications`, `/api/notifications/:id` | Points / assignment / resolution / bulletin alerts |
| GET/POST | `/api/rewards`, `/api/rewards/redeem` | Rewards tab, quizzes, voucher claims |
| GET/POST | `/api/communities` | Community engagement |
| GET/POST | `/api/recycling_centers`, `/api/recycling-centers/search` | EcoMap directory + AI search |
| GET/POST/PUT | `/api/collector_assignments`, `/api/collector_assignments/:id` | Dispatch → accept → complete chain |
| GET/PUT | `/api/users`, `/api/users/:id`, `/api/companies` | Admin user management, role views |
| POST | `/api/ai-chat`, `/api/analyze-image`, `/api/analyze-voice`, `/api/generate-image` | EcoBot, EcoVision scanner, voice reports, image gen (Gemini) |

## 8. Data entities (full platform: database.json + types.ts)

- **User** — id, name, email, role (citizen/company/admin), ecoPoints
- **Report** — title, description, category, severity, status (Pending → Assigned → Completed), location (lat/lng/address), reporter, points awarded, photos, assignment + completion notes
- **Announcement** — title, content, category (Alert/Event/Update), author
- **Notification** — userId, title, message, type (assignment/resolved/points/announcement/campaign), read flag
- **Reward** — title, points cost, category (vouchers/merchandise/tree-planting)
- **Community** — name, points, rank, members, environmental score, campaigns
- **RecyclingCenter** — name, address, accepted material types
- **CollectorAssignment** — report link, company, status, completed date
- **MonitoringZone** (frontend demo data, `src/data/monitoringCoverage.ts`) — location, region, lat/lng, status (monitoring/change/high-risk), zone type, imagery date, detected change, risk level

## 9. Run commands (full platform — Default Project repo)

| Command | Purpose |
| ------- | ------- |
| `npm run dev` (`tsx server.ts`) | Dev server on http://localhost:3000 (Express + Vite middleware) |
| `npm run build` | Production build → `dist/` (Vite bundle + `dist/server.cjs`) |
| `npm run start` | Serve production build |
| `npm run lint` (`tsc --noEmit`) | Type-check |
