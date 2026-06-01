import type { VercelRequest, VercelResponse } from "@vercel/node";
import { doc, getDoc } from "firebase/firestore";
import { findIntentByMemo, fulfillIntentWithTx } from "./_shared";
import { getDb } from "./_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, memo, amount, days } = req.body || {};
  if (!userId || !memo || !amount || !days) {
    return res.status(400).json({ error: "Thiếu thông tin yêu cầu thanh toán." });
  }

  // Validate payment code: must start with HMATH prefix
  const cleanMemo = String(memo).trim().toUpperCase();
  const codePrefix = process.env.PAYMENT_CODE_PREFIX || "HMATH";
  
  if (!cleanMemo.startsWith(codePrefix)) {
    console.warn(`Invalid payment code prefix. Expected: ${codePrefix}, Got: ${cleanMemo}`);
    return res.status(400).json({ error: `Mã thanh toán phải bắt đầu với tiền tố ${codePrefix}.` });
  }

  try {
    const db = getDb();
    const settingsSnap = await getDoc(doc(db, "settings", "global"));
    if (!settingsSnap.exists()) {
      return res.status(400).json({ error: "Hệ thống chưa thiết lập cài đặt thanh toán." });
    }

    const settingsData: any = settingsSnap.data();
    const apiKey = settingsData.sepayApiKey;
    if (!apiKey) {
      return res.status(400).json({ error: "Giáo viên chưa kết nối cổng SePay API." });
    }

    const response = await fetch("https://apiquery.sepay.vn/transactions/list", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SePay verify response error:", response.status, errorText);
      return res.status(500).json({ error: "Không thể kết nối cổng SePay. Mã lỗi: " + response.status });
    }

    let rawData: any;
    try {
      rawData = await response.json();
    } catch (parseErr: any) {
      console.error("Failed to parse SePay response:", parseErr);
      return res.status(500).json({ error: "Lỗi phân tích dữ liệu từ SePay" });
    }

    if (rawData.error || rawData.status === 'error') {
      console.error("SePay API error:", rawData);
      return res.status(500).json({ error: "Lỗi từ API SePay: " + (rawData.message || rawData.error) });
    }

    const transactions = Array.isArray(rawData.transactions) ? rawData.transactions : [];
    if (transactions.length === 0) {
      console.warn("No transactions found from SePay");
      return res.json({
        success: false,
        message: "Chưa nhận được giao dịch chuyển khoản tương thích. Vui lòng đảm bảo bạn điền đúng nội dung và số tiền, sau đó thử kiểm tra lại."
      });
    }

    const cleanMemo = String(memo).trim().toUpperCase();
    const expectedAmount = Number(amount);
    const matchingTx = transactions.find((tx: any) => {
      const txContent = (tx.transaction_content || "").toUpperCase();
      const txAmount = Number(tx.amount_in || 0);
      return txContent.includes(cleanMemo) && txAmount >= expectedAmount;
    });

    if (!matchingTx) {
      return res.json({
        success: false,
        message: "Chưa nhận được giao dịch chuyển khoản tương thích. Vui lòng đảm bảo bạn điền đúng nội dung và số tiền, sau đó thử kiểm tra lại."
      });
    }

    const intent = await findIntentByMemo(cleanMemo);
    if (!intent) {
      return res.status(404).json({ error: "Không tìm thấy payment intent cho mã thanh toán này." });
    }

    const upgraded = await fulfillIntentWithTx({
      intent,
      sepayTxId: matchingTx.id ? String(matchingTx.id) : "",
      amountReceived: Number(matchingTx.amount_in || amount),
    });

    return res.json({
      success: true,
      message: upgraded.alreadyProcessed ? "Hóa đơn này đã được xử lý thành công trước đó." : "Thanh toán thành công! Tài khoản đã được nâng cấp VIP.",
      vipExpiry: upgraded.vipExpiry,
      intentId: intent.intentId,
    });
  } catch (err: any) {
    console.error("Verify endpoint error:", err);
    return res.status(500).json({ error: "Lỗi hệ thống đối soát thanh toán: " + err.message });
  }
}
