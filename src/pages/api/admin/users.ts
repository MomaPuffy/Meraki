import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { getPHTDateString } from "@/utils/dateUtils";
import { withAdminAuth } from "@/utils/withAuth";
import { AttendanceRecord, UserData, UserProfile } from "@/types/user";
import { ObjectId } from "mongodb";
import { getUserColorKey } from "@/lib/colorConfig";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "PATCH") {
    const { userId, department, position } = req.body as {
      userId?: string;
      department?: string;
      position?: string;
    };

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    try {
      const client = await clientPromise;
      const db = client.db("meraki");

      const updateFields: Record<string, string> = {};
      if (department !== undefined) updateFields.department = department;
      if (position !== undefined) {
        updateFields.position = position;
        // Recalculate color when position changes
        updateFields.color = getUserColorKey(position, department);
      }

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(userId) }, { $set: updateFields });

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({ message: "User updated successfully" });
    } catch (err) {
      console.error("Update user error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("meraki");

    // Get today's date in PHT for comparison
    const todayPHT = getPHTDateString();

    // Fetch all users
    const users = await db.collection<UserProfile>("users").find({}).toArray();

    // Check attendance records for today to determine login status
    // Sort newest-first so the first record we encounter per user is the latest
    const attendanceRecords = await db
      .collection<AttendanceRecord>("attendance")
      .find({ date: todayPHT })
      .sort({ createdAt: -1 })
      .toArray();

    // Create a map of user emails to the latest attendance record for today
    // Handle both userEmail (new format) and fallback to matching by userName for older records
    const todayAttendanceMap = new Map<
      string,
      { timeIn: string | null; timeOut: string | null }
    >();
    const userNameToEmailMap = new Map<string, string>();

    // First, create a mapping of userNames to emails from the users collection
    users.forEach((user) => {
      if (user.email && user.name) {
        userNameToEmailMap.set(user.name, user.email);
      }
    });

    attendanceRecords.forEach((record) => {
      // Try to get email from record.userEmail, or fallback to mapping userName to email
      const userEmail =
        typeof record.userEmail === "string"
          ? record.userEmail
          : typeof record.userName === "string"
            ? userNameToEmailMap.get(record.userName)
            : undefined;

      if (
        typeof userEmail === "string" &&
        userEmail &&
        !todayAttendanceMap.has(userEmail)
      ) {
        todayAttendanceMap.set(userEmail, {
          timeIn: record.timeIn || null,
          timeOut: record.timeOut || null,
        });
      }
    });

    // Get all attendance records to determine latest login times
    const allAttendanceRecords = await db
      .collection<AttendanceRecord>("attendance")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Create a map of user emails to their latest login time
    const loginMap = new Map<string, string | null>();
    allAttendanceRecords.forEach((record) => {
      // Try to get email from record.userEmail, or fallback to mapping userName to email
      const userEmail =
        typeof record.userEmail === "string"
          ? record.userEmail
          : typeof record.userName === "string"
            ? userNameToEmailMap.get(record.userName)
            : undefined;

      if (
        typeof userEmail === "string" &&
        userEmail &&
        !loginMap.has(userEmail)
      ) {
        // Convert createdAt to proper Date object
        let loginTime: string | null = null;
        if (record.createdAt) {
          if (record.createdAt) {
            loginTime = record.createdAt;
          } else if (typeof record.createdAt === "string") {
            loginTime = new Date(record.createdAt).toISOString();
          } else if (
            typeof record.createdAt === "object" &&
            record.createdAt !== null &&
            "$date" in record.createdAt &&
            typeof (record.createdAt as { $date: string }).$date === "string"
          ) {
            loginTime = new Date(
              (record.createdAt as { $date: string }).$date,
            ).toISOString();
          }
        }
        loginMap.set(userEmail, loginTime);
      }
    });

    // Format user data with login information
    const usersWithLoginStatus: UserData[] = users.map((user) => {
      const todayAttendance = todayAttendanceMap.get(user.email);
      const lastLogin = loginMap.get(user.email);
      return {
        id: user._id?.toString() || "",
        name: user.name,
        email: user.email,
        image: user.image || undefined,
        provider: user.provider,
        department: user.department || "Unassigned",
        position: user.position || "Member",
        color: user.color || "blue",
        createdAt: user.createdAt,
        lastLoginToday: todayAttendanceMap.has(user.email),
        lastLoginTime: lastLogin ?? undefined,
        timeInToday: todayAttendance?.timeIn ?? undefined,
        timeOutToday: todayAttendance?.timeOut ?? undefined,
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

export default withAdminAuth(handler);
