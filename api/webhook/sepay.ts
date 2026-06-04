import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  findIntentByMemo,
  fulfillIntentWithTx,
  getSepayWebhookToken,
  hasProcessedTx,
} from "../payment/_shared.js";

function verifyApiKey(req: VercelRequest, secret: string): boolean {
  const authHeader = String(req.headers.authorization || "").trim();

  if (authHeader.toLowerCase().startsWith("apikey ")) {
    return authHeader.slice(7).trim() === secret;
  }

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() === secret;
  }

  return String(req.headers["x-sepay-token"] || "").trim() === secret;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ success: true, message: "SePay webhook endpoint is ready." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const secret = await getSepayWebhookToken();
  if (!secret) {
    return res.status(500).json({ success: false, message: "Server chưa cấu hình SEPAY_WEBHOOK_TOKEN/SEPAY_API_KEY." });
  }

  if (!verifyApiKey(req, secret)) {
    return res.status(401).json({ success: false, message: "Unauthorized webhook API key." });
  }

  try {
    const payload: any = req.body || {};
    const memo = String(payload.content || payload.transaction_content || payload.description || "").trim().toUpperCase();
    const amount = Number(payload.transferAmount || payload.amount || payload.amount_in || 0);
    const sepayTxId = String(payload.id || payload.transaction_id || payload.referenceCode || "").trim();

    if (!memo || !amount || !sepayTxId) {
      return res.status(400).json({ success: false, message: "Webhook thiếu thông tin memo/amount/transaction id." });
    }

    if (await hasProcessedTx(sepayTxId)) {
      return res.status(200).json({ success: true, message: "Transaction đã được xử lý trước đó." });
    }

    let intent = await findIntentByMemo(memo);
    if (!intent) {
      const db = await import("../payment/_shared.js");
      const legacySnap = await db.getDb().collection("payments").where("memo", "==", memo).limit(1).get();
      if (!legacySnap.empty) {
        intent = { id: legacySnap.docs[0].id, ...(legacySnap.docs[0].data() as any) };
      }
    }

    if (!intent) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn chờ xử lý theo memo." });
    }

    if (intent.status === "expired" || intent.status === "canceled") {
      return res.status(400).json({ success: false, message: "Hóa đơn đã hết hạn hoặc đã hủy." });
    }

    if (!intent.userId || !intent.memo || !intent.amountExpected || !intent.days) {
      const amountExpected = Number(intent.amountExpected || intent.amount || 0);
      const days = Number(intent.days || (intent.packType === "1m" ? 30 : intent.packType === "6m" ? 180 : intent.packType === "1y" ? 365 : 0));
      if (!intent.userId || !intent.memo || !amountExpected || !days) {
        return res.status(404).json({ success: false, message: "Dữ liệu hóa đơn không hợp lệ." });
      }
      intent = { ...intent, amountExpected, days };
    }

    if (amount < Number(intent.amountExpected || 0)) {
      return res.status(400).json({ success: false, message: "Số tiền nhận được nhỏ hơn hóa đơn yêu cầu." });
    }

    const upgraded = await fulfillIntentWithTx({
      intent,
      sepayTxId,
      amountReceived: amount,
    });

    return res.status(200).json({
      success: true,
      message: upgraded.alreadyProcessed ? "Hóa đơn đã xử lý trước đó." : "Đã xử lý webhook và nâng cấp VIP thành công.",
      vipExpiry: upgraded.vipExpiry,
    });
  } catch (err: any) {
    console.error("SePay webhook error:", err);
    return res.status(500).json({ success: false, message: "Lỗi xử lý webhook SePay: " + err.message });
  }
}
