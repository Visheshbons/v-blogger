/**
 * Firebase initialization for V-Blogger (client-side).
 *
 * Usage (in your HTML/EJS):
 * <script type="module" src="/firebase-init.js"></script>
 * Then access the initialized services via `window.firebaseApp` and `window.firebaseServices`.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js";

// Your web app's Firebase configuration (public keys are safe to ship to the client)
const firebaseConfig = {
  apiKey: "AIzaSyAGjPHJ5kgOfAvxfd8PbOTp8TNnyWjnodI",
  authDomain: "vishesh-kudva.firebaseapp.com",
  projectId: "vishesh-kudva",
  storageBucket: "vishesh-kudva.firebasestorage.app",
  messagingSenderId: "908033108667",
  appId: "1:908033108667:web:701b8a2ee76ea59378579e",
};

// Initialize app only once (supports hot reloads)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Core services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Analytics (guarded for environments where it's not supported, e.g., some browsers/SSR)
let analytics = null;
isAnalyticsSupported().then((ok) => {
  if (ok) {
    analytics = getAnalytics(app);
  }
});

// Expose to window for convenience (avoid re-importing elsewhere)
window.firebaseApp = app;
window.firebaseServices = {
  auth,
  db,
  storage,
  analytics,
};

export { app, auth, db, storage, analytics };
