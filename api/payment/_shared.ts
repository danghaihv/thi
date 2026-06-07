import { getAdminDb } from "./_admin.js";

export type IntentStatus = "awaiting_payment" | "paid" | "fulfilled" | "expired" | "canceled";

export function getDb() {
  return getAdminDb();
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

  await db.collection("payment_intents").doc(intentId).set(intent);
  return intent;
}

export async function getIntentById(intentId: string) {
  const db = getDb();
  const snap = await db.collection("payment_intents").doc(intentId).get();
  return snap.exists ? snap.data() : null;
}

export async function findIntentByMemo(memo: string) {
  const db = getDb();
  const memoUpper = memo.trim().toUpperCase();
  const snap = await db.collection("payment_intents").where("memo", "==", memoUpper).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) };
}

export async function hasProcessedTx(sepayTxId: string) {
  if (!sepayTxId) return false;
  const db = getDb();
  
  // Kiểm tra trong payment_intents
  const intentByTx = await db.collection("payment_intents")
    .where("sepayTxId", "==", sepayTxId)
    .limit(1)
    .get();
  if (!intentByTx.empty) return true;
  
  // Kiểm tra trong payments (legacy)
  const existingByTx = await db.collection("payments")
    .where("sepayTxId", "==", sepayTxId)
    .limit(1)
    .get();
  return !existingByTx.empty;
}

export async function fulfillIntentWithTx(params: { intent: any; sepayTxId: string; amountReceived: number }) {
  const db = getDb();
  const intentRef = db.collection("payment_intents").doc(params.intent.intentId);
  const userRef = db.collection("users").doc(params.intent.userId);
  const legacyPaymentRef = db.collection("payments").doc(String(params.intent.memo).toUpperCase());

  return db.runTransaction(async (tx) => {
    const latestIntentSnap = await tx.get(intentRef);
    if (!latestIntentSnap.exists) throw new Error("Payment intent không tồn tại.");
    const latestIntent: any = latestIntentSnap.data();

    if (latestIntent.status === "fulfilled") {
      return { alreadyProcessed: true, vipExpiry: latestIntent.fulfilledVipExpiry || latestIntent.vipExpiry || "" };
    }

    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("Không tìm thấy thông tin tài khoản học sinh.");
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
  const fromEnv = process.env.SEPAY_WEBHOOK_TOKEN || process.env.SEPAY_API_KEY || "";
  if (fromEnv) return fromEnv;

  const db = getDb();
  const settingsSnap = await db.collection("settings").doc("global").get();
  if (!settingsSnap.exists) return "";
  const settings: any = settingsSnap.data();
  return settings.sepayWebhookToken || settings.sepayApiKey || "";
}
