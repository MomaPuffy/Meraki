import { NextApiRequest, NextApiResponse } from "next";
import { getUploadJobStatus, cleanupOldJobs } from "@/lib/cloudinary";
import { ok, serverError, badRequest } from "@/utils/apiResponse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== "string") {
      return badRequest(res, "Job ID is required");
    }

    // Clean up old jobs periodically
    cleanupOldJobs();

    const job = getUploadJobStatus(jobId);

    if (!job) {
      return badRequest(res, "Job not found or expired");
    }

    // Return job status without the base64 image data for efficiency
    const { ...jobResponse } = job;

    return ok(res, jobResponse);
  } catch (error) {
    console.error("Upload status check error:", error);
    return serverError(res, "Failed to check upload status");
  }
}
