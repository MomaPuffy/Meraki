import { NextApiRequest, NextApiResponse } from "next";
import { Session } from "next-auth";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { queueImageUpload, generateJobId } from "@/lib/cloudinary";
import { getPHTDateString, getPHTTimeString } from "@/utils/dateUtils";
import { withAuth } from "@/utils/withAuth";
import {
  badRequest,
  created,
  methodNotAllowed,
  ok,
  serverError,
} from "@/utils/apiResponse";

// Allow larger request bodies for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) {
  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  try {
    const { type, image } = req.body;
    if (!type || !["time-in", "time-out"].includes(type)) {
      return badRequest(res, "Invalid attendance type");
    }

    const client = await clientPromise;
    const db = client.db("meraki");
    const today = getPHTDateString();
    const currentPHTTimeString = getPHTTimeString();

    // Generate unique job ID for async upload
    const uploadJobId = image ? generateJobId() : null;

    if (type === "time-in") {
      // Create new attendance record
      const newRecord = {
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        date: today,
        timeIn: currentPHTTimeString,
        timeOut: null,
        totalHours: null,
        timeInImage: image
          ? {
              uploadJobId,
              url: null,
              thumbnail: null,
              public_id: null,
              status: "pending",
            }
          : null,
        timeOutImage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("attendance").insertOne(newRecord);

      // Start async upload if image provided
      if (image && uploadJobId) {
        queueImageUpload(uploadJobId, image, `attendance/${session.user.name}`);

        // Start background process to update record when upload completes
        updateRecordWhenUploadCompletes(
          result.insertedId.toString(),
          uploadJobId,
          "timeInImage"
        );
      }

      return created(res, {
        message: "Time-in recorded successfully",
        record: newRecord,
        uploadJobId,
      });
    } else {
      // Handle time-out
      const latestRecord = await db.collection("attendance").findOne(
        {
          userId: session.user.id,
          date: today,
          timeOut: null,
        },
        { sort: { createdAt: -1 } }
      );

      if (!latestRecord) {
        return badRequest(res, "No active time-in record found for today");
      }

      // Calculate total hours
      const timeInDate = new Date(`${today} ${latestRecord.timeIn}`);
      const timeOutDate = new Date(`${today} ${currentPHTTimeString}`);
      const diffMs = timeOutDate.getTime() - timeInDate.getTime();
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      const updateData: {
        timeOut: string;
        totalHours: number;
        updatedAt: Date;
        timeOutImage?: {
          uploadJobId: string;
          url: null;
          thumbnail: null;
          public_id: null;
          status: "pending";
        };
      } = {
        timeOut: currentPHTTimeString,
        totalHours,
        updatedAt: new Date(),
      };

      if (image && uploadJobId) {
        updateData.timeOutImage = {
          uploadJobId,
          url: null,
          thumbnail: null,
          public_id: null,
          status: "pending",
        };

        // Start async upload
        queueImageUpload(uploadJobId, image, `attendance/${session.user.name}`);

        // Start background process to update record when upload completes
        updateRecordWhenUploadCompletes(
          latestRecord._id.toString(),
          uploadJobId,
          "timeOutImage"
        );
      }

      await db
        .collection("attendance")
        .updateOne({ _id: latestRecord._id }, { $set: updateData });

      return ok(res, {
        message: "Time-out recorded successfully",
        totalHours,
        uploadJobId,
      });
    }
  } catch (error) {
    console.error("Error recording attendance:", error);
    return serverError(res, "Failed to record attendance");
  }
}

// Background function to update record when upload completes
async function updateRecordWhenUploadCompletes(
  recordId: string,
  jobId: string,
  imageField: "timeInImage" | "timeOutImage"
) {
  // This would ideally be handled by a background job processor
  // For now, we'll use a simple polling mechanism
  const maxAttempts = 30; // 5 minutes with 10-second intervals
  let attempts = 0;

  const checkAndUpdate = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXTAUTH_URL}/api/upload/status?jobId=${jobId}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to check upload status");
      }

      const job = await response.json();

      if (job.status === "completed" && job.result) {
        // Update the attendance record
        const client = await clientPromise;
        const db = client.db("meraki");

        await db.collection("attendance").updateOne(
          { _id: new ObjectId(recordId) },
          {
            $set: {
              [`${imageField}.url`]: job.result.url,
              [`${imageField}.thumbnail`]: job.result.thumbnail,
              [`${imageField}.public_id`]: job.result.public_id,
              [`${imageField}.status`]: "completed",
              updatedAt: new Date(),
            },
            $unset: {
              [`${imageField}.uploadJobId`]: "",
            },
          }
        );

        console.log(
          `Successfully updated attendance record ${recordId} with uploaded image`
        );
        return;
      } else if (job.status === "failed") {
        // Mark as failed
        const client = await clientPromise;
        const db = client.db("meraki");

        await db.collection("attendance").updateOne(
          { _id: new ObjectId(recordId) },
          {
            $set: {
              [`${imageField}.status`]: "failed",
              [`${imageField}.error`]: job.error || "Upload failed",
              updatedAt: new Date(),
            },
          }
        );

        console.error(
          `Upload failed for attendance record ${recordId}: ${job.error}`
        );
        return;
      } else if (attempts < maxAttempts) {
        // Still processing, try again
        attempts++;
        setTimeout(checkAndUpdate, 10000); // Check again in 10 seconds
      } else {
        // Timeout
        const client = await clientPromise;
        const db = client.db("meraki");

        await db.collection("attendance").updateOne(
          { _id: new ObjectId(recordId) },
          {
            $set: {
              [`${imageField}.status`]: "failed",
              [`${imageField}.error`]: "Upload timeout",
              updatedAt: new Date(),
            },
          }
        );

        console.error(`Upload timeout for attendance record ${recordId}`);
      }
    } catch (error) {
      console.error(`Error checking upload status for job ${jobId}:`, error);

      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkAndUpdate, 10000);
      }
    }
  };

  // Start checking after a short delay
  setTimeout(checkAndUpdate, 5000);
}

export default withAuth(handler);
