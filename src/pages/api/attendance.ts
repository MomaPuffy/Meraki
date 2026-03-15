import { NextApiRequest, NextApiResponse } from "next";
import { Session } from "next-auth";
import clientPromise from "@/lib/mongodb";
import cloudinary, {
  getSignedImageUrl,
  getSignedThumbnailUrl,
} from "@/lib/cloudinary";
import { getPHTDateString, getPHTTimeString } from "@/utils/dateUtils";
import { withAuth } from "@/utils/withAuth";
import {
  badRequest,
  created,
  methodNotAllowed,
  ok,
  serverError,
} from "@/utils/apiResponse";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session,
) {
  if (req.method === "GET") {
    try {
      const client = await clientPromise;
      const db = client.db("meraki");

      const attendanceRecords = await db
        .collection("attendance")
        .find({ userId: session.user.id })
        .sort({ createdAt: -1, date: -1 })
        .limit(50)
        .toArray();

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

      return ok(res, { records: recordsWithSignedUrls });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return serverError(res, "Failed to fetch attendance records");
    }
  }

  if (req.method === "POST") {
    try {
      const { type, imagePublicId } = req.body as {
        type?: string;
        imagePublicId?: string;
      };

      if (!type || !["time-in", "time-out"].includes(type)) {
        return badRequest(res, "Invalid attendance type");
      }

      if (!imagePublicId) {
        return badRequest(res, "A photo is required for attendance");
      }

      const client = await clientPromise;
      const db = client.db("meraki");
      const today = getPHTDateString();
      const currentTime = getPHTTimeString();

      const imageData = {
        public_id: imagePublicId,
        url: getSignedImageUrl(imagePublicId),
        thumbnail: cloudinary.url(imagePublicId, {
          type: "private",
          sign_url: true,
          secure: true,
          transformation: [{ width: 150, height: 150, crop: "fill" }],
        }),
        status: "completed",
      };

      if (type === "time-in") {
        const newRecord = {
          userId: session.user.id,
          userName: session.user.name,
          userEmail: session.user.email,
          date: today,
          timeIn: currentTime,
          timeInImage: imageData,
          createdAt: new Date(),
        };

        await db.collection("attendance").insertOne(newRecord);
        return created(res, {
          message: "Timed in successfully",
          record: newRecord,
        });
      }

      if (type === "time-out") {
        const updateResult = await db.collection("attendance").updateOne(
          {
            userId: session.user.id,
            date: today,
            timeIn: { $exists: true },
            timeOut: { $exists: false },
          },
          {
            $set: {
              timeOut: currentTime,
              timeOutImage: imageData,
              updatedAt: new Date(),
            },
          },
        );

        if (updateResult.matchedCount === 0) {
          return badRequest(
            res,
            "No time-in record found for today or already timed out",
          );
        }

        return ok(res, { message: "Timed out successfully" });
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
      return serverError(res, "Failed to record attendance");
    }
  }

  return methodNotAllowed(res);
}

export default withAuth(handler);
