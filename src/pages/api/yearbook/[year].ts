import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { isAdminPosition } from "@/utils/adminRoles";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { year } = req.query;
  if (!year || typeof year !== "string") {
    return res.status(400).json({ message: "Year is required" });
  }

  const client = await clientPromise;
  const db = client.db("meraki");
  const col = db.collection("yearbooks");

  // Allow public GET
  if (req.method === "GET") {
    const yearbook = await col.findOne({ year });
    if (!yearbook)
      return res.status(404).json({ message: "Yearbook not found" });
    return res.status(200).json({ yearbook });
  }

  // Non-GET methods require auth + admin
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: "Unauthorized" });

  const profileCol = db.collection("users");
  const user = await profileCol.findOne({ email: session.user?.email });
  if (!isAdminPosition(user?.position)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  // PUT: full replace of departments array
  if (req.method === "PUT") {
    const { departments, coverPhoto } = req.body;
    if (!Array.isArray(departments)) {
      return res.status(400).json({ message: "departments must be an array" });
    }

    // Ensure each department and member has an id
    const sanitized = departments.map((dept: Record<string, unknown>) => ({
      ...dept,
      id: dept.id || new ObjectId().toHexString(),
      members: Array.isArray(dept.members)
        ? (dept.members as Record<string, unknown>[]).map((m) => ({
            ...m,
            id: m.id || new ObjectId().toHexString(),
          }))
        : [],
      activityPhotos: Array.isArray(dept.activityPhotos)
        ? dept.activityPhotos
        : [],
    }));

    const updateFields: Record<string, unknown> = {
      departments: sanitized,
      updatedAt: new Date(),
    };
    if (typeof coverPhoto === "string") {
      updateFields.coverPhoto = coverPhoto;
    }

    await col.updateOne({ year }, { $set: updateFields });

    const updated = await col.findOne({ year });
    return res.status(200).json({ yearbook: updated });
  }

  // DELETE: delete entire yearbook year
  if (req.method === "DELETE") {
    await col.deleteOne({ year });
    return res.status(200).json({ message: "Yearbook deleted" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
