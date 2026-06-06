// Shared helpers for Vercel payment endpoints

async function initAdmin() {
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps || admin.apps.length === 0) {
      if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
        const sa = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(sa) });
      } else {
        admin.initializeApp();
      }
    }
    return admin;
  } catch (e) {
    console.error('firebase-admin init error:', e && e.message);
    throw e;
  }
}

export function getDb() {
  // initialize lazily
  if ((globalThis || global).___SHARED_FIRESTORE_DB) return (globalThis || global).___SHARED_FIRESTORE_DB;
  const adminPromise = initAdmin();
  // store a promise-returning placeholder
  (globalThis || global).___SHARED_FIRESTORE_DB = {
    _init: adminPromise.then(a => a.firestore())
  };
  return (globalThis || global).___SHARED_FIRESTORE_DB;
}

async function resolveDb() {
  const g = (globalThis || global);
  if (!g.___SHARED_FIRESTORE_DB) {
    const dbWrapper = getDb();
    return (await dbWrapper._init);
  }
  const wrapper = g.___SHARED_FIRESTORE_DB;
  if (wrapper && wrapper._init) return (await wrapper._init);
  return wrapper;
}

export async function createPaymentIntent({ userId, planCode, amountExpected, days }) {
  const db = await resolveDb();
  if (!db) throw new Error('Firestore not initialized');

  const userSnap = await db.collection('users').doc(String(userId)).get();
  if (!userSnap.exists) throw new Error('Không tìm thấy tài khoản học sinh.');

  const userData = userSnap.data() || {};
  const safeName = String(userData.fullName || userData.name || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20);
  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const prefix = process.env.PAYMENT_CODE_PREFIX || 'HMATH';
  const memo = `${prefix}${safeName}${randomCode}`;

  await db.collection('payments').doc(memo).set({
    userId: String(userId),
    userEmail: userData.email || '',
    userName: userData.fullName || userData.name || '',
    amount: Number(amountExpected || 0),
    days: Number(days || 0),
    planCode: planCode || '',
    memo,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  return { intentId: memo, memo, expiresAt: null };
}

export async function getIntentById(intentId) {
  const db = await resolveDb();
  if (!db) return null;
  const snap = await db.collection('payments').doc(String(intentId)).get();
  if (!snap.exists) return null;
  return snap.data();
}
