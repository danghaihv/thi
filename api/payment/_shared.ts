import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

function getDb() {
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

export async function applyVipUpgrade({ userId, memo, amount, days, sepayTxId }: { userId: string; memo: string; amount: number; days: number; sepayTxId?: string }) {
  const memoUpper = String(memo).trim().toUpperCase();
  const db = getDb();
  const paymentSnap = await getDoc(doc(db, "payments", memoUpper));
  if (paymentSnap.exists() && paymentSnap.data().status === "completed") {
    return { alreadyProcessed: true, vipExpiry: paymentSnap.data().vipExpiry };
  }

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("Không tìm thấy thông tin tài khoản học sinh.");
  }

  const userData: any = userSnap.data();
  const currentExpiry = userData.vipExpiry ? new Date(userData.vipExpiry).getTime() : 0;
  const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
  const newExpiryDate = new Date(baseTime + Number(days) * 24 * 60 * 60 * 1000);
  const newExpiryStr = newExpiryDate.toISOString();

  await setDoc(userRef, {
    vipExpiry: newExpiryStr,
    vipType: `${Number(days)} ngày`
  }, { merge: true });

  await setDoc(doc(db, "payments", memoUpper), {
    userId,
    userEmail: userData.email || "",
    userName: userData.name || "",
    amount: Number(amount),
    days: Number(days),
    status: "completed",
    memo: memoUpper,
    createdAt: new Date().toISOString(),
    vipExpiry: newExpiryStr,
    sepayTxId: sepayTxId || ""
  }, { merge: true });

  return { alreadyProcessed: false, vipExpiry: newExpiryStr };
}

export async function findPendingPaymentByMemo(memo: string) {
  const memoUpper = memo.trim().toUpperCase();
  const db = getDb();
  const paymentsRef = collection(db, "payments");
  const pendingByMemo = await getDocs(query(paymentsRef, where("memo", "==", memoUpper)));
  if (pendingByMemo.empty) return null;
  return pendingByMemo.docs[0].data() as any;
}

export async function hasProcessedTx(sepayTxId: string) {
  if (!sepayTxId) return false;
  const db = getDb();
  const paymentsRef = collection(db, "payments");
  const existingByTx = await getDocs(query(paymentsRef, where("sepayTxId", "==", sepayTxId), where("status", "==", "completed")));
  return !existingByTx.empty;
}
