const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('C:\\Users\\Admin\\Downloads\\hmath-exam-firebase-adminsdk-fbsvc-142d414c01.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

(async () => {
  try {
    // Check user vipExpiry
    const userSnap = await db.collection('users').doc('u_3').get();
    console.log('\n=== User u_3 ===');
    console.log(JSON.stringify(userSnap.data(), null, 2));

    // Check payment_intents
    const intentSnap = await db.collection('payment_intents').doc('HMATHHCSINHMUGJP2SX').get();
    console.log('\n=== Payment Intent HMATHHCSINHMUGJP2SX ===');
    console.log(JSON.stringify(intentSnap.data(), null, 2));

    // Check payments document
    const paymentSnap = await db.collection('payments').doc('HMATHHCSINHMUGJP2SX').get();
    console.log('\n=== Payment HMATHHCSINHMUGJP2SX ===');
    console.log(JSON.stringify(paymentSnap.data(), null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
