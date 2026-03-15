import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { isAdminPosition } from "@/utils/adminRoles";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: "Unauthorized" });

  const client = await clientPromise;
  const db = client.db("meraki");
  const col = db.collection("yearbooks");

  if (req.method === "GET") {
    const yearbooks = await col.find({}).sort({ year: -1 }).toArray();
    return res.status(200).json({ yearbooks });
  }

  // Write operations require admin
  const profileCol = db.collection("users");
  const user = await profileCol.findOne({ email: session.user?.email });
  if (!isAdminPosition(user?.position)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  if (req.method === "POST") {
    const { year } = req.body;
    if (!year) return res.status(400).json({ message: "Year is required" });

    const existing = await col.findOne({ year });
    if (existing)
      return res
        .status(409)
        .json({ message: "Yearbook for this year already exists" });

    const result = await col.insertOne({
      year,
      departments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await col.findOne({ _id: result.insertedId });
    return res.status(201).json({ yearbook: created });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
