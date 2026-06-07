import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getIntentById, getDb } from "./_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { intentId, memo } = req.query;

  if (!intentId && !memo) {
    return res.status(400).json({ error: "Thiếu intentId hoặc memo." });
  }

  try {
    const db = getDb();
    
    let intent = null;
    
    // Tìm bằng intentId
    if (intentId) {
      intent = await getIntentById(String(intentId));
    }
    
    // Nếu không tìm thấy, tìm bằng memo
    if (!intent && memo) {
      const memoSnap = await db.collection("payment_intents")
        .where("memo", "==", String(memo).toUpperCase())
        .limit(1)
        .get();
      
      if (!memoSnap.empty) {
        const doc = memoSnap.docs[0];
        intent = { id: doc.id, ...doc.data() };
      }
    }
    
    if (!intent) {
      return res.status(404).json({ error: "Không tìm thấy hóa đơn." });
    }
    
    return res.status(200).json({
      success: true,
      intent: {
        id: intent.id || intent.intentId,
        status: intent.status,
        memo: intent.memo,
        amount: intent.amountExpected || intent.amount,
        days: intent.days,
        createdAt: intent.createdAt,
        fulfilledAt: intent.fulfilledAt,
        vipExpiry: intent.fulfilledVipExpiry || intent.vipExpiry,
      }
    });
  } catch (err: any) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra hóa đơn: " + err.message });
  }
}
