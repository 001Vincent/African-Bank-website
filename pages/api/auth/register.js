import bcrypt from "bcryptjs";
import { connectDB } from "../../../lib/db";
import User from "../../../models/User";
import { signToken, setAuthCookie } from "../../../lib/auth";

function generateAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 8999999999));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullName, email, password, adminCode } = req.body || {};

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "Full name, email and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role =
      adminCode && process.env.ADMIN_SIGNUP_CODE && adminCode === process.env.ADMIN_SIGNUP_CODE
        ? "admin"
        : "user";

    let accountNumber = generateAccountNumber();
    while (await User.findOne({ accountNumber })) {
      accountNumber = generateAccountNumber();
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      accountNumber,
      role,
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        accountNumber: user.accountNumber,
        role: user.role,
        balance: user.balance,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
