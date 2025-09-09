import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getUploadJobStatus } from "@/lib/cloudinary";
import { ok, serverError, badRequest } from "@/utils/apiResponse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { jobId, recordId, imageType } = req.body;

    if (!jobId || !recordId || !imageType) {
      return badRequest(res, "Job ID, record ID, and image type are required");
    }

    if (!["timeInImage", "timeOutImage"].includes(imageType)) {
      return badRequest(res, "Invalid image type");
    }

    const job = getUploadJobStatus(jobId);

    if (!job) {
      return badRequest(res, "Job not found");
    }

    if (job.status !== "completed") {
      return ok(res, { message: "Job not yet completed", status: job.status });
    }

    if (!job.result) {
      return serverError(res, "Job completed but no result available");
    }

    // Update the attendance record with the completed upload data
    const client = await clientPromise;
    const db = client.db("meraki");

    const updateField = `${imageType}`;
    const updateData = {
      url: job.result.url,
      thumbnail: job.result.thumbnail,
      public_id: job.result.public_id,
      status: "completed",
    };

    const result = await db.collection("attendance").updateOne(
      { _id: new ObjectId(recordId) },
      {
        $set: {
          [updateField]: updateData,
          updatedAt: new Date(),
        },
        $unset: {
          [`${updateField}.uploadJobId`]: "",
        },
      }
    );

    if (result.matchedCount === 0) {
      return badRequest(res, "Attendance record not found");
    }

    return ok(res, {
      message: "Attendance record updated successfully",
      imageData: updateData,
    });
  } catch (error) {
    console.error("Update attendance image error:", error);
    return serverError(res, "Failed to update attendance record");
  }
}
