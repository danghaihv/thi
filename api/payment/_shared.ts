import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from "firebase/firestore";

export type IntentStatus = "awaiting_payment" | "paid" | "fulfilled" | "expired" | "canceled";

export function getDb() {
  let firebaseConfig: any = {};
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
  } catch {
    firebaseConfig = {};
  }

  const resolvedConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || firebaseConfig.appId,
  };

  if (!resolvedConfig.projectId || !resolvedConfig.apiKey || !resolvedConfig.appId) {
    throw new Error("Firebase env/config chưa đầy đủ trên runtime serverless.");
  }

  const firebaseApp = getApps().length ? getApp() : initializeApp(resolvedConfig);
  return getFirestore(firebaseApp);
}

export function makeIntentId() {
  return `pi_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeMemo(intentId: string) {
  const codePrefix = process.env.PAYMENT_CODE_PREFIX || "HMATH";
  return `${codePrefix}${intentId.slice(-8).toUpperCase()}`;
}

export async function createPaymentIntent(params: { userId: string; planCode: string; amountExpected: number; days: number }) {
  const db = getDb();
  const intentId = makeIntentId();
  const memo = makeMemo(intentId);
  const now = Date.now();
  const expiresAt = new Date(now + 30 * 60 * 1000).toISOString();

  const intent = {
    intentId,
    userId: params.userId,
    planCode: params.planCode,
    amountExpected: Number(params.amountExpected),
    days: Number(params.days),
    currency: "VND",
    memo,
    status: "awaiting_payment" as IntentStatus,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAt,
  };

  await setDoc(doc(db, "payment_intents", intentId), intent);
  return intent;
}

export async function getIntentById(intentId: string) {
  const db = getDb();
  const snap = await getDoc(doc(db, "payment_intents", intentId));
  return snap.exists() ? snap.data() : null;
}

export async function findIntentByMemo(memo: string) {
  const db = getDb();
  const memoUpper = memo.trim().toUpperCase();
  const snap = await getDocs(query(collection(db, "payment_intents"), where("memo", "==", memoUpper)));
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) };
}

export async function hasProcessedTx(sepayTxId: string) {
  if (!sepayTxId) return false;
  const db = getDb();
  const existingByTx = await getDocs(query(collection(db, "payments"), where("sepayTxId", "==", sepayTxId), where("status", "==", "completed")));
  return !existingByTx.empty;
}

export async function fulfillIntentWithTx(params: { intent: any; sepayTxId: string; amountReceived: number }) {
  const db = getDb();
  const intentRef = doc(db, "payment_intents", params.intent.intentId);
  const userRef = doc(db, "users", params.intent.userId);
  const legacyPaymentRef = doc(db, "payments", String(params.intent.memo).toUpperCase());

  return runTransaction(db, async (tx) => {
    const latestIntentSnap = await tx.get(intentRef);
    if (!latestIntentSnap.exists()) throw new Error("Payment intent không tồn tại.");
    const latestIntent: any = latestIntentSnap.data();

    if (latestIntent.status === "fulfilled") {
      return { alreadyProcessed: true, vipExpiry: latestIntent.fulfilledVipExpiry || latestIntent.vipExpiry || "" };
    }

    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("Không tìm thấy thông tin tài khoản học sinh.");
    const userData: any = userSnap.data();

    const currentExpiry = userData.vipExpiry ? new Date(userData.vipExpiry).getTime() : 0;
    const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
    const newExpiryDate = new Date(baseTime + Number(latestIntent.days) * 24 * 60 * 60 * 1000);
    const newExpiryStr = newExpiryDate.toISOString();

    tx.set(userRef, {
      vipExpiry: newExpiryStr,
      vipType: `${Number(latestIntent.days)} ngày`,
      vipUpdatedAt: new Date().toISOString(),
    }, { merge: true });

    tx.set(intentRef, {
      status: "fulfilled",
      paidAt: new Date().toISOString(),
      fulfilledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sepayTxId: params.sepayTxId,
      amountReceived: Number(params.amountReceived),
      fulfilledVipExpiry: newExpiryStr,
    }, { merge: true });

    tx.set(legacyPaymentRef, {
      userId: latestIntent.userId,
      amount: Number(latestIntent.amountExpected),
      days: Number(latestIntent.days),
      status: "completed",
      memo: String(latestIntent.memo).toUpperCase(),
      createdAt: new Date().toISOString(),
      vipExpiry: newExpiryStr,
      sepayTxId: params.sepayTxId,
      intentId: latestIntent.intentId,
    }, { merge: true });

    return { alreadyProcessed: false, vipExpiry: newExpiryStr };
  });
}

export async function getSepayWebhookToken(): Promise<string> {
  const fromEnv = process.env.SEPAY_WEBHOOK_TOKEN || "";
  if (fromEnv) return fromEnv;

  const db = getDb();
  const settingsSnap = await getDoc(doc(db, "settings", "global"));
  return settingsSnap.exists() ? ((settingsSnap.data() as any).sepayWebhookToken || "") : "";
}
