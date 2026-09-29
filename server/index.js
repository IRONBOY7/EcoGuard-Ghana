const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// JSON-file persistence (MVP): demo data survives server restarts.
// NOTE: free-tier hosts (e.g. Render free) use ephemeral disks, so the file
// resets when the service itself restarts. For persistent free hosting, use
// a host with a disk/volume (e.g. Fly.io volume) or move to Firestore.
// ---------------------------------------------------------------------------
const DB_FILE = path.join(__dirname, "db.json");

function loadDb() {
  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    if (!Array.isArray(raw.alerts) || !Array.isArray(raw.agencies)) {
      throw new Error("bad shape");
    }
    return raw;
  } catch (err) {
    console.warn("DB file missing/invalid, starting empty:", err.message);
    return { alerts: [], agencies: [] };
  }
}

const db = loadDb();
const alerts = db.alerts;
const agencies = db.agencies;

function persist() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.warn("DB write failed:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Firebase Auth check (MVP mode): enforced only when credentials exist.
// Provide via FIREBASE_SERVICE_ACCOUNT (JSON string),
// GOOGLE_APPLICATION_CREDENTIALS (key file), or FIREBASE_AUTH_EMULATOR_HOST.
// Without credentials the API stays open and logs a warning per write.
// ---------------------------------------------------------------------------
let adminAuth = null;
if (
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST
) {
  try {
    const admin = require("firebase-admin");
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        ),
      });
    } else {
      admin.initializeApp();
    }
    adminAuth = admin.auth();
    console.log("Firebase Auth verification enabled.");
  } catch (err) {
    console.warn("MVP mode: Firebase Admin unavailable - writes unauthenticated:", err.message);
  }
} else {
  console.warn(
    "MVP mode: no Firebase credentials - /api writes are unauthenticated. " +
      "Set FIREBASE_SERVICE_ACCOUNT to enforce sign-in."
  );
}

async function maybeAuth(req, _res, next) {
  req.firebaseUser = null;
  const header = req.headers.authorization || "";
  if (adminAuth && header.startsWith("Bearer ")) {
    try {
      req.firebaseUser = await adminAuth.verifyIdToken(header.slice(7));
    } catch {
      // Invalid/expired token: treated as unauthenticated below.
    }
  }
  next();
}

function requireAuthOrWarn(req, res, next) {
  if (adminAuth && !req.firebaseUser) {
    return res.status(401).json({ message: "Sign in required." });
  }
  if (!adminAuth) {
    console.warn("MVP mode: unauthenticated write to", req.path);
  }
  next();
}

// ---------------------------------------------------------------------------
// API routes (unchanged shapes)
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => res.json({ status: "online", service: "EcoGuard Ghana API" }));
app.get("/api/alerts", (_req, res) => res.json({ demo: true, alerts }));
app.get("/api/agencies", (_req, res) => res.json({ agencies }));
app.get("/api/monitoring/summary", (_req, res) => res.json({
  demo: true,
  monitoredZones: 24,
  activeAlerts: alerts.length,
  highRisk: alerts.filter(a => a.risk === "High").length,
  verified: 7
}));

app.post("/api/alerts/:id/verify", maybeAuth, requireAuthOrWarn, (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ message: "Alert not found" });
  alert.status = "Field verification requested";
  persist();
  res.json({ success: true, alert });
});

// ---------------------------------------------------------------------------
// Production: serve the built frontend (dist/) alongside the API.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "..", "dist");
  app.use(express.static(dist));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "Not found" });
    }
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.listen(PORT, () => console.log(`EcoGuard API running on http://localhost:${PORT}`));
