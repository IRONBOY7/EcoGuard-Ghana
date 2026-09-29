/**
 * Seed script — writes clearly-marked DEMO data to Firestore.
 *
 * Usage (Admin SDK, key file NEVER committed):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node seed.js [--project eco-guard-ghana] [--admin-email you@example.com]
 *
 * --admin-email optionally grants the `admin` custom claim to that user
 * (they must already exist in Authentication) and mirrors it on their
 * users/{uid} doc. Everything written carries `demo: true` except the
 * authorities reference list.
 *
 * Get a key: Firebase Console → Project settings → Service accounts →
 * Generate new private key. Keep the JSON out of git (see .gitignore).
 */
const admin = require("firebase-admin");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

async function main() {
  const projectId = arg("--project") || process.env.GCLOUD_PROJECT || "eco-guard-ghana";
  const adminEmail = arg("--admin-email");
  admin.initializeApp({ projectId });
  const db = admin.firestore();
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  const put = (col, id, data) =>
    batch.set(db.collection(col).doc(id), { ...data, updatedAt: ts });

  // Authorities — reference data (the five Ghanaian bodies).
  const authorities = [
    ["forestry-commission", "Forestry Commission / Forest Services Division", "Forest-reserve protection and monitoring"],
    ["minerals-commission", "Minerals Commission", "Mining regulation and compliance"],
    ["epa", "Environmental Protection Agency (EPA)", "Environmental regulation and compliance"],
    ["lands-commission", "Lands Commission", "Land information, surveying and mapping"],
    ["naimos", "NAIMOS", "Coordination of operations against illegal mining"],
  ];
  for (const [id, name, mandate] of authorities) {
    put("authorities", id, { name, mandate, demo: false, createdAt: ts });
  }

  // Monitoring areas mirror the frontend comparison windows.
  const areas = [
    ["oda-river", "Oda River area", 6.321, -1.736, 12],
    ["apamprama", "Apamprama Forest Reserve", 6.36, -1.83, 12],
    ["tano-offin", "Tano Offin", 6.52, -2.02, 12],
    ["upper-wassaw", "Upper Wassaw", 5.75, -2.08, 12],
  ];
  for (const [id, name, lat, lng, zoom] of areas) {
    put("monitoring_areas", id, {
      name, center: { lat, lng }, zoom, demo: true, createdAt: ts,
    });
  }

  // Satellite observations describe the real mosaic windows in use.
  put("satellite_observations", "eox-2018", {
    source: "EOX Sentinel-2 cloudless",
    year: 2018,
    note: "Annual mosaic. Contains modified Copernicus Sentinel data.",
    demo: true, createdAt: ts,
  });
  put("satellite_observations", "eox-2023", {
    source: "EOX Sentinel-2 cloudless",
    year: 2023,
    note: "Annual mosaic. Contains modified Copernicus Sentinel data.",
    demo: true, createdAt: ts,
  });
  put("satellite_observations", "gibs-modis-daily", {
    source: "NASA EOSDIS GIBS MODIS Terra true-color",
    cadence: "daily",
    note: "Daily mosaic, ~1 day latency.",
    demo: true, createdAt: ts,
  });

  // Detections + risk assessments + alerts (demo versions of EG-001..003).
  const detections = [
    ["det-oda", "oda-river", "EG-001", "Vegetation loss / exposed soil", "High", 0.82, "2026-09-21", 6.321, -1.736],
    ["det-prestea", "oda-river", "EG-002", "Land-cover change", "Medium", 0.64, "2026-09-19", 5.535, -2.105],
    ["det-atiwa", "oda-river", "EG-003", "Possible vegetation disturbance", "Low", 0.41, "2026-09-17", 6.221, -0.566],
  ];
  for (const [id, areaId, legacyId, type, risk, conf, date, lat, lng] of detections) {
    put("detected_changes", id, {
      monitoringAreaId: areaId, legacyId, disturbanceType: type,
      confidence: conf, observationDate: date, previousImageDate: "2018 mosaic",
      currentImageDate: "2023 mosaic", location: { lat, lng },
      riskLevel: risk, status: "NEW", demo: true, createdAt: ts,
    });
    put("risk_assessments", `risk-${id}`, {
      detectionId: id, riskLevel: risk, confidence: conf,
      method: "demo heuristic", demo: true, createdAt: ts,
    });
    put("alerts", `alert-${id}`, {
      detectionId: id, authorityId: "forestry-commission",
      legacyId, status: "NEW", demo: true, createdAt: ts,
    });
  }

  await batch.commit();
  console.log("Seeded demo data (demo:true) into", projectId);

  if (adminEmail) {
    const user = await admin.auth().getUserByEmail(adminEmail);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    await db.collection("users").doc(user.uid).set(
      { role: "admin", email: adminEmail, updatedAt: ts },
      { merge: true }
    );
    console.log(`Granted admin role to ${adminEmail}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
