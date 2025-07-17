import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Navbar from "../app/components/navbar/Navbar";
import { getUserColorTheme } from "../lib/colorConfig";

interface AttendanceRecord {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  timeInImage?: {
    url: string;
    thumbnail: string;
    public_id: string;
  };
  timeOutImage?: {
    url: string;
    thumbnail: string;
    public_id: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: string;
  department?: string;
  position?: string;
  color?: string;
  createdAt: string;
}

export default function Attendance() {
  const { data: session, status } = useSession();
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [actionType, setActionType] = useState<"time-in" | "time-out" | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (session) {
        try {
          // Fetch user profile
          const profileResponse = await fetch("/api/profile");
          const profileData = await profileResponse.json();

          if (profileResponse.ok) {
            setUserProfile(profileData.user);
          }

          // Fetch attendance records
          await fetchAttendanceRecords();
        } catch (err) {
          console.error("Data fetch error:", err);
          setError("Something went wrong while fetching data");
        } finally {
          setLoading(false);
        }
      } else if (status !== "loading") {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, status]);

  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch("/api/attendance");
      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data);
      } else {
        setMessage("Failed to fetch attendance records");
      }
    } catch (error) {
      console.error("Fetch attendance error:", error);
      setMessage("Error fetching attendance records");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async (type: "time-in" | "time-out") => {
    setActionType(type);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setMessage("Camera access denied");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && actionType) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
      setShowCamera(false);

      // Submit attendance
      submitAttendance(actionType, imageData);
    }
  };

  const submitAttendance = async (
    type: "time-in" | "time-out",
    image?: string
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, image }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        fetchAttendanceRecords(); // Refresh the table

        // Auto-reload page after successful attendance recording
        setTimeout(() => {
          window.location.reload();
        }, 2000); // 2 second delay to show success message
      } else {
        setMessage(data.error || "Failed to record attendance");
      }
    } catch (error) {
      console.error("Submit attendance error:", error);
      setMessage("Error recording attendance");
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const cancelCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    }
    setShowCamera(false);
    setActionType(null);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTodayRecord = () => {
    const today = new Date().toISOString().split("T")[0];
    return attendanceRecords.find((record) => record.date === today);
  };

  const todayRecord = getTodayRecord();

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex justify-center items-center px-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-sm w-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600 text-sm sm:text-base">
              Loading attendance records...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex justify-center items-center px-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center max-w-sm w-full">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Please sign in to access attendance tracking.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex justify-center items-center px-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center max-w-sm w-full">
            <h1 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">
              Error
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">{error}</p>
          </div>
        </div>
      </>
    );
  }

  const userColors = getUserColorTheme(
    userProfile?.position,
    userProfile?.department
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 py-4 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header Section */}
            <div
              className={`bg-gradient-to-r ${userColors.headerFrom} ${userColors.headerTo} px-4 sm:px-6 py-6 sm:py-8`}
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="relative flex-shrink-0">
                  {userProfile?.image ? (
                    <Image
                      src={userProfile.image}
                      alt={`${userProfile.name}'s profile`}
                      width={100}
                      height={100}
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-30 md:h-30 rounded-full border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-30 md:h-30 rounded-full bg-gray-300 border-4 border-white shadow-lg flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-600">
                        {userProfile?.name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-white text-center sm:text-left flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
                    Attendance Management
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base md:text-lg">
                    Track your daily attendance with time-in and time-out
                    records
                  </p>
                  <div className="flex justify-center sm:justify-start items-center mt-2">
                    <span
                      className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${userColors.badgeBg} ${userColors.badgeText}`}
                    >
                      {userProfile?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Success/Error Messages */}
            {message && (
              <div className="px-4 sm:px-6 pt-6">
                <div
                  className={`p-4 rounded-lg border ${
                    message.includes("Error") || message.includes("Failed")
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-green-50 border-green-200 text-green-800"
                  }`}
                >
                  {message}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-4 sm:px-6 py-6 sm:py-8">
              {/* Action Buttons */}
              <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Today&apos;s Attendance
                </h2>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => startCamera("time-in")}
                    disabled={actionLoading || !!todayRecord?.timeIn}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      todayRecord?.timeIn
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {actionLoading && actionType === "time-in"
                      ? "Processing..."
                      : "Time In"}
                  </button>

                  <button
                    onClick={() => startCamera("time-out")}
                    disabled={
                      actionLoading ||
                      !todayRecord?.timeIn ||
                      !!todayRecord?.timeOut
                    }
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      !todayRecord?.timeIn || todayRecord?.timeOut
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {actionLoading && actionType === "time-out"
                      ? "Processing..."
                      : "Time Out"}
                  </button>
                </div>

                {todayRecord && (
                  <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-700 font-medium">
                        Today&apos;s Status
                      </p>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          todayRecord.timeOut
                            ? "bg-green-100 text-green-800"
                            : todayRecord.timeIn
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {todayRecord.timeOut
                          ? "Complete"
                          : todayRecord.timeIn
                          ? "In Progress"
                          : "Incomplete"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          Time In
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {todayRecord.timeIn
                            ? formatTime(todayRecord.timeIn)
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          Time Out
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {todayRecord.timeOut
                            ? formatTime(todayRecord.timeOut)
                            : "-"}
                        </p>
                      </div>
                    </div>
                    {(todayRecord.timeInImage || todayRecord.timeOutImage) && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Photos
                        </p>
                        <div className="flex gap-3">
                          {todayRecord.timeInImage && (
                            <div className="text-center">
                              <Image
                                src={todayRecord.timeInImage.thumbnail}
                                alt="Time In Photo"
                                width={64}
                                height={64}
                                className="rounded-lg object-cover border-2 border-green-200 cursor-pointer hover:border-green-300 transition-colors"
                                onClick={() =>
                                  window.open(
                                    todayRecord.timeInImage!.url,
                                    "_blank"
                                  )
                                }
                                title="Click to view Time In photo"
                              />
                              <p className="text-xs text-green-600 mt-1">
                                Time In
                              </p>
                            </div>
                          )}
                          {todayRecord.timeOutImage && (
                            <div className="text-center">
                              <Image
                                src={todayRecord.timeOutImage.thumbnail}
                                alt="Time Out Photo"
                                width={64}
                                height={64}
                                className="rounded-lg object-cover border-2 border-red-200 cursor-pointer hover:border-red-300 transition-colors"
                                onClick={() =>
                                  window.open(
                                    todayRecord.timeOutImage!.url,
                                    "_blank"
                                  )
                                }
                                title="Click to view Time Out photo"
                              />
                              <p className="text-xs text-red-600 mt-1">
                                Time Out
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Camera Modal */}
              {showCamera && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Take Photo for{" "}
                      {actionType === "time-in" ? "Time In" : "Time Out"}
                    </h3>
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={capturePhoto}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                      >
                        Capture Photo
                      </button>
                      <button
                        onClick={cancelCamera}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    message.includes("successfully")
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {message}
                  <button
                    onClick={() => setMessage("")}
                    className="float-right text-lg font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Attendance Records Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Attendance History
                  </h3>
                </div>

                {attendanceRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No attendance records found.</p>
                    <p className="text-sm mt-2">
                      Start by recording your first time-in!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time In
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time Out
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Photos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendanceRecords.map((record) => (
                          <tr key={record._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(record.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.timeIn ? formatTime(record.timeIn) : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.timeOut
                                ? formatTime(record.timeOut)
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex gap-2">
                                {record.timeInImage && (
                                  <Image
                                    src={record.timeInImage.thumbnail}
                                    alt="Time In Photo"
                                    width={48}
                                    height={48}
                                    className="rounded-lg object-cover cursor-pointer border-2 border-green-200"
                                    onClick={() =>
                                      window.open(
                                        record.timeInImage!.url,
                                        "_blank"
                                      )
                                    }
                                    title="Click to view Time In photo"
                                  />
                                )}
                                {record.timeOutImage && (
                                  <Image
                                    src={record.timeOutImage.thumbnail}
                                    alt="Time Out Photo"
                                    width={48}
                                    height={48}
                                    className="rounded-lg object-cover cursor-pointer border-2 border-red-200"
                                    onClick={() =>
                                      window.open(
                                        record.timeOutImage!.url,
                                        "_blank"
                                      )
                                    }
                                    title="Click to view Time Out photo"
                                  />
                                )}
                                {!record.timeInImage &&
                                  !record.timeOutImage && (
                                    <span className="text-gray-400 text-xs">
                                      No photos
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  record.timeOut
                                    ? "bg-green-100 text-green-800"
                                    : record.timeIn
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {record.timeOut
                                  ? "Complete"
                                  : record.timeIn
                                  ? "In Progress"
                                  : "Incomplete"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {attendanceRecords.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No attendance records found.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
