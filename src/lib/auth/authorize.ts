import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";

export type Role = "admin" | "user";

interface AuthorizeOptions {
    roles?: Role[];
}

export async function authorize(
    req: NextApiRequest,
    res: NextApiResponse,
    options?: AuthorizeOptions
) {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (options?.roles && !options.roles.includes(session.user.position as Role)) {
        return res.status(403).json({ message: "Forbidden" });
    }

    return session;
}