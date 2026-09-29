/**
 * EcoGuard Ghana Cloud Functions (2nd gen, callable).
 *
 * Alert lifecycle: NEW → REVIEWED → ASSIGNED → FIELD_VERIFICATION
 *                  → CONFIRMED → RESOLVED
 * Roles (Auth custom claims): citizen (default) · authority · admin.
 * All writes to operational collections happen here — clients have no
 * direct write access (see firestore.rules).
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const ee = require("./earthengine");

// Earth Engine seam (throws failed-precondition until configured).
exports.getMosaicTileUrl = ee.getMosaicTileUrl;

admin.initializeApp();
const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

const STATUSES = [
  "NEW",
  "REVIEWED",
  "ASSIGNED",
  "FIELD_VERIFICATION",
  "CONFIRMED",
  "RESOLVED",
];
const TRANSITIONS = {
  NEW: ["REVIEWED", "ASSIGNED"],
  REVIEWED: ["ASSIGNED", "FIELD_VERIFICATION"],
  ASSIGNED: ["FIELD_VERIFICATION"],
  FIELD_VERIFICATION: ["CONFIRMED"],
  CONFIRMED: ["RESOLVED"],
  RESOLVED: [],
};
const RISKS = ["Low", "Medium", "High"];

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  return request.auth;
}

function requireRole(request, roles) {
  const auth = requireAuth(request);
  if (!roles.includes(auth.token.role)) {
    throw new HttpsError("permission-denied", "Insufficient role.");
  }
  return auth;
}

function cleanString(value, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Authority/admin creates an alert from an existing detection record.
 * data: { detectionId, authorityId }
 */
exports.createAlert = onCall(async (request) => {
  requireRole(request, ["authority", "admin"]);
  const { detectionId, authorityId } = request.data || {};
  if (!detectionId || typeof detectionId !== "string") {
    throw new HttpsError("invalid-argument", "detectionId is required.");
  }
  if (!authorityId || typeof authorityId !== "string") {
    throw new HttpsError("invalid-argument", "authorityId is required.");
  }
  const [detection, authority] = await Promise.all([
    db.collection("detected_changes").doc(detectionId).get(),
    db.collection("authorities").doc(authorityId).get(),
  ]);
  if (!detection.exists) {
    throw new HttpsError("not-found", "Detection record not found.");
  }
  if (!authority.exists) {
    throw new HttpsError("not-found", "Authority not found.");
  }
  const ref = await db.collection("alerts").add({
    detectionId,
    authorityId,
    status: "NEW",
    demo: !!detection.data().demo,
    createdBy: request.auth.uid,
    createdAt: now(),
    updatedAt: now(),
  });
  return { alertId: ref.id, status: "NEW" };
});

/**
 * Any signed-in user requests field verification for an alert.
 * Creates a field_verifications record and moves the alert to
 * FIELD_VERIFICATION (only from states that allow it).
 * data: { alertId, notes? }
 */
exports.requestVerification = onCall(async (request) => {
  const auth = requireAuth(request);
  const { alertId, notes } = request.data || {};
  if (!alertId || typeof alertId !== "string") {
    throw new HttpsError("invalid-argument", "alertId is required.");
  }
  const alertRef = db.collection("alerts").doc(alertId);
  const alert = await alertRef.get();
  if (!alert.exists) {
    throw new HttpsError("not-found", "Alert not found.");
  }
  const current = alert.data().status;
  if (!(TRANSITIONS[current] || []).includes("FIELD_VERIFICATION")) {
    throw new HttpsError(
      "failed-precondition",
      `Alert in status ${current} cannot move to field verification.`
    );
  }
  const verRef = await db.collection("field_verifications").add({
    alertId,
    requestedBy: auth.uid,
    requestedByEmail: auth.token.email || null,
    notes: cleanString(notes),
    status: "REQUESTED",
    photoPath: null,
    result: null,
    demo: !!alert.data().demo,
    createdAt: now(),
    updatedAt: now(),
  });
  await alertRef.update({ status: "FIELD_VERIFICATION", updatedAt: now() });
  return { verificationId: verRef.id, status: "FIELD_VERIFICATION" };
});

/**
 * Signed-in user submits verification evidence (photo already uploaded
 * to Storage under verifications/{alertId}/... by the client).
 * data: { verificationId, photoPath?, result?, notes? }
 */
exports.submitFieldVerification = onCall(async (request) => {
  const auth = requireAuth(request);
  const { verificationId, photoPath, result, notes } = request.data || {};
  if (!verificationId || typeof verificationId !== "string") {
    throw new HttpsError("invalid-argument", "verificationId is required.");
  }
  if (
    photoPath !== undefined &&
    (typeof photoPath !== "string" ||
      !/^verifications\/[A-Za-z0-9_-]+\/.+\.(jpg|jpeg|png|webp)$/i.test(
        photoPath
      ))
  ) {
    throw new HttpsError(
      "invalid-argument",
      "photoPath must point at an image under verifications/."
    );
  }
  if (
    result !== undefined &&
    result !== null &&
    !["CONFIRMED_DISTURBANCE", "NO_DISTURBANCE", "INCONCLUSIVE"].includes(result)
  ) {
    throw new HttpsError("invalid-argument", "Unknown result value.");
  }
  const verRef = db.collection("field_verifications").doc(verificationId);
  const ver = await verRef.get();
  if (!ver.exists) {
    throw new HttpsError("not-found", "Verification record not found.");
  }
  const owner = ver.data().requestedBy === auth.uid;
  const privileged = ["authority", "admin"].includes(auth.token.role);
  if (!owner && !privileged) {
    throw new HttpsError(
      "permission-denied",
      "Only the requester or an authority can submit evidence."
    );
  }
  await verRef.update({
    ...(photoPath !== undefined ? { photoPath } : {}),
    ...(result !== undefined ? { result } : {}),
    ...(notes !== undefined ? { notes: cleanString(notes) } : {}),
    status: "SUBMITTED",
    updatedAt: now(),
  });
  return { verificationId, status: "SUBMITTED" };
});

/**
 * Authority/admin moves an alert along the lifecycle (optionally assigning
 * it to an authority). data: { alertId, status, authorityId? }
 */
exports.transitionAlert = onCall(async (request) => {
  requireRole(request, ["authority", "admin"]);
  const { alertId, status, authorityId } = request.data || {};
  if (!alertId || typeof alertId !== "string") {
    throw new HttpsError("invalid-argument", "alertId is required.");
  }
  if (!STATUSES.includes(status)) {
    throw new HttpsError(
      "invalid-argument",
      `status must be one of ${STATUSES.join(", ")}.`
    );
  }
  const alertRef = db.collection("alerts").doc(alertId);
  const alert = await alertRef.get();
  if (!alert.exists) {
    throw new HttpsError("not-found", "Alert not found.");
  }
  const current = alert.data().status;
  if (!(TRANSITIONS[current] || []).includes(status)) {
    throw new HttpsError(
      "failed-precondition",
      `Illegal transition ${current} → ${status}.`
    );
  }
  const update = {
    status,
    updatedBy: request.auth.uid,
    updatedAt: now(),
  };
  if (authorityId !== undefined) {
    if (typeof authorityId !== "string" || !authorityId) {
      throw new HttpsError("invalid-argument", "authorityId is invalid.");
    }
    const authority = await db
      .collection("authorities")
      .doc(authorityId)
      .get();
    if (!authority.exists) {
      throw new HttpsError("not-found", "Authority not found.");
    }
    update.authorityId = authorityId;
  }
  await alertRef.update(update);
  return { alertId, status };
});
