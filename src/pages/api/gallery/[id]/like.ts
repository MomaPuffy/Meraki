import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]";
import { ObjectId, UpdateFilter, Document } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: "Not authenticated" });

  try {
    const client = await clientPromise;
    const db = client.db("meraki");
    const galleryId = new ObjectId(id);
    const rawUserId = session.user?.id ?? session.user?.email;
    const userId =
      typeof rawUserId === "string" ? rawUserId : String(rawUserId || "");
    if (!userId)
      return res.status(401).json({ message: "Invalid user id in session" });

    // Check if user already liked
    const doc = await db.collection("gallery").findOne({ _id: galleryId });
    if (!doc) return res.status(404).json({ message: "Not found" });

    const likedBy: string[] = doc.likedBy || [];
    const alreadyLiked = likedBy.includes(userId);

    if (alreadyLiked) {
      const update = {
        $pull: { likedBy: { $eq: userId } },
        $inc: { likes: -1 },
      } as unknown as UpdateFilter<Document>;
      const updateRes = await db
        .collection("gallery")
        .updateOne({ _id: galleryId }, update);
      if (!updateRes || updateRes.matchedCount === 0) {
        return res.status(500).json({ message: "Failed to update like" });
      }
    } else {
      const update = {
        $addToSet: { likedBy: userId },
        $inc: { likes: 1 },
      } as unknown as UpdateFilter<Document>;
      const updateRes = await db
        .collection("gallery")
        .updateOne({ _id: galleryId }, update);
      if (!updateRes || updateRes.matchedCount === 0) {
        return res.status(500).json({ message: "Failed to update like" });
      }
    }

    const updated = await db.collection("gallery").findOne({ _id: galleryId });
    if (!updated)
      return res.status(500).json({ message: "Failed to fetch updated item" });
    return res.json({ item: updated });
  } catch (err) {
    console.error("like error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
