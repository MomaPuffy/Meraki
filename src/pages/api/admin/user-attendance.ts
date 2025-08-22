import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { getSignedImageUrl, getSignedThumbnailUrl } from "@/lib/cloudinary";
import { ObjectId } from "mongodb";
import { withAdminAuth } from "@/utils/withAuth";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
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
      .sort({ createdAt: -1, date: -1 })
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

export default withAdminAuth(handler);
