import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { getSignedImageUrl, getSignedThumbnailUrl } from "@/lib/cloudinary";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const client = await clientPromise;
    const db = client.db("meraki");

    // Get current user to check admin privileges
    const currentUser = await db.collection("users").findOne({
      email: session.user.email,
    });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has admin privileges
    const adminPositions = ["advisor", "president", "vice-president"];
    const isAdmin = adminPositions.includes(
      currentUser.position?.toLowerCase() || ""
    );

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    // Get the target user's information
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Fetch attendance records for the specific user
    const attendanceRecords = await db
      .collection("attendance")
      .find({ userId: userId })
      .sort({ date: -1 })
      .limit(100)
      .toArray();

    // Generate fresh signed URLs for private images
    const recordsWithSignedUrls = attendanceRecords.map((record) => {
      const updatedRecord = { ...record };

      if (record.timeInImage?.public_id) {
        updatedRecord.timeInImage = {
          ...record.timeInImage,
          url: getSignedImageUrl(record.timeInImage.public_id),
          thumbnail: getSignedThumbnailUrl(record.timeInImage.public_id),
        };
      }

      if (record.timeOutImage?.public_id) {
        updatedRecord.timeOutImage = {
          ...record.timeOutImage,
          url: getSignedImageUrl(record.timeOutImage.public_id),
          thumbnail: getSignedThumbnailUrl(record.timeOutImage.public_id),
        };
      }

      return updatedRecord;
    });

    res.status(200).json({
      message: "User attendance fetched successfully",
      user: {
        id: targetUser._id?.toString(),
        name: targetUser.name,
        email: targetUser.email,
        department: targetUser.department,
        position: targetUser.position,
      },
      attendance: recordsWithSignedUrls,
    });
  } catch (error) {
    console.error("Admin user attendance fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
