import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]";
import { isAdminPosition } from "@/utils/adminRoles";
import { deleteImage } from "@/lib/cloudinary";
import { ObjectId } from "mongodb";
import {
  ok,
  badRequest,
  forbidden,
  notFound,
  methodNotAllowed,
  serverError,
} from "@/utils/apiResponse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = await clientPromise;
    const db = client.db("meraki");
    const { id } = req.query;

    if (req.method === "DELETE") {
      const session = await getServerSession(req, res, authOptions);
      if (!session || !isAdminPosition(session.user?.position)) {
        return forbidden(res);
      }

      if (!id || typeof id !== "string") {
        return badRequest(res, "Invalid ID");
      }

      // First, get the item to check if it has a Cloudinary public_id
      const item = await db.collection("gallery").findOne({
        _id: new ObjectId(id),
      });

      if (!item) {
        return notFound(res, "Gallery item not found");
      }

      console.log("Found gallery item:", {
        id: item._id,
        title: item.title,
        public_id: item.public_id,
      });

      // Delete from Cloudinary if public_id exists
      if (item.public_id) {
        try {
          console.log(
            "Attempting to delete image from Cloudinary:",
            item.public_id
          );
          const deleteResult = await deleteImage(item.public_id);
          console.log("Cloudinary deletion successful:", deleteResult);
        } catch (error) {
          console.error("Failed to delete image from Cloudinary:", error);
          console.error("Item public_id:", item.public_id);
          // Continue with database deletion even if Cloudinary deletion fails
        }
      } else {
        console.log(
          "No public_id found for item, skipping Cloudinary deletion"
        );
      }

      // Delete from MongoDB
      const result = await db.collection("gallery").deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return notFound(res, "Gallery item not found");
      }

      return ok(res, {
        message: "Gallery item deleted successfully",
        deletedId: id,
      });
    }

    return methodNotAllowed(res);
  } catch (error) {
    console.error("/api/gallery/[id] delete error", error);
    return serverError(res);
  }
}
