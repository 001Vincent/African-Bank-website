import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["deposit", "withdrawal"], default: "deposit" },
    amount: { type: Number, required: true }, // stored in USD, always positive; type indicates direction
    currency: { type: String, default: "USD" }, // currency the transaction was entered in
    displayAmount: { type: Number, required: true }, // amount in that original currency
    fromName: { type: String, required: true },
    toName: { type: String, required: true },
    toAccountNumber: { type: String, default: "" }, // destination account for withdrawals
    message: { type: String, required: true }, // full formatted receipt line
    note: { type: String, default: "" },
    balanceAfter: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // admin who funded it
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
