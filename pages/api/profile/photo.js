import { connectDB } from "../../../lib/db";
import User from "../../../models/User";
import { getUserFromReq } from "../../../lib/auth";

// 1.5MB cap on the base64 string keeps documents well under MongoDB's 16MB limit
// and keeps page loads fast — plenty for a small passport-style photo.
const MAX_PHOTO_LENGTH = 1_500_000;

export default async function handler(req, res) {
  const payload = getUserFromReq(req);
  if (!payload) return res.status(401).json({ error: "Not authenticated." });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { photoUrl } = req.body || {};

  try {
    await connectDB();

    if (photoUrl === null || photoUrl === "") {
      const user = await User.findByIdAndUpdate(payload.id, { photoUrl: "" }, { new: true }).select(
        "-passwordHash"
      );
      return res.status(200).json({ user });
    }

    if (typeof photoUrl !== "string" || !photoUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "Please upload a valid image file." });
    }
    if (photoUrl.length > MAX_PHOTO_LENGTH) {
      return res.status(400).json({ error: "That image is too large. Please use a smaller photo (under ~1MB)." });
    }

    const user = await User.findByIdAndUpdate(payload.id, { photoUrl }, { new: true }).select("-passwordHash");
    return res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not save your photo. Please try again." });
  }
}
