import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
} catch (e) {
  // Config file not present in custom production deployment
}

const resolvedConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || firebaseConfig.appId,
};

const firebaseApp = initializeApp(resolvedConfig);

const hasEnvProjectId = !!(process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID);
const dbId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 
             process.env.FIREBASE_FIRESTORE_DATABASE_ID || 
             (!hasEnvProjectId && firebaseConfig.firestoreDatabaseId ? firebaseConfig.firestoreDatabaseId : undefined);

const db = dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);

// Mock Users
const users = [
  { id: "u_1", email: "admin@hmath.vn", password: "123456", role: "admin", name: "Super Admin" },
  { id: "u_2", email: "teacher@hmath.vn", password: "123456", role: "teacher", name: "Giáo viên Toán" },
  { id: "u_3", email: "student@hmath.vn", password: "123456", role: "student", name: "Học sinh Mẫu" }
];

// Mock Database
const exams = [
  {
    id: "exam-6-1",
    title: "Đề kiểm tra chương 1 Đại số Toán 6",
    grade: 6,
    timeLimit: 45 * 60,
    totalScore: 10,
    config: { shuffleQuestions: true, shuffleOptions: true, showResultAfter: true, antiCheat: true },
    questions: [
       { id: "q_1", content: "Tính giá trị của biểu thức $A = 2^3 + 3^2$", options: ["$17$", "$12$", "$25$", "$15$"], correctAnswer: 0 },
       { id: "q_2", content: "Tìm $x$, biết $2x - 5 = 7$", options: ["$x = 6$", "$x = 1$", "$x = 12$", "$x = 2$"], correctAnswer: 0 }
    ]
  },
  {
    id: "exam-7-1",
    title: "Đề thi giữa kì 1 Toán 7",
    grade: 7,
    timeLimit: 60 * 60,
    totalScore: 10,
    config: { shuffleQuestions: true, shuffleOptions: true, showResultAfter: true, antiCheat: false },
    questions: [
       { id: "q_1", content: "Kết quả phép tính $\\left(\\frac{-1}{2}\\right)^3$ là:", options: ["$-\\frac{1}{6}$", "$\\frac{1}{8}$", "$-\\frac{1}{8}$", "$\\frac{1}{6}$"], correctAnswer: 2 },
       { id: "q_2", content: "Cho hai đường thẳng song song $a$ và $b$, đường thẳng $c$ cắt $a,b$. Hai góc so le trong:", options: ["Bù nhau", "Bằng nhau", "Kề bù", "Phụ nhau"], correctAnswer: 1 }
    ]
  },
  {
    id: "exam-8-1",
    title: "Đề thi học kì 1 Toán 8",
    grade: 8,
    timeLimit: 90 * 60,
    totalScore: 10,
    config: { shuffleQuestions: true, shuffleOptions: true, showResultAfter: true, antiCheat: true },
    questions: [
       { id: "q_1", content: "Khai triển hằng đẳng thức $(x-y)^2$ ta được:", options: ["$x^2 - 2xy + y^2$", "$x^2 + 2xy + y^2$", "$x^2 - y^2$", "$x^2 - 2xy - y^2$"], correctAnswer: 0 },
       { id: "q_2", content: "Tứ giác có 4 góc vuông là:", options: ["Hình thoi", "Hình bình hành", "Hình chữ nhật", "Hình thang cân"], correctAnswer: 2 }
    ]
  },
  {
    id: "exam-9-1",
    title: "Đề kiểm tra 1 tiết Đại số 9",
    grade: 9,
    timeLimit: 45 * 60,
    totalScore: 10,
    config: { shuffleQuestions: true, shuffleOptions: true, showResultAfter: true, antiCheat: true },
    questions: [
       { id: "q_1", content: "Điều kiện xác định của $\\sqrt{2x - 4}$ là:", options: ["$x < 2$", "$x \\le 2$", "$x \\ge 2$", "$x > 2$"], correctAnswer: 2 },
       { id: "q_2", content: "Nghiệm của hệ phương trình $\\begin{cases} x + y = 3 \\\\ x - y = 1 \\end{cases}$ là:", options: ["$(2, 1)$", "$(1, 2)$", "$(3, 0)$", "$(1, -1)$"], correctAnswer: 0 }
    ]
  }
];

