import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyVipUpgrade, findPendingPaymentByMemo, hasProcessedTx } from "../_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ success: true, message: "SePay webhook endpoint is ready." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const token = process.env.SEPAY_WEBHOOK_TOKEN;
  if (!token) {
    return res.status(500).json({ success: false, message: "Server chưa cấu hình SEPAY_WEBHOOK_TOKEN." });
  }

  const authHeader = String(req.headers.authorization || "");
  const requestToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : String(req.headers["x-sepay-token"] || "").trim();

  if (requestToken !== token) {
    return res.status(401).json({ success: false, message: "Unauthorized webhook token." });
  }

  try {
    const payload: any = req.body || {};
    const memo = String(payload.content || payload.transaction_content || payload.description || "").trim();
    const amount = Number(payload.transferAmount || payload.amount || payload.amount_in || 0);
    const sepayTxId = String(payload.id || payload.transaction_id || payload.referenceCode || "").trim();

    if (!memo || !amount || !sepayTxId) {
      return res.status(400).json({ success: false, message: "Webhook thiếu thông tin memo/amount/transaction id." });
    }

    const alreadyProcessed = await hasProcessedTx(sepayTxId);
    if (alreadyProcessed) {
      return res.status(200).json({ success: true, message: "Transaction đã được xử lý trước đó." });
    }

    const pendingPayment = await findPendingPaymentByMemo(memo);
    if (!pendingPayment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn chờ xử lý theo memo." });
    }

    if (Number(amount) < Number(pendingPayment.amount || 0)) {
      return res.status(400).json({ success: false, message: "Số tiền nhận được nhỏ hơn hóa đơn yêu cầu." });
    }

    const upgraded = await applyVipUpgrade({
      userId: String(pendingPayment.userId),
      memo: String(pendingPayment.memo),
      amount: Number(pendingPayment.amount),
      days: Number(pendingPayment.days),
      sepayTxId
    });

    return res.status(200).json({
      success: true,
      message: upgraded.alreadyProcessed ? "Hóa đơn đã xử lý trước đó." : "Đã xử lý webhook và nâng cấp VIP thành công.",
      vipExpiry: upgraded.vipExpiry
    });
  } catch (err: any) {
    console.error("SePay webhook error:", err);
    return res.status(500).json({ success: false, message: "Lỗi xử lý webhook SePay: " + err.message });
  }
}
