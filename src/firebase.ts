import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { UserProfile, UserSettings } from "./types";

// Error wrapper as required by Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error("Firestore Security Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialization
const finalFirebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || firebaseConfig.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfig.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfig.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfig.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfig.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || firebaseConfig.appId,
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || firebaseConfig.measurementId,
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || firebaseConfig.firestoreDatabaseId || "(default)"
};

const app = initializeApp(finalFirebaseConfig);
export const db = finalFirebaseConfig.firestoreDatabaseId && finalFirebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, finalFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth();

// Default Settings
export const DEFAULT_SETTINGS: UserSettings = {
  voiceVolume: 0.8,
  voiceSpeed: 1.0,
  voiceEnabled: true,
  visualTheme: "neon-violet",
  animationsEnabled: true,
};

// Validate Connection on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status (offline fallback enabled).");
    }
  }
}
testConnection();

// Centralized admin verification helper
export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const emailClean = email.trim().toLowerCase();
  const localClean = emailClean.split("@")[0]?.replace(/\./g, "") || "";
  const domainClean = emailClean.split("@")[1] || "";
  const normalized = `${localClean}@${domainClean}`;
  return (
    emailClean === "carlosdelgado.neska@gmail.com" ||
    emailClean === "carlosdelgadoneska@gmail.com" ||
    normalized === "carlosdelgadoneska@gmail.com" ||
    normalized === "carlosdelgadonesca@gmail.com"
  );
}

