import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { getPHTDateString } from "@/utils/dateUtils";
import { withAdminAuth } from "@/utils/withAuth";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("meraki");

    // Get today's date in PHT for comparison
    const todayPHT = getPHTDateString();

    // Fetch all users
    const users = await db.collection("users").find({}).toArray();

    // Check attendance records for today to determine login status
    // Sort newest-first so the first record we encounter per user is the latest
    const attendanceRecords = await db
      .collection("attendance")
      .find({ date: todayPHT })
      .sort({ createdAt: -1 })
      .toArray();

    // Create a map of user emails to the latest attendance record for today
    const todayAttendanceMap = new Map();
    attendanceRecords.forEach((record) => {
      // Because records are sorted newest-first, only set if we haven't seen this user yet
      if (!todayAttendanceMap.has(record.userEmail)) {
        todayAttendanceMap.set(record.userEmail, {
          timeIn: record.timeIn,
          timeOut: record.timeOut || null,
        });
      }
    });

    // Get the latest login time for each user from attendance records
    const latestLogins = await db
      .collection("attendance")
      .aggregate([
        {
          $group: {
            _id: "$userEmail",
            lastLoginTime: {
              $max: {
                $cond: {
                  if: { $type: "$createdAt" },
                  then: {
                    $cond: {
                      if: { $eq: [{ $type: "$createdAt" }, "date"] },
                      then: "$createdAt",
                      else: { $dateFromString: { dateString: "$createdAt" } },
                    },
                  },
                  else: null,
                },
              },
            },
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

export default withAdminAuth(handler);
