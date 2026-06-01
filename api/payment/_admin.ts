import fs from "fs";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function decodeNewlines(value: string) {
  return value.replace(/\\n/g, "\n");
}

function getServiceAccount() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
    return {
      projectId,
      clientEmail,
      privateKey: decodeNewlines(privateKeyRaw),
    };
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    return JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  }

  const localPath = path.join(process.cwd(), "service-account.json");
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, "utf-8"));
  }

  throw new Error("Thiếu cấu hình Firebase Admin credentials (FIREBASE_ADMIN_* hoặc GOOGLE_APPLICATION_CREDENTIALS).");
}

export function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = getServiceAccount();
    initializeApp({ credential: cert(serviceAccount as any) });
  }
  return getFirestore();
}
