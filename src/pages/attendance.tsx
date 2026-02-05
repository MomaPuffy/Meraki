import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { getUserColorTheme } from "@/lib/colorConfig";
import { AttendanceRecord, UserData } from "@/types";
import {
  formatTimeForDisplay,
  formatDateForDisplay,
  getPHTDateString,
} from "@/utils/dateUtils";
import DataTable, { Column } from "@/components/DataTable";
import * as Camera from "@capacitor/camera";
import { useAsyncUpload } from "@/hooks/useAsyncUpload";

// Minimal runtime shape for the Capacitor Camera photo result we use.
type CapacitorPhoto = {
  dataUrl?: string;
  base64String?: string;
  webPath?: string;
};

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
  const [actionType, setActionType] = useState<"time-in" | "time-out" | null>(
    null,
  );
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Initialize async upload hook
  const { startPolling } = useAsyncUpload({
    onComplete: (result) => {
      console.log("Upload completed:", result);
      setUploadStatus("Upload completed successfully!");
      // Refresh attendance records to show the updated images
      fetchAttendanceRecords();
      // Clear status after a few seconds
      setTimeout(() => setUploadStatus(""), 3000);
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      setUploadStatus(`Upload failed: ${error}`);
      // Clear status after a few seconds
      setTimeout(() => setUploadStatus(""), 5000);
    },
  });
  // Using Capacitor Camera plugin via dynamic import (client-only). No live preview.

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
        // Defensive: ensure records are sorted newest-first by createdAt
        const records: AttendanceRecord[] = Array.isArray(data.records)
          ? (data.records as AttendanceRecord[])
              .slice()
              .sort((a: AttendanceRecord, b: AttendanceRecord) => {
                const ta = String(a.createdAt || a.date || "");
                const tb = String(b.createdAt || b.date || "");
                return tb.localeCompare(ta);
              })
          : [];
        setAttendanceRecords(records);
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

  const checkCameraSupport = async () => {
    // Lightweight client-only check. We assume static import is used for Capacitor.
    if (typeof window === "undefined") {
      return { supported: false, error: "Camera not available on server" };
    }

    // If running in a browser environment, assume Camera plugin is available when installed in native builds.
    return { supported: true };
  };

  const startCamera = async (type: "time-in" | "time-out") => {
    setActionType(type);
    setMessage("");

    try {
      // Use the statically imported Capacitor Camera module.
      const photoRaw = await Camera.Camera.getPhoto({
        quality: 80,
        resultType: Camera.CameraResultType.DataUrl,
        source: Camera.CameraSource.Camera,
        width: 1280,
        allowEditing: false,
      });

      const photo = photoRaw as unknown as CapacitorPhoto;

      // Normalize to data URL (prefer dataUrl, then base64, then webPath)
      const dataUrl =
        photo.dataUrl ||
        (photo.base64String
          ? `data:image/jpeg;base64,${photo.base64String}`
          : photo.webPath);

      if (!dataUrl) {
        setMessage("Failed to capture image.");
        setActionType(null);
        return;
      }

      // Submit attendance (submitAttendance manages actionLoading)
      await submitAttendance(type, dataUrl as string);
    } catch (err) {
      console.error("Capacitor Camera error:", err);
      let errorMessage = "Camera capture failed or was cancelled.";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage =
            "Camera permission denied. Please allow camera access.";
        }
      }
      setMessage(errorMessage);
    } finally {
      setActionType(null);
    }
  };

  const submitAttendance = async (
    type: "time-in" | "time-out",
    image?: string,
  ) => {
    setActionLoading(true);
    setUploadStatus("");

    try {
      const response = await fetch("/api/attendance/async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, image }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);

        // If there's an upload job, start polling for completion
        if (data.uploadJobId && image) {
          setUploadStatus("Uploading image...");
          startPolling(data.uploadJobId);
        }

        // Refresh the table immediately (will show pending status for images)
        fetchAttendanceRecords();
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

  const formatTime = (dateString: string) => {
    return formatTimeForDisplay(dateString); // Always uses PHT
  };

  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString, false); // Explicitly use PHT
  };

  // Return today's records (could be multiple) and the latest open record (timeIn without timeOut)
  const getTodayRecords = () => {
    const today = getPHTDateString(); // Use PHT date for comparison
    if (!Array.isArray(attendanceRecords)) return [];
    // Filter for today's date and ensure newest-first order by createdAt
    return attendanceRecords
      .filter((record) => record.date === today)
      .slice()
      .sort((a, b) => {
        const ta = String(a.createdAt || a.date || "");
        const tb = String(b.createdAt || b.date || "");
        return tb.localeCompare(ta);
      });
  };

  const todayRecords = getTodayRecords();
  // Find the most recent record for today that has a timeIn but no timeOut
  const openRecord = todayRecords.find((r) => r.timeIn && !r.timeOut);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 text-sm sm:text-base">
            Loading attendance records...
          </p>
        </div>
      </div>
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
    userProfile?.department,
  );

  // Define attendance table columns
  const attendanceColumns: Column<AttendanceRecord>[] = [
    {
      key: "date",
      header: "Date",
      render: (record) => formatDate(record.date || ""),
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
          {/* Time In Image */}
          {record.timeInImage && (
            <>
              {record.timeInImage.status === "pending" ? (
                <div className="w-12 h-12 rounded-lg border-2 border-green-200 flex items-center justify-center bg-green-50">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                </div>
              ) : record.timeInImage.status === "failed" ? (
                <div
                  className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50"
                  title="Upload failed"
                >
                  <span className="text-red-600 text-xs">✗</span>
                </div>
              ) : record.timeInImage.thumbnail ? (
                <Image
                  src={record.timeInImage.thumbnail}
                  alt="Time In Photo"
                  width={48}
                  height={48}
                  className="rounded-lg object-cover cursor-pointer border-2 border-green-200"
                  onClick={() => window.open(record.timeInImage!.url, "_blank")}
                  title="Click to view Time In photo"
                />
              ) : null}
            </>
          )}

          {/* Time Out Image */}
          {record.timeOutImage && (
            <>
              {record.timeOutImage.status === "pending" ? (
                <div className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                </div>
              ) : record.timeOutImage.status === "failed" ? (
                <div
                  className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50"
                  title="Upload failed"
                >
                  <span className="text-red-600 text-xs">✗</span>
                </div>
              ) : record.timeOutImage.thumbnail ? (
                <Image
                  src={record.timeOutImage.thumbnail}
                  alt="Time Out Photo"
                  width={48}
                  height={48}
                  className="rounded-lg object-cover cursor-pointer border-2 border-red-200"
                  onClick={() =>
                    window.open(record.timeOutImage!.url, "_blank")
                  }
                  title="Click to view Time Out photo"
                />
              ) : null}
            </>
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
          {formatDate(record.date || "")}
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
                {record.timeInImage.status === "pending" ? (
                  <div className="w-12 h-12 rounded-lg border-2 border-green-200 flex items-center justify-center bg-green-50 mx-auto">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  </div>
                ) : record.timeInImage.status === "failed" ? (
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50 mx-auto"
                    title="Upload failed"
                  >
                    <span className="text-red-600 text-xs">✗</span>
                  </div>
                ) : record.timeInImage.thumbnail ? (
                  <Image
                    src={record.timeInImage.thumbnail}
                    alt="Time In Photo"
                    width={48}
                    height={48}
                    className="rounded-lg object-cover cursor-pointer border-2 border-green-200 mx-auto"
                    onClick={() =>
                      window.open(record.timeInImage!.url, "_blank")
                    }
                    title="Click to view Time In photo"
                  />
                ) : null}
                <div className="text-xs text-green-600 mt-1 break-words">
                  Time In
                  {record.timeInImage.status === "pending" && " (Uploading...)"}
                  {record.timeInImage.status === "failed" && " (Failed)"}
                </div>
              </div>
            )}
            {record.timeOutImage && (
              <div className="text-center flex-shrink-0">
                {record.timeOutImage.status === "pending" ? (
                  <div className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50 mx-auto">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  </div>
                ) : record.timeOutImage.status === "failed" ? (
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50 mx-auto"
                    title="Upload failed"
                  >
                    <span className="text-red-600 text-xs">✗</span>
                  </div>
                ) : record.timeOutImage.thumbnail ? (
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
                ) : null}
                <div className="text-xs text-red-600 mt-1 break-words">
                  Time Out
                  {record.timeOutImage.status === "pending" &&
                    " (Uploading...)"}
                  {record.timeOutImage.status === "failed" && " (Failed)"}
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

          {/* Upload Status Messages */}
          {uploadStatus && (
            <div className="px-4 sm:px-6 pt-4">
              <div
                className={`p-3 rounded-lg border flex items-center space-x-2 ${
                  uploadStatus.includes("failed") ||
                  uploadStatus.includes("Failed")
                    ? "bg-red-50 border-red-200 text-red-800"
                    : uploadStatus.includes("completed")
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                {uploadStatus.includes("Uploading") && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
                <span className="text-sm">{uploadStatus}</span>
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
                  onClick={async () => {
                    const cameraCheck = await checkCameraSupport();
                    if (!cameraCheck.supported) {
                      setMessage(cameraCheck.error || "Camera not supported");
                      return;
                    }
                    startCamera("time-in");
                  }}
                  // Disable Time In when there's an open (untimed-out) record
                  disabled={actionLoading || !!openRecord}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    openRecord
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {actionLoading && actionType === "time-in"
                    ? "Processing..."
                    : "Time In"}
                </button>

                <button
                  onClick={async () => {
                    const cameraCheck = await checkCameraSupport();
                    if (!cameraCheck.supported) {
                      setMessage(cameraCheck.error || "Camera not supported");
                      return;
                    }
                    startCamera("time-out");
                  }}
                  // Enable Time Out only when there's an open (untimed-out) record
                  disabled={actionLoading || !openRecord}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    !openRecord
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {actionLoading && actionType === "time-out"
                    ? "Processing..."
                    : "Time Out"}
                </button>
              </div>

              {todayRecords.length > 0 && (
                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-700 font-medium">
                      Today&apos;s Entries ({todayRecords.length})
                    </p>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        openRecord
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {openRecord ? "Open Entry" : "All Complete"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {todayRecords.map((rec) => (
                      <div
                        key={rec.id || `${rec.date}-${rec.timeIn}`}
                        className="p-3 bg-gray-50 rounded-md border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-900 font-medium">
                            {rec.timeIn ? formatTime(rec.timeIn) : "-"}
                            {rec.timeOut && (
                              <span className="ml-2 text-xs text-gray-500">
                                → {formatTime(rec.timeOut)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {rec.timeOut
                              ? "Complete"
                              : rec.timeIn
                                ? "In Progress"
                                : "Incomplete"}
                          </div>
                        </div>
                        {(rec.timeInImage || rec.timeOutImage) && (
                          <div className="flex gap-3">
                            {rec.timeInImage && (
                              <div className="text-center">
                                {rec.timeInImage.status === "pending" ? (
                                  <div className="w-12 h-12 rounded-lg border-2 border-green-200 flex items-center justify-center bg-green-50">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                  </div>
                                ) : rec.timeInImage.status === "failed" ? (
                                  <div
                                    className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50"
                                    title="Image upload failed"
                                  >
                                    <span className="text-red-600 text-xs">
                                      ✗
                                    </span>
                                  </div>
                                ) : rec.timeInImage.thumbnail ? (
                                  <Image
                                    src={rec.timeInImage.thumbnail}
                                    alt="Time In Photo"
                                    width={48}
                                    height={48}
                                    className="rounded-lg object-cover border-2 border-green-200 cursor-pointer"
                                    onClick={() =>
                                      window.open(
                                        rec.timeInImage!.url,
                                        "_blank",
                                      )
                                    }
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gray-50">
                                    <span className="text-gray-400 text-xs">
                                      📷
                                    </span>
                                  </div>
                                )}
                                <div className="text-xs text-green-600 mt-1">
                                  In
                                  {rec.timeInImage.status === "pending" &&
                                    " ⏳"}
                                  {rec.timeInImage.status === "failed" && " ❌"}
                                </div>
                              </div>
                            )}
                            {rec.timeOutImage && (
                              <div className="text-center">
                                {rec.timeOutImage.status === "pending" ? (
                                  <div className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                  </div>
                                ) : rec.timeOutImage.status === "failed" ? (
                                  <div
                                    className="w-12 h-12 rounded-lg border-2 border-red-200 flex items-center justify-center bg-red-50"
                                    title="Image upload failed"
                                  >
                                    <span className="text-red-600 text-xs">
                                      ✗
                                    </span>
                                  </div>
                                ) : rec.timeOutImage.thumbnail ? (
                                  <Image
                                    src={rec.timeOutImage.thumbnail}
                                    alt="Time Out Photo"
                                    width={48}
                                    height={48}
                                    className="rounded-lg object-cover border-2 border-red-200 cursor-pointer"
                                    onClick={() =>
                                      window.open(
                                        rec.timeOutImage!.url,
                                        "_blank",
                                      )
                                    }
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gray-50">
                                    <span className="text-gray-400 text-xs">
                                      📷
                                    </span>
                                  </div>
                                )}
                                <div className="text-xs text-red-600 mt-1">
                                  Out
                                  {rec.timeOutImage.status === "pending" &&
                                    " ⏳"}
                                  {rec.timeOutImage.status === "failed" &&
                                    " ❌"}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Camera capture is handled via Capacitor Camera (single-shot).
        No in-page live preview is used when running with Capacitor.
      */}

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
