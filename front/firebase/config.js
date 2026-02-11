// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { Platform } from "react-native";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
} from "firebase/auth";

let AsyncStorage;
let getReactNativePersistence;

// RNのみ動的 import（Webバンドルに async-storage を含めない）
if (Platform.OS !== "web") {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
  ({ getReactNativePersistence } = require("firebase/auth"));
}

const firebaseConfig = {
  apiKey: "AIzaSyAeg6OqdKWeihzzzz1CR7jHXj7khmT3Enc",
  authDomain: "memo-ai-c5fbd.firebaseapp.com",
  projectId: "memo-ai-c5fbd",
  storageBucket: "memo-ai-c5fbd.firebasestorage.app",
  messagingSenderId: "801835173003",
  appId: "1:801835173003:web:af1c5ef45e8d6e7285c08e",
  measurementId: "G-JFZWMS7GWN",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Web: getAuth + browserLocalPersistence
// ✅ RN : initializeAuth + AsyncStorage persistence
export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

if (Platform.OS === "web") {
  // Webでも永続化したい場合（localStorage）
  auth.setPersistence(browserLocalPersistence);
}

export const db = getFirestore(app);
