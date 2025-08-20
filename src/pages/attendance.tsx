import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Navbar from "@/app/components/navbar/Navbar";
import { getUserColorTheme } from "@/lib/colorConfig";
import { AttendanceRecord, UserData } from "@/types";
import {
  formatTimeForDisplay,
  formatDateForDisplay,
  getPHTDateString,
} from "@/utils/dateUtils";
import DataTable, { Column } from "@/components/DataTable";

export default function Attendance() {
  const { data: session, status } = useSession();
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [userProfile, setUserProfile] = useState<UserData | null>(null);
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
        setAttendanceRecords(data.records);
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
    return formatTimeForDisplay(dateString); // Always uses PHT
  };

  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString, false); // Explicitly use PHT
  };

  const getTodayRecord = () => {
    const today = getPHTDateString(); // Use PHT date for comparison
    // Add defensive check to ensure attendanceRecords is an array
    if (!Array.isArray(attendanceRecords)) {
      return undefined;
    }
    return attendanceRecords.find((record) => record.date === today);
  };

  const todayRecord = getTodayRecord();

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex justify-center items-center px-4">
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
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center max-w-sm w-full">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Please sign in to access attendance tracking.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center max-w-sm w-full">
          <h1 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">
            Error
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">{error}</p>
        </div>
      </div>
    );
  }

  const userColors = getUserColorTheme(
    userProfile?.position,
    userProfile?.department
  );

  // Define attendance table columns
  const attendanceColumns: Column<AttendanceRecord>[] = [
    {
      key: "date",
      header: "Date",
      render: (record) => formatDate(record.date),
    },
    {
      key: "timeIn",
      header: "Time In",
      centered: true,
      render: (record) => (record.timeIn ? formatTime(record.timeIn) : "-"),
    },
    {
      key: "timeOut",
      header: "Time Out",
      centered: true,
      render: (record) => (record.timeOut ? formatTime(record.timeOut) : "-"),
    },
    {
      key: "photos",
      header: "Photos",
      centered: true,
      mobileHidden: true,
      render: (record) => (
        <div className="flex gap-2 justify-center">
          {record.timeInImage && (
            <Image
              src={record.timeInImage.thumbnail}
              alt="Time In Photo"
              width={48}
              height={48}
              className="rounded-lg object-cover cursor-pointer border-2 border-green-200"
              onClick={() => window.open(record.timeInImage!.url, "_blank")}
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
              onClick={() => window.open(record.timeOutImage!.url, "_blank")}
              title="Click to view Time Out photo"
            />
          )}
          {!record.timeInImage && !record.timeOutImage && (
            <span className="text-gray-400 text-xs">No photos</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      centered: true,
      render: (record) => (
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
      ),
    },
  ];

  // Custom mobile card renderer for attendance records
  const renderAttendanceMobileCard = (record: AttendanceRecord) => (
    <>
      {/* Date Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-sm font-medium text-gray-900 break-words flex-1">
          {formatDate(record.date)}
        </div>
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
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
      </div>

      {/* Time Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div className="space-y-1">
          <div className="text-xs text-gray-500 mb-1">Time In</div>
          <div className="text-sm text-gray-900 break-words">
            {record.timeIn ? formatTime(record.timeIn) : "-"}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500 mb-1">Time Out</div>
          <div className="text-sm text-gray-900 break-words">
            {record.timeOut ? formatTime(record.timeOut) : "-"}
          </div>
        </div>
      </div>

      {/* Photos Section */}
      {(record.timeInImage || record.timeOutImage) && (
        <div className="pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Photos</div>
          <div className="flex gap-2 flex-wrap">
            {record.timeInImage && (
              <div className="text-center flex-shrink-0">
                <Image
                  src={record.timeInImage.thumbnail}
                  alt="Time In Photo"
                  width={48}
                  height={48}
                  className="rounded-lg object-cover cursor-pointer border-2 border-green-200 mx-auto"
                  onClick={() => window.open(record.timeInImage!.url, "_blank")}
                  title="Click to view Time In photo"
                />
                <div className="text-xs text-green-600 mt-1 break-words">
                  Time In
                </div>
              </div>
            )}
            {record.timeOutImage && (
              <div className="text-center flex-shrink-0">
                <Image
                  src={record.timeOutImage.thumbnail}
                  alt="Time Out Photo"
                  width={48}
                  height={48}
                  className="rounded-lg object-cover cursor-pointer border-2 border-red-200 mx-auto"
                  onClick={() =>
                    window.open(record.timeOutImage!.url, "_blank")
                  }
                  title="Click to view Time Out photo"
                />
                <div className="text-xs text-red-600 mt-1 break-words">
                  Time Out
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen py-4 sm:py-12 px-4 sm:px-6 lg:px-8">
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
                  Track your daily attendance with time-in and time-out records
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

            {/* Attendance Records DataTable */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance History
                </h3>
              </div>

              <div className="p-6">
                <DataTable
                  data={attendanceRecords}
                  columns={attendanceColumns} // Use the custom columns instead of auto-generation
                  renderMobileCard={renderAttendanceMobileCard} // Use the custom mobile card renderer
                  searchable
                  searchPlaceholder="Search by date (e.g., 'July 31, 2025' or '2025-07-31')..."
                  emptyMessage="No attendance records found. Start by recording your first time-in!"
                  defaultItemsPerPage={10}
                  itemsPerPageOptions={[5, 10, 25, 50]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
