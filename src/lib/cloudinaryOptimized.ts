import { v2 as cloudinary } from "cloudinary";

// Enhanced upload function with timeout and retry capabilities
export const uploadImageWithTimeout = async (
  base64Image: string,
  folder: string = "attendance",
  timeoutMs: number = 25000 // 25 seconds to stay under Vercel's 30s limit
) => {
  const uploadPromise = cloudinary.uploader.upload(base64Image, {
    folder: folder,
    resource_type: "image",
    type: "private",
    transformation: [
      { width: 400, height: 400, crop: "fill" },
      { quality: "auto" },
      { format: "jpg" },
    ],
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Upload timeout: Image upload took too long"));
    }, timeoutMs);
  });

  try {
    const result = (await Promise.race([uploadPromise, timeoutPromise])) as {
      public_id: string;
    };

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
    throw error;
  }
};

// Optimized upload for smaller images with aggressive compression
export const uploadImageOptimized = async (
  base64Image: string,
  folder: string = "attendance"
) => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: "image",
      type: "private",
      transformation: [
        { width: 300, height: 300, crop: "fill" }, // Smaller size
        { quality: "auto:low" }, // More aggressive compression
        { format: "webp" }, // More efficient format
      ],
      timeout: 25000, // 25 second timeout
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
      transformation: [{ width: 100, height: 100, crop: "fill" }],
    });

    return {
      url: signedUrl,
      public_id: result.public_id,
      thumbnail: signedThumbnail,
    };
  } catch (error) {
    console.error("Cloudinary optimized upload error:", error);
    throw new Error("Failed to upload image");
  }
};
