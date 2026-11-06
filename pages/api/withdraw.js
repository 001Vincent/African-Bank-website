import bcrypt from "bcryptjs";
import { connectDB } from "../../lib/db";
import User from "../../models/User";
import Transaction from "../../models/Transaction";
import { getUserFromReq } from "../../lib/auth";
import { fetchUsdRates } from "../../lib/rates";
import { sendTransactionEmail } from "../../lib/mailer";

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

  const payload = getUserFromReq(req);
  if (!payload) return res.status(401).json({ error: "Not authenticated." });

  const { toAccountNumber, amount, currency = "USD", pin } = req.body || {};
  const enteredAmount = Number(amount);

  if (!toAccountNumber || !toAccountNumber.trim()) {
    return res.status(400).json({ error: "Enter the receiving account number." });
  }
  if (!enteredAmount || enteredAmount <= 0) {
    return res.status(400).json({ error: "Enter a withdrawal amount greater than 0." });
  }
  if (!pin || String(pin).length < 4) {
    return res.status(400).json({ error: "Enter a transaction PIN of at least 4 digits." });
  }

  try {
    await connectDB();

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: "Account not found." });
    if (user.status === "suspended") {
      return res.status(403).json({ error: "This account is suspended. Contact support." });
    }

    // First withdrawal ever sets the PIN; after that, it must match.
    let pinJustCreated = false;
    if (!user.pinHash) {
      user.pinHash = await bcrypt.hash(String(pin), 10);
      pinJustCreated = true;
    } else {
      const validPin = await bcrypt.compare(String(pin), user.pinHash);
      if (!validPin) {
        return res.status(401).json({ error: "Incorrect transaction PIN." });
      }
    }

    // Convert the entered amount into USD, the account's base currency.
    let usdAmount = enteredAmount;
    if (currency !== "USD") {
      const { rates } = await fetchUsdRates();
      const rate = rates[currency];
      if (!rate) return res.status(400).json({ error: `No live rate available for ${currency}.` });
      usdAmount = enteredAmount / rate;
    }

    if (usdAmount > (user.balance || 0)) {
      return res.status(400).json({ error: "Insufficient balance for this withdrawal." });
    }

    user.balance = (user.balance || 0) - usdAmount;
    await user.save();

    const formattedAmount = formatAmount(enteredAmount, currency);
    const message = `Withdrawal successful from ${user.fullName} To Account ${toAccountNumber.trim()} | Amount ${formattedAmount}`;

    const transaction = await Transaction.create({
      user: user._id,
      type: "withdrawal",
      amount: usdAmount,
      currency,
      displayAmount: enteredAmount,
      fromName: user.fullName,
      toName: `Account ${toAccountNumber.trim()}`,
      toAccountNumber: toAccountNumber.trim(),
      message,
      balanceAfter: user.balance,
      createdBy: user._id,
    });

    const emailResult = await sendTransactionEmail({
      to: user.email,
      subject: "Unions Africa Bank — Withdrawal Confirmation",
      text: `${message}\n\nNew balance: $${user.balance.toFixed(2)} USD\nDate: ${new Date().toUTCString()}\n\nIf you did not authorize this withdrawal, contact support immediately.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0A2342">Unions Africa Bank</h2>
          <p>${message}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#5C6B80">New balance</td><td style="padding:6px 0;text-align:right">$${user.balance.toFixed(2)} USD</td></tr>
            <tr><td style="padding:6px 0;color:#5C6B80">Date</td><td style="padding:6px 0;text-align:right">${new Date().toUTCString()}</td></tr>
          </table>
          <p style="color:#C0392B;font-size:13px">If you did not authorize this withdrawal, contact support immediately.</p>
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
        photoUrl: user.photoUrl,
      },
      transaction,
      pinJustCreated,
      emailSent: emailResult.sent,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not process the withdrawal. Please try again." });
  }
}
