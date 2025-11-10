// firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAISsEd9BvCMj4l_YjdC2_sq0TrqYHwA6A",
  authDomain: "recap-8bbfd.firebaseapp.com",
  projectId: "recap-8bbfd",
  storageBucket: "recap-8bbfd.appspot.com",
  messagingSenderId: "885333900987",
  appId: "1:885333900987:web:fa5d65c59e325b361af39e",
  databaseURL: "https://recap-8bbfd-default-rtdb.firebaseio.com",
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
