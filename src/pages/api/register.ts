import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { getUserColorKey } from "@/lib/colorConfig";
import {
  created,
  badRequest,
  methodNotAllowed,
  serverError,
} from "@/utils/apiResponse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  const { name, email, password, department, position } = req.body;

  if (!name || !email || !password) {
    return badRequest(res, "Missing required fields");
  }

  if (password.length < 6) {
    return badRequest(res, "Password must be at least 6 characters long");
  }

  try {
    const client = await clientPromise;
    const db = client.db("meraki");

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      // Check if the user was created via Google OAuth
      if (existingUser.provider === "google") {
        return badRequest(
          res,
          "An account with this email already exists. Please sign in with Google."
        );
      } else {
        return badRequest(res, "User already exists with this email");
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      provider: "credentials",
      department: department || "Unassigned",
      position: position || "Member",
      color: getUserColorKey(position || "Member", department || "Unassigned"),
      createdAt: new Date(),
    });

    return created(res, {
      message: "User created successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return serverError(res, "Internal server error");
  }
}
