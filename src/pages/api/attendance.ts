import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";
import { uploadImage, getSignedImageUrl, getSignedThumbnailUrl } from "../../lib/cloudinary";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const client = await clientPromise;
      const db = client.db("meraki");
      
      // Get attendance records for the current user
      const attendanceRecords = await db.collection("attendance")
        .find({ userId: session.user.id })
        .sort({ date: -1 })
        .limit(50)
        .toArray();

      // Generate fresh signed URLs for private images
      const recordsWithSignedUrls = attendanceRecords.map(record => {
        const updatedRecord = { ...record };
        
        if (record.timeInImage?.public_id) {
          updatedRecord.timeInImage = {
            ...record.timeInImage,
            url: getSignedImageUrl(record.timeInImage.public_id),
            thumbnail: getSignedThumbnailUrl(record.timeInImage.public_id)
          };
        }
        
        if (record.timeOutImage?.public_id) {
          updatedRecord.timeOutImage = {
            ...record.timeOutImage,
            url: getSignedImageUrl(record.timeOutImage.public_id),
            thumbnail: getSignedThumbnailUrl(record.timeOutImage.public_id)
          };
        }
        
        return updatedRecord;
      });

      return res.status(200).json(recordsWithSignedUrls);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  }

  if (req.method === "POST") {
    try {
      const { type, image } = req.body; // type: 'time-in' or 'time-out'
      
      if (!type || (type !== 'time-in' && type !== 'time-out')) {
        return res.status(400).json({ error: "Invalid attendance type" });
      }

      const client = await clientPromise;
      const db = client.db("meraki");
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Upload image to Cloudinary if provided
      let imageData = null;
      if (image) {
        try {
          const uploadResult = await uploadImage(image, `attendance/${session.user.id}`);
          imageData = {
            url: uploadResult.url,
            thumbnail: uploadResult.thumbnail,
            public_id: uploadResult.public_id
          };
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          return res.status(500).json({ error: "Failed to upload image" });
        }
      }
      
      if (type === 'time-in') {
        // Check if user already has a time-in for today
        const existingRecord = await db.collection("attendance")
          .findOne({ 
            userId: session.user.id,
            date: today,
            timeIn: { $exists: true }
          });

        if (existingRecord) {
          return res.status(400).json({ error: "Already timed in for today" });
        }

        // Create new attendance record
        const newRecord = {
          userId: session.user.id,
          userName: session.user.name,
          userEmail: session.user.email,
          date: today,
          timeIn: new Date(),
          timeInImage: imageData,
          createdAt: new Date()
        };

        await db.collection("attendance").insertOne(newRecord);
        return res.status(201).json({ message: "Timed in successfully", record: newRecord });
      } 
      
      if (type === 'time-out') {
        // Find today's record and update with time-out
        const updateResult = await db.collection("attendance")
          .updateOne(
            { 
              userId: session.user.id,
              date: today,
              timeIn: { $exists: true },
              timeOut: { $exists: false }
            },
            { 
              $set: { 
                timeOut: new Date(),
                timeOutImage: imageData,
                updatedAt: new Date()
              }
            }
          );

        if (updateResult.matchedCount === 0) {
          return res.status(400).json({ error: "No time-in record found for today or already timed out" });
        }

        return res.status(200).json({ message: "Timed out successfully" });
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
      return res.status(500).json({ error: "Failed to record attendance" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
