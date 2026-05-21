// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Import the Firebase configuration from the config file
import firebaseConfig from "../firebase-applet-config.json";

// Validate config before initialization
const isConfigValid = firebaseConfig && 
                     firebaseConfig.apiKey && 
                     !firebaseConfig.apiKey.includes("remixed-api-key") &&
                     firebaseConfig.projectId && 
                     !firebaseConfig.projectId.includes("remixed-project-id");

let app;
let auth: any;
let db: any;
let googleProvider: any;
let analytics: any = null;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Use the named database if provided, otherwise use the default
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase configuration is missing or invalid. Please set up Firebase using the 'Set up Firebase' tool or manually update firebase-applet-config.json.");
}

export { auth, db, googleProvider, analytics };

// Firestore Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
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
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
