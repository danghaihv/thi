import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPaymentIntent, getDb } from "./_shared.js";

const PACK_CONFIG: Record<string, { days: number; label: string }> = {
  "1m": { days: 30, label: "VIP 1 tháng" },
  "6m": { days: 180, label: "VIP 6 tháng" },
  "1y": { days: 365, label: "VIP 1 năm" },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, packType, planCode } = req.body || {};
  const normalizedPackType = String(packType || (planCode === "vip_6m" ? "6m" : planCode === "vip_1y" ? "1y" : "1m"));
  if (!userId || !normalizedPackType) {
    return res.status(400).json({ error: "Thiếu userId hoặc packType/planCode." });
  }

  const pack = PACK_CONFIG[normalizedPackType];
  if (!pack) {
    return res.status(400).json({ error: "Gói VIP không hợp lệ." });
  }

  try {
    const db = getDb();
    const settingsSnap = await db.collection("settings").doc("global").get();
    if (!settingsSnap.exists) {
      return res.status(400).json({ error: "Hệ thống chưa thiết lập cài đặt thanh toán." });
    }
    const settingsData: any = settingsSnap.data();

    if (!settingsData.sepayApiKey) {
      return res.status(400).json({ error: "Giáo viên chưa kết nối cổng SePay API." });
    }

    const amount = normalizedPackType === "1m"
      ? Number(settingsData.vip1MonthPrice || 50000)
      : normalizedPackType === "6m"
      ? Number(settingsData.vip6MonthPrice || 240000)
      : Number(settingsData.vip1YearPrice || 450000);

    const originalPackType = normalizedPackType;

    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản học sinh." });
    }

    const userData: any = userSnap.data();
    const safeName = (userData.fullName || userData.name || "USER")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 20);
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const codePrefix = process.env.PAYMENT_CODE_PREFIX || "HMATH";
    const memo = `${codePrefix}${safeName}${randomCode}`;

    const intent = await createPaymentIntent({
      userId,
      planCode: originalPackType === "1m" ? "vip_1m" : originalPackType === "6m" ? "vip_6m" : "vip_1y",
      amountExpected: amount,
      days: pack.days,
    });

    return res.json({
      success: true,
      intentId: intent.intentId,
      memo: intent.memo,
      paymentMemo: intent.memo,
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