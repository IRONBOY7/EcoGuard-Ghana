/**
 * Google Earth Engine integration point — NOT configured.
 *
 * Nothing here pretends to return satellite data. When the project is
 * ready for live EE processing:
 *   1. Register the Cloud project at
 *      https://console.cloud.google.com/earth-engine
 *   2. Create a service account + key, store the JSON in Secret Manager
 *      as EE_SERVICE_ACCOUNT_KEY, and grant it the Earth Engine role.
 *   3. Set the EE_GCP_PROJECT secret to the registered project id.
 *   4. Implement getMosaicTileUrl with @google/earthengine (already the
 *      pattern the frontend expects: a tile-URL template per date/site).
 *
 * Until then getMosaicTileUrl throws failed-precondition with setup
 * instructions, and the frontend keeps using the real EOX Sentinel-2
 * mosaics and the NASA daily feed (see src/comparisonData.js,
 * src/SatelliteMap.jsx) — no fake satellite results anywhere.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");

function eeConfig() {
  // Secrets must come from Secret Manager / function config — never client.
  const project = process.env.EE_GCP_PROJECT;
  const hasKey = !!process.env.EE_SERVICE_ACCOUNT_KEY;
  if (!project || !hasKey) return null;
  return { project };
}

exports.getMosaicTileUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const config = eeConfig();
  if (!config) {
    throw new HttpsError(
      "failed-precondition",
      "Earth Engine is not configured: set the EE_GCP_PROJECT and " +
        "EE_SERVICE_ACCOUNT_KEY secrets and register the project in the " +
        "Earth Engine console first."
    );
  }
  // Live implementation goes here (authenticate service account,
  // build the mosaic/filter, return a signed tile-URL template).
  throw new HttpsError(
    "unimplemented",
    "Earth Engine wiring is scaffolded but not yet implemented."
  );
});
