// src/config/firebase.ts
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  // ❌ DO NOT add appId for Android
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let firestore: Firestore;

if (Platform.OS === "web") {
  firestore = getFirestore(app);
} else {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });
}

const auth = getAuth(app);

export { app, auth, firestore };
