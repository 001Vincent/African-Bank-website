import { connectDB } from "../../../lib/db";
import User from "../../../models/User";
import Transaction from "../../../models/Transaction";
import { getUserFromReq } from "../../../lib/auth";
import { fetchUsdRates } from "../../../lib/rates";
import { sendTransactionEmail } from "../../../lib/mailer";

const SYMBOLS = { USD: "$", GBP: "£", JPY: "¥", NGN: "₦", EUR: "€", ZAR: "R" };

function formatAmount(value, currency) {
  const decimals = currency === "JPY" ? 0 : 2;
  const symbol = SYMBOLS[currency] || `${currency} `;
  return `${symbol}${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getUserFromReq(req);
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  const { userId, amount, currency = "NGN", fromName, note } = req.body || {};
  const enteredAmount = Number(amount);

  if (!userId || !enteredAmount || enteredAmount <= 0) {
    return res.status(400).json({ error: "A user and a positive deposit amount are required." });
  }

  try {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    // Convert the entered amount into USD, the account's base currency.
    let usdAmount = enteredAmount;
    if (currency !== "USD") {
      const { rates } = await fetchUsdRates();
      const rate = rates[currency];
      if (!rate) return res.status(400).json({ error: `No live rate available for ${currency}.` });
      usdAmount = enteredAmount / rate;
    }

    user.balance = (user.balance || 0) + usdAmount;
    await user.save();

    const senderName = (fromName || admin.name || "Unions Africa Bank").trim();
    const formattedAmount = formatAmount(enteredAmount, currency);
    const message = `Deposit successful from ${senderName} To ${user.fullName} | Amount ${formattedAmount}`;

    const transaction = await Transaction.create({
      user: user._id,
      type: "deposit",
      amount: usdAmount,
      currency,
      displayAmount: enteredAmount,
      fromName: senderName,
      toName: user.fullName,
      message,
      note: note || "",
      balanceAfter: user.balance,
      createdBy: admin.id,
    });

    const emailResult = await sendTransactionEmail({
      to: user.email,
      subject: "Unions Africa Bank — Deposit Confirmation",
      text: `${message}\n\nNew balance: $${user.balance.toFixed(2)} USD\nDate: ${new Date().toUTCString()}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0A2342">Unions Africa Bank</h2>
          <p>${message}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#5C6B80">New balance</td><td style="padding:6px 0;text-align:right">$${user.balance.toFixed(2)} USD</td></tr>
            <tr><td style="padding:6px 0;color:#5C6B80">Date</td><td style="padding:6px 0;text-align:right">${new Date().toUTCString()}</td></tr>
          </table>
        </div>
      `,
    });

    return res.status(200).json({
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        accountNumber: user.accountNumber,
        role: user.role,
        balance: user.balance,
        status: user.status,
      },
      transaction,
      emailSent: emailResult.sent,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not process the deposit. Please try again." });
  }
}
