import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  ok,
  unauthorized,
  methodNotAllowed,
  serverError,
} from "@/utils/apiResponse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return unauthorized(res);
  }

  try {
    const MongoClient = (await import("mongodb")).MongoClient;
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      return serverError(res, "Database connection failed");
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db("Meraki");
    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();

    await client.close();

    return ok(res, users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return serverError(res, "Internal server error");
  }
}
