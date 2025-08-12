import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { getUserColorKey } from "@/lib/colorConfig";
import { uploadImage } from "@/lib/cloudinary";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get the session from NextAuth
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const client = await clientPromise;
    const db = client.db("meraki");

    if (req.method === "GET") {
      // Fetch complete user data from database
      const user = await db.collection("users").findOne({
        email: session.user.email,
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user data (excluding password for security)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = user;

      res.status(200).json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image || null,
          provider: user.provider,
          googleId: user.googleId || null,
          createdAt: user.createdAt,
          ...userData,
        },
      });
    } else if (req.method === "PUT") {
      const { name, department, image } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Name is required" });
      }

      if (name.length > 100) {
        return res
          .status(400)
          .json({ message: "Name must be less than 100 characters" });
      }

      // Get current user to preserve position and calculate color
      const currentUser = await db.collection("users").findOne({
        email: session.user.email,
      });

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate color based on current position and new department
      const userColor = getUserColorKey(
        currentUser.position,
        department || "Unassigned"
      );

      let imageUrl = currentUser.image;

      // Upload image to Cloudinary if provided
      if (image) {
        try {
          const uploadResult = await uploadImage(
            image,
            `profiles/${session.user.name}`
          );
          imageUrl = uploadResult.url;
        } catch (uploadError) {
          console.error("Profile image upload failed:", uploadError);
          return res
            .status(500)
            .json({ message: "Failed to upload profile image" });
        }
      }

      const result = await db.collection("users").updateOne(
        { email: session.user.email },
        {
          $set: {
            name: name.trim(),
            department: department || "Unassigned",
            image: imageUrl,
            color: userColor,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch updated user data
      const updatedUser = await db.collection("users").findOne({
        email: session.user.email,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found after update" });
      }

      // Return updated user data (excluding password for security)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = updatedUser;

      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser._id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          image: updatedUser.image || null,
          provider: updatedUser.provider,
          googleId: updatedUser.googleId || null,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          ...userData,
        },
      });
    } else {
      return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Profile API error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
