import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { getPHTDateString } from "@/utils/dateUtils";
import { withAdminAuth } from "@/utils/withAuth";
import { authorize } from "@/lib/auth/authorize";
import { AttendanceRecord, UserData, UserProfile } from "@/types/user";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await authorize(req, res, { roles: ["admin"] });
  if (!session) return res.status(401).json({ message: "Unauthorized" }); // Authorization failed, response already sent

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
    const todayAttendanceMap = new Map<string, { timeIn: string | null; timeOut: string | null }>();
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
        record.userEmail || userNameToEmailMap.get(record.userName || "");

      if (userEmail && !todayAttendanceMap.has(userEmail)) {
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
    const loginMap = new Map<string, Date | null>();
    allAttendanceRecords.forEach((record) => {
      // Try to get email from record.userEmail, or fallback to mapping userName to email
      const userEmail =
        record.userEmail || userNameToEmailMap.get(record.userName || "");

      if (userEmail && !loginMap.has(userEmail)) {
        // Convert createdAt to proper Date object
        let loginTime = null;
        if (record.createdAt) {
          if (record.createdAt instanceof Date) {
            loginTime = record.createdAt;
          } else if (typeof record.createdAt === "string") {
            loginTime = new Date(record.createdAt);
          } else if (record.createdAt.$date) {
            loginTime = new Date(record.createdAt.$date);
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
        lastLoginTime: lastLogin ? lastLogin.toISOString() : undefined,
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
