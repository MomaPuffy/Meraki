import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Interface for upload job
export interface UploadJob {
  id: string;
  base64Image: string;
  folder: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: {
    url: string;
    public_id: string;
    thumbnail: string;
  };
  error?: string;
  createdAt: Date;
}

// In-memory job queue (you could use Redis in production)
const uploadQueue: Map<string, UploadJob> = new Map();

// Generate unique job ID
export const generateJobId = (): string => {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Add upload job to queue
export const queueImageUpload = (
  jobId: string,
  base64Image: string,
  folder: string = "attendance"
): UploadJob => {
  const job: UploadJob = {
    id: jobId,
    base64Image,
    folder,
    status: "pending",
    createdAt: new Date(),
  };

  uploadQueue.set(jobId, job);

  // Process the upload asynchronously
  processUploadJob(jobId).catch((error) => {
    console.error(`Failed to process upload job ${jobId}:`, error);
    const failedJob = uploadQueue.get(jobId);
    if (failedJob) {
      failedJob.status = "failed";
      failedJob.error = error.message;
      uploadQueue.set(jobId, failedJob);
    }
  });

  return job;
};

// Process individual upload job
const processUploadJob = async (jobId: string): Promise<void> => {
  const job = uploadQueue.get(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  job.status = "processing";
  uploadQueue.set(jobId, job);

  try {
    const result = await cloudinary.uploader.upload(job.base64Image, {
      folder: job.folder,
      resource_type: "image",
      type: "private",
      transformation: [
        { width: 400, height: 400, crop: "fill" },
        { quality: "auto" },
        { format: "jpg" },
      ],
    });

    // Generate signed URLs for private access
    const signedUrl = cloudinary.url(result.public_id, {
      type: "private",
      sign_url: true,
      secure: true,
    });

    const signedThumbnail = cloudinary.url(result.public_id, {
      type: "private",
      sign_url: true,
      secure: true,
      transformation: [{ width: 150, height: 150, crop: "fill" }],
    });

    job.status = "completed";
    job.result = {
      url: signedUrl,
      public_id: result.public_id,
      thumbnail: signedThumbnail,
    };
    uploadQueue.set(jobId, job);
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown error";
    uploadQueue.set(jobId, job);
  }
};

// Get job status
export const getUploadJobStatus = (jobId: string): UploadJob | null => {
  return uploadQueue.get(jobId) || null;
};

// Clean up old jobs (call periodically)
export const cleanupOldJobs = (maxAgeHours: number = 24): void => {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  for (const [jobId, job] of uploadQueue.entries()) {
    if (job.createdAt < cutoff) {
      uploadQueue.delete(jobId);
    }
  }
};

// Original synchronous upload function (kept for backwards compatibility)
export const uploadImage = async (
  base64Image: string,
  folder: string = "attendance"
) => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: "image",
      type: "private", // Make images private
      transformation: [
        { width: 400, height: 400, crop: "fill" },
        { quality: "auto" },
        { format: "jpg" },
      ],
    });

    // Generate signed URLs for private access
    const signedUrl = cloudinary.url(result.public_id, {
      type: "private",
      sign_url: true,
      secure: true,
    });

    const signedThumbnail = cloudinary.url(result.public_id, {
      type: "private",
      sign_url: true,
      secure: true,
      transformation: [{ width: 150, height: 150, crop: "fill" }],
    });

    return {
      url: signedUrl,
      public_id: result.public_id,
      thumbnail: signedThumbnail,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image");
  }
};

// Generate signed URLs for private images
export const getSignedImageUrl = (
  publicId: string,
  transformation?: object
) => {
  return cloudinary.url(publicId, {
    type: "private",
    sign_url: true,
    secure: true,
    transformation: transformation,
  });
};

// Generate signed thumbnail URL
export const getSignedThumbnailUrl = (publicId: string) => {
  return cloudinary.url(publicId, {
    type: "private",
    sign_url: true,
    secure: true,
    transformation: [{ width: 150, height: 150, crop: "fill" }],
  });
};

// Delete image from Cloudinary
export const deleteImage = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      type: "private", // Specify that we're deleting a private resource
      resource_type: "image",
    });
    console.log("Cloudinary deletion result:", result);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete image");
  }
};
