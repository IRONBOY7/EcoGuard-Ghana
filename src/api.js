/**
 * Data layer — Firestore first, local Express demo API as fallback.
 * Firestore docs use the backend schema (see functions/); toLegacyAlert
 * maps them onto the shape the dashboard already renders. Demo records
 * (demo:true) are visibly marked so they are never mistaken for live data.
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { callFn, db, getIdToken, isFirebaseConfigured, storage } from "./firebase";

const LEGACY_STATUS = {
  NEW: "Requires verification",
  REVIEWED: "Under review",
  ASSIGNED: "Assigned",
  FIELD_VERIFICATION: "Field verification requested",
  CONFIRMED: "Confirmed",
  RESOLVED: "Resolved",
};

export const MONITORED_ZONES = 24;

/**
 * Bundled demo records — mirrors server/db.json. Used whenever neither
 * Firestore nor the Express demo API is reachable (e.g. static hosting
 * without a backend), so the map pins, alert centre, agencies and stats
 * always render instead of silently disappearing.
 */
const DEMO_ALERTS = [
  { id: "EG-001", location: "Amansie South, Ashanti Region", risk: "High", change: "Vegetation loss / exposed soil", date: "2026-09-21", status: "Requires verification", lat: 6.321, lng: -1.736 },
  { id: "EG-002", location: "Prestea-Huni Valley, Western Region", risk: "Medium", change: "Land-cover change", date: "2026-09-19", status: "Under review", lat: 5.535, lng: -2.105 },
  { id: "EG-003", location: "Atiwa, Eastern Region", risk: "Low", change: "Possible vegetation disturbance", date: "2026-09-17", status: "Monitoring", lat: 6.221, lng: -0.566 },
];

const DEMO_AGENCIES = [
  { name: "Forestry Commission / Forest Services Division", role: "Forest-reserve protection and monitoring" },
  { name: "Minerals Commission", role: "Mining regulation and compliance" },
  { name: "Environmental Protection Agency (EPA)", role: "Environmental regulation and compliance" },
  { name: "Lands Commission", role: "Land information, surveying and mapping" },
  { name: "NAIMOS", role: "Coordination of operations against illegal mining" },
];

/** GET a demo-API path. Returns null on any failure (offline, 404, bad JSON). */
async function demoApi(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toLegacyAlert(docId, a, d, areaName) {
  const date = String(d.observationDate || d.detectionDate || "").slice(0, 10);
  const base = areaName || d.locationName || "Unknown location";
  return {
    firebaseDocId: docId,
    firebaseStatus: a.status || "NEW",
    id: a.legacyId || d.legacyId || docId,
    location: base + (a.demo ? " · demo" : ""),
    risk: d.riskLevel || "Low",
    change: d.disturbanceType || "Under assessment",
    date,
    status: LEGACY_STATUS[a.status] || a.status || "Requires verification",
    lat: d.location?.lat ?? 0,
    lng: d.location?.lng ?? 0,
  };
}

export async function fetchAlerts() {
  if (isFirebaseConfigured()) {
    try {
      const [alertsSnap, detSnap, areaSnap] = await Promise.all([
        getDocs(
          query(collection(db, "alerts"), orderBy("createdAt", "desc"), limit(50))
        ),
        getDocs(collection(db, "detected_changes")),
        getDocs(collection(db, "monitoring_areas")),
      ]);
      if (!alertsSnap.empty) {
        const detections = Object.fromEntries(
          detSnap.docs.map((x) => [x.id, x.data()])
        );
        const areas = Object.fromEntries(
          areaSnap.docs.map((x) => [x.id, x.data()])
        );
        return alertsSnap.docs.map((docSnap) => {
          const a = docSnap.data();
          const d = detections[a.detectionId] || {};
          const area = areas[d.monitoringAreaId];
          return toLegacyAlert(docSnap.id, a, d, area?.name);
        });
      }
    } catch (err) {
      console.warn("Firestore alerts unavailable, using demo API:", err);
    }
  }
  const res = await demoApi("/api/alerts");
  if (res?.alerts?.length) return res.alerts;
  console.info("Demo API unreachable — showing bundled demo alerts.");
  return DEMO_ALERTS;
}

export async function fetchAgencies() {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, "authorities"));
      if (!snap.empty) {
        return snap.docs.map((d) => ({
          name: d.data().name,
          role: d.data().mandate,
        }));
      }
    } catch (err) {
      console.warn("Firestore agencies unavailable, using demo API:", err);
    }
  }
  const res = await demoApi("/api/agencies");
  if (res?.agencies?.length) return res.agencies;
  console.info("Demo API unreachable — showing bundled demo agencies.");
  return DEMO_AGENCIES;
}

export function buildSummary(alerts) {
  return {
    monitoredZones: MONITORED_ZONES,
    activeAlerts: alerts.length,
    highRisk: alerts.filter((x) => x.risk === "High").length,
    verified: alerts.filter((x) => /Resolved|Completed|Confirmed/.test(x.status || ""))
      .length,
  };
}

export async function createUserProfile(uid, { name, email }) {
  await setDoc(doc(db, "users", uid), {
    name,
    email,
    role: "citizen",
    createdAt: serverTimestamp(),
  });
}

export async function requestVerification(alertDocId, notes) {
  return callFn("requestVerification", {
    alertId: alertDocId,
    notes: notes || "",
  });
}

/** Express fallback (demo API): same status flip, persisted to db.json. */
export async function legacyVerify(id) {
  const token = await getIdToken();
  const result = await fetch(`/api/alerts/${id}/verify`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((r) => {
    if (r.status === 401) throw new Error("Sign in required by the server.");
    return r.json();
  });
  return result;
}

export async function uploadEvidence(alertDocId, file) {
  const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const path = `verifications/${alertDocId}/${Date.now()}_${safe}`;
  const snap = await uploadBytes(ref(storage, path), file);
  return snap.metadata.fullPath;
}

export async function submitVerificationEvidence({
  verificationId,
  photoPath,
  notes,
}) {
  return callFn("submitFieldVerification", {
    verificationId,
    ...(photoPath ? { photoPath } : {}),
    ...(notes ? { notes } : {}),
  });
}
