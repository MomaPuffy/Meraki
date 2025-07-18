import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "../../../lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get the session from NextAuth
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const client = await clientPromise;
    const db = client.db("meraki");

    // Get current user to check admin privileges
    const currentUser = await db.collection("users").findOne({
      email: session.user.email,
    });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has admin privileges
    const adminPositions = ["advisor", "president", "vice-president"];
    const isAdmin = adminPositions.includes(
      currentUser.position?.toLowerCase() || ""
    );

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    // Get today's date for login comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch all users
    const users = await db.collection("users").find({}).toArray();

    // Check attendance records for today to determine login status
    const attendanceRecords = await db
      .collection("attendance")
      .find({
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      })
      .toArray();

    // Create a map of user emails who logged in today with their attendance data
    const todayAttendanceMap = new Map();
    attendanceRecords.forEach((record) => {
      if (!todayAttendanceMap.has(record.userEmail)) {
        todayAttendanceMap.set(record.userEmail, {
          timeIn: record.createdAt,
          timeOut: record.timeOut || null,
        });
      } else {
        // Update with latest time out if exists
        const existing = todayAttendanceMap.get(record.userEmail);
        if (record.timeOut) {
          existing.timeOut = record.timeOut;
        }
      }
    });

    // Get the latest login time for each user from attendance records
    const latestLogins = await db
      .collection("attendance")
      .aggregate([
        {
          $group: {
            _id: "$userEmail",
            lastLoginTime: { $max: "$createdAt" },
          },
        },
      ])
      .toArray();

    const loginMap = new Map(
      latestLogins.map((login) => [login._id, login.lastLoginTime])
    );

    // Format user data with login information
    const usersWithLoginStatus = users.map((user) => {
      const todayAttendance = todayAttendanceMap.get(user.email);
      return {
        id: user._id?.toString() || "",
        name: user.name,
        email: user.email,
        image: user.image || null,
        provider: user.provider,
        department: user.department || "Unassigned",
        position: user.position || "Member",
        color: user.color || "blue",
        createdAt: user.createdAt,
        lastLoginToday: todayAttendanceMap.has(user.email),
        lastLoginTime: loginMap.get(user.email) || null,
        timeInToday: todayAttendance?.timeIn || null,
        timeOutToday: todayAttendance?.timeOut || null,
      };
    });

    // Sort users by name
    usersWithLoginStatus.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      message: "Users fetched successfully",
      users: usersWithLoginStatus,
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
