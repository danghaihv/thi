import type { VercelRequest, VercelResponse } from "@vercel/node";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "./_shared";

const PACK_CONFIG: Record<string, { days: number; label: string }> = {
  "1m": { days: 30, label: "VIP 1 tháng" },
  "6m": { days: 180, label: "VIP 6 tháng" },
  "1y": { days: 365, label: "VIP 1 năm" },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, packType } = req.body || {};
  if (!userId || !packType) {
    return res.status(400).json({ error: "Thiếu userId hoặc packType." });
  }

  const pack = PACK_CONFIG[packType];
  if (!pack) {
    return res.status(400).json({ error: "Gói VIP không hợp lệ." });
  }

  try {
    const db = getDb();
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
    const safeName = (userData.fullName || userData.name || "USER")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 20);
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const memo = `HM${safeName}${randomCode}`;

    const { setDoc } = await import("firebase/firestore");
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
}