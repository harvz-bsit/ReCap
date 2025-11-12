// firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { getDatabase } from "firebase/database";


const firebaseConfig = {
  apiKey: "AIzaSyDSHiQezrQlauVWTrhHDagrGHS8dobWNps",
  authDomain: "recap-7abd3.firebaseapp.com",
  projectId: "recap-7abd3",
  storageBucket: "recap-7abd3.firebasestorage.app",
  messagingSenderId: "145648266811",
  appId: "1:145648266811:web:3ceb6da2a7d8b2ee74b61e",
  databaseURL: "https://recap-7abd3-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// ✅ Initialize Firebase app
const app = initializeApp(firebaseConfig);

// ✅ Realtime Database
export const db = getDatabase(app);

// ✅ AUTH FIX FOR EXPO GO (uses Web Persistence)
export const authRN = initializeAuth(app, {
  persistence: browserLocalPersistence,
});

// ✅ Export
export default app;
