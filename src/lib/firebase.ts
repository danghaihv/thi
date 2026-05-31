import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Use Environment Variables (like on Vercel) as priority, fallback to firebase-applet-config.json
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const app = initializeApp(firebaseConfig);

// Only use firestoreDatabaseId if we are running in the local AI Studio sandbox environment.
// In external environments (like Vercel), if the user has customized the project ID, they will usually
// want the (default) database unless they specify a database ID.
const hasEnvConfig = !!metaEnv.VITE_FIREBASE_PROJECT_ID;
const dbId = metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('Auth persistence enabled'))
  .catch((err) => console.warn('Could not enable auth persistence:', err));

// Enable Firestore offline persistence
enableIndexedDbPersistence(db)
  .then(() => console.log('Firestore persistence enabled'))
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported on this browser');
    }
  });

// Sync localStorage user with Firebase auth state
onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    const localUser = localStorage.getItem('hmath_user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      // Update user with Firebase auth info
      localStorage.setItem('hmath_user', JSON.stringify({
        ...userData,
        uid: firebaseUser.uid
      }));
    }
  }
});

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
