import { connectDB } from "../../../lib/db";
import User from "../../../models/User";
import { getUserFromReq } from "../../../lib/auth";

export default async function handler(req, res) {
  const payload = getUserFromReq(req);
  if (!payload || payload.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  await connectDB();

  if (req.method === "GET") {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    return res.status(200).json({ users });
  }

  if (req.method === "PATCH") {
    const { userId, status, balance } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId is required." });

    const update = {};
    if (status && ["active", "suspended"].includes(status)) update.status = status;
    if (balance !== undefined && !Number.isNaN(Number(balance))) update.balance = Number(balance);

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });

    return res.status(200).json({ user });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
