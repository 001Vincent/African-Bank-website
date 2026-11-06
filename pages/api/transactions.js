import { connectDB } from "../../lib/db";
import Transaction from "../../models/Transaction";
import { getUserFromReq } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = getUserFromReq(req);
  if (!payload) return res.status(401).json({ error: "Not authenticated." });

  const { userId } = req.query;

  // Non-admins can only ever see their own transactions.
  const targetUserId = payload.role === "admin" && userId ? userId : payload.id;

  try {
    await connectDB();
    const transactions = await Transaction.find({ user: targetUserId })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ transactions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not load transactions." });
  }
}
