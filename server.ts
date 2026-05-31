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

  app.post("/api/payment/verify", async (req, res) => {
    const { userId, memo, amount, days } = req.body;
    if (!userId || !memo || !amount || !days) {
      return res.status(400).json({ error: "Thiếu thông tin yêu cầu thanh toán." });
    }

    try {
      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        return res.status(400).json({ error: "Hệ thống chưa thiết lập cài đặt thanh toán." });
      }

      const settingsData = settingsSnap.data();
      const apiKey = settingsData.sepayApiKey;
      if (!apiKey) {
        return res.status(400).json({ error: "Giáo viên chưa kết nối cổng SePay API." });
      }

      const response = await fetch("https://apiquery.sepay.vn/transactions/list", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("SePay verify response error:", response.status, errorText);
        return res.status(500).json({ error: "Không thể kết nối cổng SePay. Mã lỗi: " + response.status });
      }

      const rawData: any = await response.json();
      const transactions = rawData.transactions || [];
      const cleanMemo = String(memo).trim().toUpperCase();
      const matchingTx = transactions.find((tx: any) => {
        const txContent = (tx.transaction_content || '').toUpperCase();
        const txAmount = Number(tx.amount_in || 0);
        return txContent.includes(cleanMemo) && txAmount >= Number(amount);
      });

      if (!matchingTx) {
        return res.json({
          success: false,
          message: "Chưa nhận được giao dịch chuyển khoản tương thích. Vui lòng đảm bảo bạn điền đúng nội dung và số tiền, sau đó thử kiểm tra lại."
        });
      }

      const upgraded = await applyVipUpgrade({
        userId,
        memo,
        amount: Number(amount),
        days: Number(days),
        sepayTxId: matchingTx.id ? String(matchingTx.id) : ''
      });

      return res.json({
        success: true,
        message: upgraded.alreadyProcessed ? "Hóa đơn này đã được xử lý thành công trước đó." : "Thanh toán thành công! Tài khoản đã được nâng cấp VIP.",
        vipExpiry: upgraded.vipExpiry
      });
    } catch (err: any) {
      console.error("Verify endpoint error:", err);
      return res.status(500).json({ error: "Lỗi hệ thống đối soát thanh toán: " + err.message });
    }
  });

  app.post("/api/payment/webhook/sepay", async (req, res) => {
    const settingsSnap = await getDoc(doc(db, "settings", "global"));
    const token = settingsSnap.exists() ? (settingsSnap.data() as any).sepayWebhookToken : "";
    if (!token) {
      return res.status(500).json({ success: false, message: "Server chưa cấu hình SEPAY_WEBHOOK_TOKEN." });
    }

    const authHeader = String(req.headers.authorization || '');
    const requestToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : String(req.headers['x-sepay-token'] || '');
    if (requestToken !== token) {
      return res.status(401).json({ success: false, message: "Unauthorized webhook token." });
    }

    try {
      const payload: any = req.body || {};
      const memo = String(payload.content || payload.transaction_content || payload.description || '').trim();
      const amount = Number(payload.transferAmount || payload.amount || payload.amount_in || 0);
      const sepayTxId = String(payload.id || payload.transaction_id || payload.referenceCode || '');

      if (!memo || !amount || !sepayTxId) {
        return res.status(400).json({ success: false, message: "Webhook thiếu thông tin memo/amount/transaction id." });
      }

      const memoUpper = memo.toUpperCase();
      const paymentsRef = collection(db, 'payments');
      const pendingByMemo = await getDocs(query(paymentsRef, where('memo', '==', memoUpper)));
      const existingByTx = await getDocs(query(paymentsRef, where('sepayTxId', '==', sepayTxId), where('status', '==', 'completed')));

      if (!existingByTx.empty) {
        return res.json({ success: true, message: "Transaction đã được xử lý trước đó." });
      }

      if (pendingByMemo.empty) {
        return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn chờ xử lý theo memo." });
      }

      const paymentDoc = pendingByMemo.docs[0];
      const paymentData: any = paymentDoc.data();

      if (Number(amount) < Number(paymentData.amount || 0)) {
        return res.status(400).json({ success: false, message: "Số tiền nhận được nhỏ hơn hóa đơn yêu cầu." });
      }

      const upgraded = await applyVipUpgrade({
        userId: paymentData.userId,
        memo: paymentData.memo,
        amount: Number(paymentData.amount),
        days: Number(paymentData.days),
        sepayTxId
      });

      return res.json({
        success: true,
        message: upgraded.alreadyProcessed ? "Hóa đơn đã xử lý trước đó." : "Đã xử lý webhook và nâng cấp VIP thành công.",
        vipExpiry: upgraded.vipExpiry
      });
    } catch (err: any) {
      console.error("SePay webhook error:", err);
      return res.status(500).json({ success: false, message: "Lỗi xử lý webhook SePay: " + err.message });
    }
  });

  app.get("/api/payment/webhook/sepay", (req, res) => {
    res.json({ success: true, message: "SePay webhook endpoint is ready." });
  });

  app.post("/api/payment/create", async (req, res) => {
    const { userId, packType } = req.body;
    if (!userId || !packType) {
      return res.status(400).json({ error: "Thiếu userId hoặc packType." });
    }

    const packMap: Record<string, { days: number; amount: number; label: string }> = {
      "1m": { days: 30, amount: 0, label: "VIP 1 tháng" },
      "6m": { days: 180, amount: 0, label: "VIP 6 tháng" },
      "1y": { days: 365, amount: 0, label: "VIP 1 năm" },
    };
    const pack = packMap[packType];
    if (!pack) {
      return res.status(400).json({ error: "Gói VIP không hợp lệ." });
    }

    try {
      const settingsRef = doc(db, "settings", "global");
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        return res.status(400).json({ error: "Hệ thống chưa thiết lập cài đặt thanh toán." });
      }
      const settingsData: any = settingsSnap.data();

      if (!settingsData.sepayApiKey) {
        return res.status(400).json({ error: "Giáo viên chưa kết nối cổng SePay API." });
      }

      const amount = packType === "1m"
        ? Number(settingsData.vip1MonthPrice || 50000)
        : packType === "6m"
        ? Number(settingsData.vip6MonthPrice || 240000)
        : Number(settingsData.vip1YearPrice || 450000);

      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return res.status(404).json({ error: "Không tìm thấy tài khoản học sinh." });
      }

      const userData: any = userSnap.data();
      const userName = (userData.fullName || userData.name || "USER").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 20);
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const memo = `HM${userName}${randomCode}`;

      await setDoc(doc(db, "payments", memo), {
        userId,
        userEmail: userData.email || "",
        userName: userData.name || userData.fullName || "",
        amount,
        days: pack.days,
        packType,
        label: pack.label,
        memo,
        status: "pending",
        createdAt: new Date().toISOString(),
        sepayTxId: "",
      }, { merge: true });

      return res.json({
        success: true,
        memo,
        amount,
        days: pack.days,
        label: pack.label,
        bankId: settingsData.sepayBankId || "",
        accountNo: settingsData.sepayAccountNo || "",
        accountName: settingsData.sepayAccountName || "",
      });
    } catch (err: any) {
      console.error("Create payment error:", err);
      return res.status(500).json({ error: "Lỗi tạo hóa đơn: " + err.message });
    }
  });

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
