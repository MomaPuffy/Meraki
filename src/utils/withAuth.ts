import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { getServerSession, Session } from "next-auth";
import { isAdminPosition } from "./adminRoles";

export type SessionUser = { id?: string; position?: string };

export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, session: Session) => void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return handler(req, res, session);
  };
}

export function withAdminAuth(handler: NextApiHandler) {
  return withAuth(async (req, res, session) => {
    const position = session.user.position;

    if (!isAdminPosition(position)) {
      return res.status(403).json({ error: "Admin Only" });
    }

    return handler(req, res);
  });
}
