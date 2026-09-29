/**
 * Emulator test matrix (run: npm run test:emulators).
 * Requires: firebase emulators:start --only auth,functions
 * Exits 0 when every expectation holds, 1 otherwise.
 */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import { createRequire } from "node:module";

// Admin SDK (from functions/) talks to the Auth emulator so the test can
// grant the `authority` role — the same path seed.js --admin-email uses.
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const functionsRequire = createRequire(
  "C:/Users/ok/Desktop/EcoGuard-Ghana-React-FullStack/functions/index.js"
);
const admin = functionsRequire("firebase-admin");
admin.initializeApp({ projectId: "eco-guard-ghana" });

const app = initializeApp({ apiKey: "fake-key", projectId: "eco-guard-ghana" });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099");
const functions = getFunctions(app);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failed++;
    console.log(`FAIL ${name} ${extra}`);
  }
}
async function expectCode(name, fn, code) {
  try {
    await fn();
    check(name, false, "(no error thrown)");
  } catch (err) {
    check(name, err?.code === code, `(got ${err?.code}: ${err?.message})`);
  }
}

const email = `tester${Date.now()}@example.com`;
const call = (name, data) => httpsCallable(functions, name)(data);

// 1. Unauthenticated calls are rejected before touching any data.
await expectCode("requestVerification unauthenticated", () =>
  call("requestVerification", { alertId: "x" }), "functions/unauthenticated");
await expectCode("transitionAlert unauthenticated", () =>
  call("transitionAlert", { alertId: "x", status: "REVIEWED" }), "functions/unauthenticated");
await expectCode("getMosaicTileUrl unauthenticated", () =>
  call("getMosaicTileUrl", {}), "functions/unauthenticated");

// 2. Auth emulator: register + sign in work.
const cred = await createUserWithEmailAndPassword(auth, email, "password123");
check("register creates user", !!cred.user.uid);
await signInWithEmailAndPassword(auth, email, "password123");
check("sign in works", auth.currentUser?.email === email);

// 3. Validation errors (no database needed for these paths).
await expectCode("requestVerification missing alertId", () =>
  call("requestVerification", {}), "functions/invalid-argument");
await expectCode("transitionAlert citizen denied before validation", () =>
  call("transitionAlert", { alertId: "x", status: "BOGUS" }), "functions/permission-denied");
await expectCode("transitionAlert citizen role denied", () =>
  call("transitionAlert", { alertId: "x", status: "REVIEWED" }), "functions/permission-denied");
await expectCode("submitFieldVerification bad photoPath", () =>
  call("submitFieldVerification", { verificationId: "v", photoPath: "evil.txt" }),
  "functions/invalid-argument");

// 4. Earth Engine seam reports unconfigured instead of faking data.
await expectCode("getMosaicTileUrl failed-precondition (EE unconfigured)", () =>
  call("getMosaicTileUrl", {}), "functions/failed-precondition");

// 5. Role upgrade path (mirrors seed.js --admin-email): grant `authority`,
//    re-authenticate for fresh claims, then validation is reachable.
await admin.auth().setCustomUserClaims(cred.user.uid, { role: "authority" });
await signOut(auth);
await signInWithEmailAndPassword(auth, email, "password123");
await expectCode("transitionAlert bad status (as authority)", () =>
  call("transitionAlert", { alertId: "x", status: "BOGUS" }), "functions/invalid-argument");

// 5. Firestore-backed paths need a database (none in this project yet).
//    They must fail at the data layer, never with fake success.
try {
  await call("requestVerification", { alertId: "nonexistent" });
  check("requestVerification unknown alert not-found", false, "(no error)");
} catch (err) {
  check(
    "requestVerification unknown alert fails loudly (no DB / not-found)",
    ["functions/not-found", "functions/internal", "functions/unavailable"].includes(err?.code),
    `(got ${err?.code})`
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
