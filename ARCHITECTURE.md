# EcoGuard Ghana — Architecture & Flowcharts

> Rendered automatically on GitHub (mermaid). Paste any diagram into
> https://mermaid.live to view or export it as PNG/SVG.
>
> Scope: Sections 1–2 describe the CURRENT project in this folder
> (EcoGuard-Ghana-React-FullStack, as built — this is the active scope).
> Sections 3–9 describe the full EcoGuardian platform architecture, which is
> mostly RESERVED FOR FUTURE USE (see the Now-vs-Future map in Section 2).

## 1. Current project — as built (active scope)

Stack: React 18 + Vite dev server on `:5173` (proxies `/api` → `:4000`) +
Express backend `server/index.js` on `:4000` with in-memory demo data.
Run: `npm install`, then `npm run dev`, open http://localhost:5173.
Mobile web app: PWA manifest + icons + production-only offline service
worker (`public/`), installable via Add to Home Screen.

```mermaid
flowchart TB
  Browser(["User browser<br/>http://localhost:5173"])
  Vite["Vite :5173<br/>React 18 SPA — src/main.jsx + styles.css<br/>proxy: /api → localhost:4000"]
  API["Express :4000 — server/index.js<br/>cors + express.json<br/>in-memory alerts[3] + agencies[5]"]

  Browser -->|"GET /"| Vite
  Vite -->|"fetch /api/* (proxied)"| API

  subgraph Frontend["Frontend (src/main.jsx)"]
    direction TB
    Mount["mount → Promise.all:<br/>summary · alerts · agencies · health"]
    State["state: summary · alerts · agencies<br/>selected alert · apiStatus"]
    Hero["#home hero<br/>headline + CTAs<br/>API status pill (Online/Offline)"]
    Stats["stats row<br/>24 zones · 3 active · 1 high-risk · 7 verified"]
    How["#how-it-works<br/>8-step static pipeline"]
    Dash["#monitoring dashboard<br/>Leaflet live map: Esri + NASA daily<br/>alert pins + detection metrics"]
    AlertsUI["#alerts centre<br/>alert cards (EG-001..003)"]
    AgenciesUI["#agencies grid (5 agencies)"]
    Earth["earth section<br/>Earth Engine button → # (placeholder)"]
    About["#about + footer<br/>Detect. Alert. Protect and Restore."]
    Modal["detection modal<br/>map-pin click → details"]
  end

  Mount --> State
  State --> Hero
  State --> Stats
  State --> Dash
  State --> AlertsUI
  State --> AgenciesUI
  Dash -->|"map-pin click<br/>(position % derived from lat/lng)"| Modal

  subgraph Endpoints["Backend endpoints (server/index.js)"]
    direction TB
    H["GET /api/health<br/>{status: online}"]
    S["GET /api/monitoring/summary<br/>{monitoredZones: 24, activeAlerts: 3,<br/>highRisk: 1, verified: 7}"]
    A["GET /api/alerts<br/>{demo: true, alerts: EG-001..003}"]
    G["GET /api/agencies<br/>{5 agencies}"]
    V["POST /api/alerts/:id/verify<br/>status → Field verification requested<br/>404 when id unknown"]
  end

  Mount --> H
  Mount --> S
  Mount --> A
  Mount --> G
  AlertsUI -->|"Request verification"| V
  Modal -->|"Request field verification"| V
  V -->|"returns updated alert<br/>UI swaps it into state"| AlertsUI
```

## 2. Now vs Future — most appropriate at the moment

Use the left column NOW (already built and verified above). Everything on the
right is RESERVED for later — adopt a row only when its trigger is met.

| Use now (this project) | Reserved for future | Full-arch ref |
| ---------------------- | ------------------- | ------------- |
| Demo alerts (EG-001..003) + verify flips status in memory | Persisted reports with Pending → Assigned → Completed lifecycle + citizen/collector/admin roles | §4 |
| Static 8-step pipeline section | Live satellite ingest + AI change detection + GIS layers | §3 |
| Fake map pins + detection modal | Leaflet maps (OSM/Esri), risk filters, zone detail panels, Before/After comparison | §5 |
| Agencies info grid (static) | Agency accounts + dispatch → accept → complete workflows | §6 |
| Earth Engine button placeholder (`href="#"`) | Wire the public Earth Engine App URL in `src/main.jsx` once the EE project is registered and the app published | README note |
| API status pill (Online/Offline) | 4s live polling + toasts + notification center | §3 |
| Summary stats (24 / 3 / 1 / 7 demo values) | Real aggregates from a database | §7 |
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
