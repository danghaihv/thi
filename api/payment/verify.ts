import type { VercelRequest, VercelResponse } from "@vercel/node";
import { doc, getDoc } from "firebase/firestore";
import { applyVipUpgrade } from "./_shared";
import { getDb } from "./_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, memo, amount, days } = req.body || {};
  if (!userId || !memo || !amount || !days) {
    return res.status(400).json({ error: "Thiếu thông tin yêu cầu thanh toán." });
  }

  try {
    const db = getDb();
    const settingsRef = doc(db, "settings", "global");
    const settingsSnap = await getDoc(settingsRef);
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

    const rawData: any = await response.json();
    const transactions = rawData.transactions || [];
    const cleanMemo = String(memo).trim().toUpperCase();
    const matchingTx = transactions.find((tx: any) => {
      const txContent = (tx.transaction_content || "").toUpperCase();
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
      userId: String(userId),
      memo: cleanMemo,
      amount: Number(amount),
      days: Number(days),
      sepayTxId: matchingTx.id ? String(matchingTx.id) : ""
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
}
