// Firebase initialization — client-side only.
// Firebase Auth and Firestore cannot run on the server (Next.js SSR).
// All firebase imports must be called from client components or inside useEffect.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Only initialise on the client — never on the server (SSR/RSC)
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") throw new Error("Firebase Auth is client-only");
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (typeof window === "undefined") throw new Error("Firestore is client-only");
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

// Named exports for backward compat — only call from client code
export const auth = {
  get current(): Auth {
    return getFirebaseAuth();
  },
};

export const db = {
  get current(): Firestore {
    return getFirebaseDb();
  },
};

export default getFirebaseApp;
