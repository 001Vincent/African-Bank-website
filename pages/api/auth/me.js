import { connectDB } from "../../../lib/db";
import User from "../../../models/User";
import { getUserFromReq } from "../../../lib/auth";

export default async function handler(req, res) {
  const payload = getUserFromReq(req);
  if (!payload) {
    return res.status(401).json({ user: null });
  }

  try {
    await connectDB();
    const user = await User.findById(payload.id).select("-passwordHash");
    if (!user) return res.status(401).json({ user: null });

    return res.status(200).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        accountNumber: user.accountNumber,
        role: user.role,
        balance: user.balance,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ user: null });
  }
}
