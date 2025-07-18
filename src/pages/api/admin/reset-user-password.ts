import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import nodemailer from "nodemailer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const client = await clientPromise;
    const db = client.db("meraki");

    // Check admin privileges
    const currentUser = await db.collection("users").findOne({
      email: session.user.email,
    });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const adminPositions = ["advisor", "president", "vice-president"];
    const isAdmin = adminPositions.includes(
      currentUser.position?.toLowerCase() || ""
    );

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    // Find target user
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token
    await db.collection("users").updateOne(
      { _id: targetUser._id },
      {
        $set: {
          resetToken,
          resetTokenExpiry,
        },
      }
    );

    // Send reset email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: targetUser.email,
      subject: "Password Reset - Meraki Admin",
      html: `
        <h2>Password Reset Request</h2>
        <p>An administrator has initiated a password reset for your Meraki account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.status(200).json({ message: "Password reset email sent successfully" });
  } catch (error) {
    console.error("Admin reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