// Safe profile initialization or loading
export async function loadOrCreateUserProfile(userId: string, email: string, fallbackUsername: string): Promise<UserProfile> {
  const adminEmailMatch = isAdminEmail(email);

  if (userId.startsWith("invitado_")) {
    const localProfile = localStorage.getItem(`guest_profile_${userId}`);
    if (localProfile) {
      const data = JSON.parse(localProfile) as UserProfile;
      const todayStr = new Date().toISOString().split("T")[0];
      const lastResetStr = data.lastActionReset ? data.lastActionReset.split("T")[0] : "";
      if (lastResetStr !== todayStr) {
        data.actionsToday = 0;
        data.lastActionReset = new Date().toISOString();
        localStorage.setItem(`guest_profile_${userId}`, JSON.stringify(data));
      }
      return data;
    } else {
      const newProfile: UserProfile = {
        userId,
        username: fallbackUsername || email.split("@")[0] || "Invitado",
        email: email || "invitado@nexia.bet",
        rank: "plus", // Give Guest access to premium/plus privileges for evaluation!
        registeredAt: new Date().toISOString(),
        actionsToday: 0,
        lastActionReset: new Date().toISOString(),
        settings: DEFAULT_SETTINGS
      };
      localStorage.setItem(`guest_profile_${userId}`, JSON.stringify(newProfile));
      return newProfile;
    }
  }

  const path = `users/${userId}`;
  try {
    const docRef = doc(db, "users", userId);
    const snap = await getDoc(docRef);
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      
      // Update check for matching administrative email
      if (adminEmailMatch) {
        data.rank = "plus";
      }

      // Daily counter reset logic
      const lastResetStr = data.lastActionReset ? data.lastActionReset.split("T")[0] : "";
      if (lastResetStr !== todayStr) {
        // Reset counter
        const updatedProfile = {
          ...data,
          rank: adminEmailMatch ? "plus" : data.rank,
          actionsToday: 0,
          lastActionReset: new Date().toISOString()
        };
        await setDoc(docRef, updatedProfile);
        return updatedProfile;
      } else {
        if (adminEmailMatch && data.rank !== "plus") {
          data.rank = "plus";
          await setDoc(docRef, data);
        }
      }
      return data;
    } else {
      // First time register
      const newProfile: UserProfile = {
        userId,
        username: fallbackUsername || email.split("@")[0],
        email,
        rank: adminEmailMatch ? "plus" : "gratuito", // default starting rank
        registeredAt: new Date().toISOString(),
        actionsToday: 0,
        lastActionReset: new Date().toISOString(),
        settings: DEFAULT_SETTINGS,
        isNewUser: true
      };
      await setDoc(docRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const isOffline = errMsg.includes("offline") || errMsg.includes("unavailable") || errMsg.includes("failed-precondition") || errMsg.includes("network") || errMsg.includes("connection");
    
    if (isOffline) {
      console.warn("Firestore is offline or unreachable. Falling back to LocalStorage for user profile configuration:", error);
      const storageKey = `offline_profile_${userId}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          const profile = JSON.parse(cached) as UserProfile;
          if (adminEmailMatch) {
            profile.rank = "plus";
          }
          return profile;
        } catch {
          // ignore cache parsing error
        }
      }
      
      const fallbackProfile: UserProfile = {
        userId,
        username: fallbackUsername || email.split("@")[0] || "Usuario",
        email,
        rank: adminEmailMatch ? "plus" : "gratuito",
        registeredAt: new Date().toISOString(),
        actionsToday: 0,
        lastActionReset: new Date().toISOString(),
        settings: DEFAULT_SETTINGS
      };
      localStorage.setItem(storageKey, JSON.stringify(fallbackProfile));
      return fallbackProfile;
    }
    
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// User Profile update (settings or username)
export async function updateUserProfileOnDb(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const currentUserEmail = auth.currentUser?.email || "";
  const adminEmailMatch = isAdminEmail(currentUserEmail);

  if (userId.startsWith("invitado_")) {
    const localProfile = localStorage.getItem(`guest_profile_${userId}`);
    if (localProfile) {
      const current = JSON.parse(localProfile);
      const nextData = {
        ...current,
        ...updates,
        rank: current.rank,
        userId: current.userId,
        registeredAt: current.registeredAt
      };
      localStorage.setItem(`guest_profile_${userId}`, JSON.stringify(nextData));
    }
    return;
  }

  const path = `users/${userId}`;
  try {
    const docRef = doc(db, "users", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const current = snap.data();
      const nextData = {
        ...current,
        ...updates,
        // Enforce rank can't be modified by the client profile changes unless admin
        rank: adminEmailMatch ? "plus" : current.rank,
        userId: current.userId,
        registeredAt: current.registeredAt
      };
      await setDoc(docRef, nextData);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const isOffline = errMsg.includes("offline") || errMsg.includes("unavailable") || errMsg.includes("failed-precondition") || errMsg.includes("network") || errMsg.includes("connection");
    
    if (isOffline) {
      console.warn("Firestore is offline or unreachable. Saving updates to LocalStorage for offline profile:", error);
      const storageKey = `offline_profile_${userId}`;
      const cached = localStorage.getItem(storageKey);
      let current: UserProfile;
      if (cached) {
        try {
          current = JSON.parse(cached);
        } catch {
          current = {
            userId,
            username: updates.username || auth.currentUser?.displayName || "Usuario",
            email: currentUserEmail,
            rank: adminEmailMatch ? "plus" : "gratuito",
            registeredAt: new Date().toISOString(),
            actionsToday: 0,
            lastActionReset: new Date().toISOString(),
            settings: DEFAULT_SETTINGS
          };
        }
      } else {
        current = {
          userId,
          username: updates.username || auth.currentUser?.displayName || "Usuario",
          email: currentUserEmail,
          rank: adminEmailMatch ? "plus" : "gratuito",
          registeredAt: new Date().toISOString(),
          actionsToday: 0,
          lastActionReset: new Date().toISOString(),
          settings: DEFAULT_SETTINGS
        };
      }
      
      const nextData = {
        ...current,
        ...updates,
        rank: adminEmailMatch ? "plus" : current.rank,
        userId: current.userId,
        registeredAt: current.registeredAt
      };
      localStorage.setItem(storageKey, JSON.stringify(nextData));
      return;
    }
    
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
