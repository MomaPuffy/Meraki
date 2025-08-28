import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]";
import { ObjectId, UpdateFilter, Document } from "mongodb";
import {
  ok,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from "@/utils/apiResponse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return badRequest(res, "Invalid id");
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) return unauthorized(res);

  try {
    const client = await clientPromise;
    const db = client.db("meraki");
    const galleryId = new ObjectId(id);
    const rawUserId = session.user?.id ?? session.user?.email;
    const userId =
      typeof rawUserId === "string" ? rawUserId : String(rawUserId || "");
    if (!userId) return unauthorized(res);

    // Check if user already liked
    const doc = await db.collection("gallery").findOne({ _id: galleryId });
    if (!doc) return notFound(res);

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
        return serverError(res, "Failed to update like");
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
        return serverError(res, "Failed to update like");
      }
    }

    const updated = await db.collection("gallery").findOne({ _id: galleryId });
    if (!updated) return serverError(res, "Failed to fetch updated item");
    return ok(res, { item: updated });
  } catch (err) {
    console.error("like error", err);
    return serverError(res);
  }
}
