/**
 * Firebase client wiring (Auth + Firestore + Storage + Functions).
 * Config comes from VITE_* env vars (public by design — see .env.example).
 * When any key is missing, isConfigured() is false and the app keeps
 * running on the local Express demo API instead of breaking.
 */
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = () => !!(config.apiKey && config.projectId);

let auth = null;
let db = null;
let storage = null;
let functions = null;

if (isFirebaseConfigured()) {
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
}

export { auth, db, storage, functions };

export const watchAuth = (cb) =>
  auth ? onAuthStateChanged(auth, cb) : () => {};
export const signInUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
export const registerUser = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);
export const signOutUser = () => signOut(auth);
export const getIdToken = () =>
  auth?.currentUser
    ? auth.currentUser.getIdToken().catch(() => null)
    : Promise.resolve(null);
export const callFn = (name, data) =>
  httpsCallable(functions, name)(data).then((r) => r.data);