const submissions: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware: raw body untuk SePay webhook (HMAC verification)
  // HARUS ở trước express.json() để keep original bytes
  app.post('/api/webhook/sepay', express.raw({ type: '*/*' }), async (req, res) => {
    try {
      const crypto = await import('crypto');
      const mysql = await import('mysql2/promise');
      
      const body = req.body.toString('utf8');
      if (!body) {
        return res.status(400).json({ success: false, message: 'Empty body' });
      }

      // 1. HMAC Verification
      const signature = String(req.headers['x-sepay-signature'] || '').trim();
      const timestamp = Number(req.headers['x-sepay-timestamp'] || 0);
      const secret = process.env.SEPAY_WEBHOOK_SECRET || '';

      if (!signature || !timestamp || !secret) {
        console.error('Missing headers or secret');
        return res.status(400).json({ success: false, message: 'Missing headers' });
      }

      // 2. Chống replay: timestamp max 5 minutes
      const nowSec = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSec - timestamp) > 300) {
        console.warn('Timestamp expired:', timestamp);
        return res.status(401).json({ success: false, message: 'Request expired' });
      }

      // 3. Verify HMAC-SHA256
      const expected = 'sha256=' + crypto.default.createHmac('sha256', secret)
        .update(`${timestamp}.${body}`)
        .digest('hex');

      const sig = Buffer.from(signature);
      const exp = Buffer.from(expected);
      
      if (sig.length !== exp.length || !crypto.default.timingSafeEqual(sig, exp)) {
        console.error('HMAC verification failed');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }

      // 4. Parse JSON
      let data: any;
      try {
        data = JSON.parse(body);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        return res.status(400).json({ success: false, message: 'Invalid JSON' });
      }

      if (!data?.id) {
        console.error('Invalid payload: missing id');
        return res.status(400).json({ success: false, message: 'Invalid payload' });
      }

      // Validate payment code: must start with HMATH prefix
      const paymentCode = String(data.content || data.transaction_content || data.description || '').trim().toUpperCase();
      const codePrefix = process.env.PAYMENT_CODE_PREFIX || 'HMATH';
      
      if (!paymentCode) {
        console.warn('No payment code in transaction content');
        return res.status(400).json({ success: false, message: 'Giao dịch không chứa mã thanh toán' });
      }

      if (!paymentCode.startsWith(codePrefix)) {
        console.warn(`Invalid payment code prefix. Expected: ${codePrefix}, Got: ${paymentCode}`);
        return res.status(400).json({ success: false, message: `Mã thanh toán phải bắt đầu với ${codePrefix}` });
      }

      // 5. MySQL: INSERT IGNORE to prevent duplicates
      const pool = mysql.default.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'sepay_webhook',
      });

      const conn = await pool.getConnection();
      try {
        const [result] = await conn.execute(
          `INSERT IGNORE INTO transactions 
           (sepay_id, gateway, transaction_date, account_number, sub_account,
            code, amount_in, amount_out, accumulated, content, reference_code, body)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.gateway || '',
            data.transactionDate || new Date(),
            data.accountNumber || '',
            data.subAccount || '',
            paymentCode,
            data.transferType === 'in' ? (data.transferAmount || 0) : 0,
            data.transferType === 'out' ? (data.transferAmount || 0) : 0,
            data.accumulated || 0,
            paymentCode,
            data.referenceCode || '',
            body,
          ]
        );

        // Transaction already processed
        if ((result as any).affectedRows === 0) {
          console.log('Transaction already processed:', data.id);
          res.json({ success: true });
          return;
        }

        // Business logic: only on first insert - update orders with matching code
        if (data.transferType === 'in' && paymentCode) {
          const transferAmount = Number(data.transferAmount || 0);
          console.log(`Processing transfer: ${paymentCode}, amount: ${transferAmount}`);
          
          // UPDATE orders if amount sufficient
          const [updateResult] = await conn.execute(
            `UPDATE orders 
             SET status = 'paid', paid_at = NOW()
             WHERE code = ? AND status = 'pending' AND amount <= ?`,
            [paymentCode, transferAmount]
          );

          if ((updateResult as any).affectedRows > 0) {
            console.log(`Order ${paymentCode} marked as paid`);
          }
        }

        console.log(`SePay webhook processed: ${data.id}`);
        res.json({ success: true });
      } finally {
        conn.release();
        pool.end();
      }
    } catch (err) {
      console.error('SePay webhook error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Standard JSON middleware for other routes
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const applyVipUpgrade = async ({ userId, memo, amount, days, sepayTxId }: { userId: string; memo: string; amount: number; days: number; sepayTxId?: string }) => {
    const paymentSnap = await getDoc(doc(db, 'payments', memo));
    if (paymentSnap.exists() && paymentSnap.data().status === 'completed') {
      return { alreadyProcessed: true, vipExpiry: paymentSnap.data().vipExpiry };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error('Không tìm thấy thông tin tài khoản học sinh.');
    }

    const userData = userSnap.data();
    const currentExpiry = userData.vipExpiry ? new Date(userData.vipExpiry).getTime() : 0;
    const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
    const newExpiryDate = new Date(baseTime + days * 24 * 60 * 60 * 1000);
    const newExpiryStr = newExpiryDate.toISOString();

    await setDoc(userRef, {
      vipExpiry: newExpiryStr,
      vipType: `${days} ngày`
    }, { merge: true });

    await setDoc(doc(db, 'payments', memo), {
      userId,
      userEmail: userData.email || '',
      userName: userData.name || '',
      amount: Number(amount),
      days: Number(days),
      status: 'completed',
      memo,
      createdAt: new Date().toISOString(),
      vipExpiry: newExpiryStr,
      sepayTxId: sepayTxId || ''
    }, { merge: true });

    return { alreadyProcessed: false, vipExpiry: newExpiryStr };
  };


  const createPaymentIntent = async (req: any, res: any) => {
    const { userId, packType, planCode } = req.body;
    const effectivePackType = packType || (planCode === 'vip_1m' ? '1m' : planCode === 'vip_6m' ? '6m' : planCode === 'vip_1y' ? '1y' : undefined);
    if (!userId || !effectivePackType) {
      return res.status(400).json({ error: 'Thiếu userId hoặc packType.' });
    }

    const packMap: Record<string, { days: number; amount: number; label: string }> = {
      '1m': { days: 30, amount: 0, label: 'VIP 1 tháng' },
      '6m': { days: 180, amount: 0, label: 'VIP 6 tháng' },
      '1y': { days: 365, amount: 0, label: 'VIP 1 năm' },
    };
    const pack = packMap[effectivePackType];
    if (!pack) {
      return res.status(400).json({ error: 'Gói VIP không hợp lệ.' });
    }

    try {
      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        return res.status(400).json({ error: 'Hệ thống chưa thiết lập cài đặt thanh toán.' });
      }
      const settingsData: any = settingsSnap.data();

      const amount = effectivePackType === '1m'
        ? Number(settingsData.vip1MonthPrice || 50000)
        : effectivePackType === '6m'
          ? Number(settingsData.vip6MonthPrice || 240000)
          : Number(settingsData.vip1YearPrice || 450000);

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return res.status(404).json({ error: 'Không tìm thấy tài khoản học sinh.' });
      }

      const userData: any = userSnap.data();
      const userName = (userData.fullName || userData.name || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20);
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const memo = `HM${userName}${randomCode}`;

      await setDoc(doc(db, 'payments', memo), {
        userId,
        userEmail: userData.email || '',
        userName: userData.name || userData.fullName || '',
        amount,
        days: pack.days,
        packType: effectivePackType,
        label: pack.label,
        memo,
        status: 'pending',
        createdAt: new Date().toISOString(),
        sepayTxId: '',
      }, { merge: true });

      return res.json({
        success: true,
        memo,
        amount,
        days: pack.days,
        label: pack.label,
        bankId: settingsData.sepayBankId || '',
        accountNo: settingsData.sepayAccountNo || '',
        accountName: settingsData.sepayAccountName || '',
      });
    } catch (err: any) {
      console.error('Create payment error:', err);
      return res.status(500).json({ error: 'Lỗi tạo hóa đơn: ' + err.message });
    }
  };

  app.post('/api/payment/create', createPaymentIntent);
  app.post('/api/payment/intents', createPaymentIntent);

  app.get("/api/payment/pricing", async (req, res) => {
    try {
      const settingsRef = doc(db, "settings", "global");
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        return res.json({
          vip1MonthPrice: 50000,
          vip6MonthPrice: 240000,
          vip1YearPrice: 450000,
          sepayBankId: "",
          sepayAccountNo: "",
          sepayAccountName: "",
        });
      }
      const data: any = settingsSnap.data();
      return res.json({
        vip1MonthPrice: Number(data.vip1MonthPrice || 50000),
        vip6MonthPrice: Number(data.vip6MonthPrice || 240000),
        vip1YearPrice: Number(data.vip1YearPrice || 450000),
        sepayBankId: data.sepayBankId || "",
        sepayAccountNo: data.sepayAccountNo || "",
        sepayAccountName: data.sepayAccountName || "",
      });
    } catch (err: any) {
      console.error("Get pricing error:", err);
      return res.status(500).json({ error: "Lỗi lấy cấu hình giá: " + err.message });
    }
  });


  app.post("/api/auth/login", (req, res) => {
     const { email, password } = req.body;
     const user = users.find(u => u.email === email && u.password === password);
     if (user) {
       const uInfo = { ...user };
       delete uInfo.password;
       res.json({ token: "fake-jwt-token-" + user.id, user: uInfo });
     } else {
       res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
     }
  });

  app.post("/api/auth/google", (req, res) => {
     // Mock Google SSO
     const googleUser = {
       id: "u_google_" + Math.random().toString(36).substring(2, 9),
       email: "student.google@gmail.com",
       role: "student",
       name: "Học sinh (Google)"
     };
     res.json({ token: "fake-jwt-token-" + googleUser.id, user: googleUser });
  });

  app.get("/api/exams", (req, res) => {
    // Return summaries without answers
    const summaries = exams.map(e => ({
      id: e.id,
      title: e.title,
      grade: e.grade,
      timeLimit: e.timeLimit,
      questionCount: e.questions.length,
      totalScore: e.totalScore || 10
    }));
    res.json(summaries);
  });

  app.post("/api/exams", (req, res) => {
    const newExam = { ...req.body, id: "exam_" + Math.random().toString(36).substring(2, 9) };
    exams.push(newExam);
    res.json(newExam);
  });

  app.put("/api/exams/:id", (req, res) => {
    const idx = exams.findIndex(e => e.id === req.params.id);
    if (idx !== -1) {
      exams[idx] = { ...exams[idx], ...req.body };
      res.json(exams[idx]);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.delete("/api/exams/:id", (req, res) => {
    const idx = exams.findIndex(e => e.id === req.params.id);
    if (idx !== -1) {
      exams.splice(idx, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.get("/api/exams/:id", (req, res) => {
    const exam = exams.find(e => e.id === req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    
    // Serve exam without correct answers for the test taker
    const safeExam = {
      ...exam,
      questions: exam.questions.map(q => ({
        id: q.id,
        content: q.content,
        options: q.options
      }))
    };
    res.json(safeExam);
  });

  app.post("/api/exams/:id/submit", (req, res) => {
    const examId = req.params.id;
    const { answers, studentName } = req.body;
    
    const exam = exams.find(e => e.id === examId);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    let score = 0;
    const results = exam.questions.map(q => {
      const studentAnswer = answers[q.id];
      const isCorrect = studentAnswer === q.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        isCorrect,
        correctAnswer: q.correctAnswer,
        studentAnswer
      };
    });

    const submission = {
      id: "sub_" + Math.random().toString(36).substring(2, 9),
      examId,
      studentName: studentName || "Anonymous",
      score,
      total: exam.questions.length,
      examTotalScore: exam.totalScore || 10,
      showResultAfter: exam.config?.showResultAfter !== false,
      results,
      submittedAt: new Date().toISOString()
    };
    submissions.push(submission);

    res.json(submission);
  });

  app.get("/api/admin/exams", (req, res) => {
     res.json(exams);
  });

  app.get("/api/admin/submissions", (req, res) => {
     res.json(submissions);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
