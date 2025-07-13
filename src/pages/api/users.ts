import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Not Authenticated" });
  }

  // You can add further logic here for authenticated users
  return res.json({ message: "Authenticated" });
}
