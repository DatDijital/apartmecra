// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAkFCVr_IrA9qR8gAgDAZMGGk-xGsY2nA",
  authDomain: "ilsekreterliki.firebaseapp.com",
  projectId: "ilsekreterliki",
  storageBucket: "ilsekreterliki.firebasestorage.app",
  messagingSenderId: "112937724027",
  appId: "1:112937724027:web:03e419ca720eea178c1ade",
  measurementId: "G-YMN4TEP8Z1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

