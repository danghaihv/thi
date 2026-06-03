import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getIntentById } from "../_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const intentId = String(req.query.intentId || "").trim();
  if (!intentId) return res.status(400).json({ error: "Thiếu intentId" });

  try {
    const intent = await getIntentById(intentId);
    if (!intent) return res.status(404).json({ error: "Không tìm thấy payment intent" });
    return res.status(200).json({ success: true, intent });
  } catch (err: any) {
    console.error("Get intent error:", err);
    return res.status(500).json({ error: "Lỗi lấy trạng thái intent: " + err.message });
  }
}
