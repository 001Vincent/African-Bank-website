import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    accountNumber: { type: String, required: true, unique: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    photoUrl: { type: String, default: "" }, // base64 data URI of the passport photo
    pinHash: { type: String, default: "" }, // hashed transaction PIN, set on first withdrawal
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
