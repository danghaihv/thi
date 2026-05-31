import type { VercelRequest, VercelResponse } from "@vercel/node";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "./_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb();
    const settingsRef = doc(db, "settings", "global");
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      return res.json({
        vip1MonthPrice: 50000,
        vip6MonthPrice: 240000,
        vip1YearPrice: 450000,
        sepayBankId: "",
        sepayAccountNo: "",
        sepayAccountName: "",
      });
    }

    const data: any = settingsSnap.data();
    return res.json({
      vip1MonthPrice: Number(data.vip1MonthPrice || 50000),
      vip6MonthPrice: Number(data.vip6MonthPrice || 240000),
      vip1YearPrice: Number(data.vip1YearPrice || 450000),
      sepayBankId: data.sepayBankId || "",
      sepayAccountNo: data.sepayAccountNo || "",
      sepayAccountName: data.sepayAccountName || "",
    });
  } catch (err: any) {
    console.error("Get pricing error:", err);
    return res.status(500).json({ error: "Lỗi lấy cấu hình giá: " + err.message });
  }
}