import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdminPosition } from "@/utils/adminRoles";
import { uploadImageFull } from "@/lib/cloudinary";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: "Unauthorized" });
  if (!isAdminPosition(session.user?.position)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const { imageBase64, folder = "yearbook" } = req.body as {
    imageBase64?: string;
    folder?: string;
  };

  if (!imageBase64) {
    return res.status(400).json({ message: "imageBase64 is required" });
  }

  try {
    const uploaded = await uploadImageFull(imageBase64, folder);
    return res.status(200).json({ url: uploaded.url });
  } catch (err) {
    console.error("Yearbook upload failed:", err);
    return res.status(500).json({ message: "Image upload failed" });
  }
}
