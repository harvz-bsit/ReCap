// firebaseConfig.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAISsEd9BvCMj4l_YjdC2_sq0TrqYHwA6A",
  authDomain: "recap-8bbfd.firebaseapp.com",
  databaseURL: "https://recap-8bbfd-default-rtdb.firebaseio.com", // <-- RTDB URL
  projectId: "recap-8bbfd",
  storageBucket: "recap-8bbfd.firebasestorage.app",
  messagingSenderId: "885333900987",
  appId: "1:885333900987:web:fa5d65c59e325b361af39e",
  measurementId: "G-ZJQP8X06R6"
};

// Only initialize Firebase once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export RTDB instance
export const db = getDatabase(app);
