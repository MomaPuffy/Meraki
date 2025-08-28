import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "./auth/[...nextauth]";
import { isAdminPosition } from "@/utils/adminRoles";
import { uploadImage } from "@/lib/cloudinary";
import {
  ok,
  created,
  badRequest,
  forbidden,
  methodNotAllowed,
  serverError,
} from "@/utils/apiResponse";

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
      return ok(res, { items });
    }

    if (req.method === "POST") {
      const session = await getServerSession(req, res, authOptions);
      if (!session || !isAdminPosition(session.user?.position)) {
        return forbidden(res);
      }

      const { title, category, src, imageBase64 } = req.body as {
        title?: string;
        category?: string;
        src?: string;
        imageBase64?: string;
      };

      if (!title || !category || (!src && !imageBase64)) {
        return badRequest(res, "Missing fields");
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
          return serverError(res, "Image upload failed");
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

      return created(res, { item: newItem });
    }

    return methodNotAllowed(res);
  } catch (error) {
    console.error("/api/gallery error", error);
    return serverError(res);
  }
}
