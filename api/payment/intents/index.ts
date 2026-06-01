import type { VercelRequest, VercelResponse } from "@vercel/node";
import { doc, getDoc } from "firebase/firestore";
import { createPaymentIntent, getDb } from "../_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, planCode } = req.body || {};
  if (!userId || !planCode) {
    return res.status(400).json({ error: "Thiếu userId hoặc planCode." });
  }

  try {
    const db = getDb();
    const settingsSnap = await getDoc(doc(db, "settings", "global"));
    if (!settingsSnap.exists()) return res.status(400).json({ error: "Hệ thống chưa thiết lập cài đặt thanh toán." });

    const settings: any = settingsSnap.data();
    const plans: Record<string, { days: number; amount: number; label: string }> = {
      vip_1m: { days: 30, amount: Number(settings.vip1MonthPrice || 50000), label: "VIP 1 tháng" },
      vip_6m: { days: 180, amount: Number(settings.vip6MonthPrice || 240000), label: "VIP 6 tháng" },
      vip_1y: { days: 365, amount: Number(settings.vip1YearPrice || 450000), label: "VIP 1 năm" },
    };

    const selected = plans[String(planCode)] || plans.vip_1m;
    const intent = await createPaymentIntent({
      userId: String(userId),
      planCode: String(planCode),
      amountExpected: selected.amount,
      days: selected.days,
    });

    return res.status(200).json({
      success: true,
      intentId: intent.intentId,
      memo: intent.memo,
      amount: selected.amount,
      days: selected.days,
      label: selected.label,
      expiresAt: intent.expiresAt,
      bankId: settings.sepayBankId || "",
      accountNo: settings.sepayAccountNo || "",
      accountName: settings.sepayAccountName || "",
    });
  } catch (err: any) {
    console.error("Create intent error:", err);
    return res.status(500).json({ error: "Không thể tạo payment intent: " + err.message });
  }
}
