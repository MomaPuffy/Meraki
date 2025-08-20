import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "./auth/[...nextauth]";
import { isAdminPosition } from "@/utils/adminRoles";
import { uploadImage } from "@/lib/cloudinary";

// allow larger JSON bodies for base64 image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = await clientPromise;
    const db = client.db("meraki");

    if (req.method === "GET") {
      const items = await db
        .collection("gallery")
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      return res.status(200).json({ items });
    }

    if (req.method === "POST") {
      const session = await getServerSession(req, res, authOptions);
      if (!session || !isAdminPosition(session.user?.position)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { title, category, src, imageBase64 } = req.body as {
        title?: string;
        category?: string;
        src?: string;
        imageBase64?: string;
      };

      if (!title || !category || (!src && !imageBase64)) {
        return res.status(400).json({ message: "Missing fields" });
      }

      let finalSrc = src;
      let public_id: string | undefined = undefined;

      if (imageBase64) {
        // upload to Cloudinary
        try {
          const uploaded = await uploadImage(imageBase64, "gallery");
          finalSrc = uploaded.url;
          public_id = uploaded.public_id;
        } catch (err) {
          console.error("Cloudinary upload failed", err);
          return res.status(500).json({ message: "Image upload failed" });
        }
      }

      const result = await db.collection("gallery").insertOne({
        title,
        category,
        src: finalSrc,
        public_id: public_id,
        likes: 0,
        likedBy: [],
        createdAt: new Date(),
      });

      const newItem = await db
        .collection("gallery")
        .findOne({ _id: result.insertedId });

      return res.status(201).json({ item: newItem });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("/api/gallery error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
