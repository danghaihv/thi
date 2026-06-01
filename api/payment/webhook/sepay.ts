import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { findIntentByMemo, fulfillIntentWithTx, hasProcessedTx } from "../_shared";
import { getSepayWebhookToken } from "../_shared";

function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyHmac(req: VercelRequest, secret: string): boolean {
  const signature = String(req.headers["x-sepay-signature"] || "").trim();
  const timestamp = String(req.headers["x-sepay-timestamp"] || "").trim();
  if (!signature || !timestamp) return false;

  const variants = [
    typeof req.body === "object" ? JSON.stringify(req.body) : String(req.body || ""),
    typeof req.body === "object" ? stableStringify(req.body) : String(req.body || ""),
  ];

  for (const bodyVariant of variants) {
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(`${timestamp}.${bodyVariant}`).digest("hex");
    if (safeEqual(signature, expected)) return true;
  }

  return false;
}]}{

function verifyLegacyToken(req: VercelRequest, secret: string): boolean {
  const authHeader = String(req.headers.authorization || "").trim();

  // SePay API Key mode often sends: Authorization: Apikey <token>
  if (authHeader.toLowerCase().startsWith("apikey ")) {
    const requestToken = authHeader.slice(7).trim();
    return requestToken === secret;
  }

  if (authHeader.startsWith("Bearer ")) {
    const requestToken = authHeader.slice(7).trim();
    return requestToken === secret;
  }

  const xToken = String(req.headers["x-sepay-token"] || "").trim();
  return xToken === secret;
}]}{

function isFreshTimestamp(req: VercelRequest): boolean {
  const raw = req.headers["x-sepay-timestamp"];
  if (raw === undefined || raw === null || String(raw).trim() === "") return true;
  const ts = Number(raw);
  if (!ts) return true;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) <= 300;
}]}{

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ success: true, message: "SePay webhook endpoint is ready." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const secret = await getSepayWebhookToken();
  if (!secret) {
    return res.status(500).json({ success: false, message: "Server chưa cấu hình SEPAY_WEBHOOK_TOKEN." });
  }

  if (!isFreshTimestamp(req)) {
    return res.status(401).json({ success: false, message: "Webhook timestamp quá hạn." });
  }

  const authorized = verifyHmac(req, secret) || verifyLegacyToken(req, secret);
  if (!authorized) {
    return res.status(401).json({ success: false, message: "Unauthorized webhook signature/token." });
  }

  try {
    const payload: any = req.body || {};
    const memo = String(payload.content || payload.transaction_content || payload.description || "").trim().toUpperCase();
    const amount = Number(payload.transferAmount || payload.amount || payload.amount_in || 0);
    const sepayTxId = String(payload.id || payload.transaction_id || payload.referenceCode || "").trim();
    if (!memo || !amount || !sepayTxId) {
      console.error("Webhook missing data:", { memo, amount, sepayTxId });
      return res.status(400).json({ success: false, message: "Webhook thiếu thông tin memo/amount/transaction id." });
    }

    console.log("Webhook received", {
      sepayTxId,
      memo,
      amount,
      ts: req.headers["x-sepay-timestamp"] || null,
    });

    const alreadyProcessed = await hasProcessedTx(sepayTxId);
    if (alreadyProcessed) {
      console.log("Transaction already processed:", sepayTxId);
      return res.status(200).json({ success: true, message: "Transaction đã được xử lý trước đó." });
    }

    const intent = await findIntentByMemo(memo);
    if (!intent) {
      console.warn("No payment intent found for memo:", memo);
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn chờ xử lý theo memo." });
    }

    console.log("Intent matched", {
      intentId: intent.intentId,
      intentMemo: intent.memo,
      intentAmount: intent.amountExpected,
      intentStatus: intent.status,
    });

    if (intent.status === 'expired' || intent.status === 'canceled') {
      return res.status(400).json({ success: false, message: "Hóa đơn đã hết hạn hoặc đã hủy." });
    }

    if (!intent.userId || !intent.memo || !intent.amountExpected || !intent.days) {
      return res.status(404).json({ success: false, message: "Dữ liệu hóa đơn không hợp lệ." });
    }

    if (Number(amount) < Number(intent.amountExpected || 0)) {
      console.warn(`Amount mismatch. Received: ${amount}, Expected: ${intent.amountExpected}`);
      return res.status(400).json({ success: false, message: "Số tiền nhận được nhỏ hơn hóa đơn yêu cầu." });
    }

    const upgraded = await fulfillIntentWithTx({
      intent,
      sepayTxId,
      amountReceived: Number(amount),
    });
    console.log(`Successfully upgraded VIP for user ${intent.userId}, expires: ${upgraded.vipExpiry}`);
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
