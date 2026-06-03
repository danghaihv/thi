import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    success: false,
    message: "Use /api/webhook/sepay instead of /api/payment/webhook/sepay.",
  });
}
