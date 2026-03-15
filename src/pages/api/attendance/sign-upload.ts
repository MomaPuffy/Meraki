import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/utils/withAuth";
import { Session } from "next-auth";
import cloudinary from "@/lib/cloudinary";

// Returns a signed upload signature so the client can upload
// directly to Cloudinary without routing the image through our server.
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const folder = `attendance/${session.user.name}`;
  const timestamp = Math.round(Date.now() / 1000);

  // Parameters that must match exactly what the client sends to Cloudinary
  const paramsToSign = {
    folder,
    timestamp,
    // Keep images private so they require signed URLs to view
    type: "private",
    transformation: "q_auto,f_jpg",
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return res.status(200).json({
    signature,
    timestamp,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
}

export default withAuth(handler);
