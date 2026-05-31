import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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

  app.post("/api/payment/verify", async (req, res) => {
    const { userId, memo, amount, days } = req.body;
    if (!userId || !memo || !amount || !days) {
      return res.status(400).json({ error: "Thiếu thông tin yêu cầu thanh toán." });
    }

    try {
      // 1. Load SePay CONFIG from settings/global
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

      // Check if this payment is already processed in history to avoid cheating
      const paymentSnap = await getDoc(doc(db, 'payments', memo));
      if (paymentSnap.exists() && paymentSnap.data().status === 'completed') {
        return res.json({ success: true, message: "Hóa đơn này đã được xử lý thành công trước đó.", vipExpiry: paymentSnap.data().vipExpiry });
      }

      // 2. Fetch transaction history from SePay
      const response = await fetch("https://apiquery.sepay.vn/transactions/list", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("SePay Response Error:", errorText);
        return res.status(500).json({ error: "Không thể kết nối cổng SePay. Mã lỗi: " + response.status });
      }

      const rawData: any = await response.json();
      const transactions = rawData.transactions || [];

      // 3. Scan transactions
      const cleanMemo = memo.trim().toUpperCase();
      const matchingTx = transactions.find((tx: any) => {
        const txContent = (tx.transaction_content || '').toUpperCase();
        const txAmount = Number(tx.amount_in || 0);
        return txContent.includes(cleanMemo) && txAmount >= Number(amount);
      });

      if (matchingTx) {
        // Upgrade User!
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          return res.status(404).json({ error: "Không tìm thấy thông tin tài khoản học sinh." });
        }

        const userData = userSnap.data();
        const currentExpiry = userData.vipExpiry ? new Date(userData.vipExpiry).getTime() : 0;
        const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
        const newExpiryDate = new Date(baseTime + days * 24 * 60 * 60 * 1000);
        const newExpiryStr = newExpiryDate.toISOString();

        // Update user database
        await setDoc(userRef, {
          vipExpiry: newExpiryStr,
          vipType: `${days} ngày`
        }, { merge: true });

        // Record payment log
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
          sepayTxId: matchingTx.id || ''
        });

        return res.json({
          success: true,
          message: "Thanh toán thành công! Tài khoản đã được nâng cấp VIP.",
          vipExpiry: newExpiryStr
        });
      } else {
        return res.json({
          success: false,
          message: "Chưa nhận được giao dịch chuyển khoản tương thích. Vui lòng đảm bảo bạn điền đúng nội dung và số tiền, sau đó thử kiểm tra lại."
        });
      }
    } catch (err: any) {
      console.error("Verify endpoint error:", err);
      return res.status(500).json({ error: "Lỗi hệ thống đối soát thanh toán: " + err.message });
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
