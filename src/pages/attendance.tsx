import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../app/components/navbar/Navbar";

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

export default function Attendance() {
  const { data: session } = useSession();
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [actionType, setActionType] = useState<"time-in" | "time-out" | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (session) {
      fetchAttendanceRecords();
    }
  }, [session]);

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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="p-4">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading attendance records...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Attendance Management
          </h1>
          <p className="text-gray-600">
            Track your daily attendance with time-in and time-out records
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Attendance</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => startCamera("time-in")}
              disabled={actionLoading || !!todayRecord?.timeIn}
              className={`px-6 py-3 rounded-lg font-medium ${
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
                actionLoading || !todayRecord?.timeIn || !!todayRecord?.timeOut
              }
              className={`px-6 py-3 rounded-lg font-medium ${
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
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Today:</strong>
                {todayRecord.timeIn &&
                  ` Time In: ${formatTime(todayRecord.timeIn)}`}
                {todayRecord.timeOut &&
                  ` | Time Out: ${formatTime(todayRecord.timeOut)}`}
              </p>
              {(todayRecord.timeInImage || todayRecord.timeOutImage) && (
                <div className="flex gap-2 mt-2">
                  {todayRecord.timeInImage && (
                    <img
                      src={todayRecord.timeInImage.thumbnail}
                      alt="Time In Photo"
                      className="w-16 h-16 rounded-lg object-cover border-2 border-green-200 cursor-pointer"
                      onClick={() =>
                        window.open(todayRecord.timeInImage!.url, "_blank")
                      }
                      title="Click to view Time In photo"
                    />
                  )}
                  {todayRecord.timeOutImage && (
                    <img
                      src={todayRecord.timeOutImage.thumbnail}
                      alt="Time Out Photo"
                      className="w-16 h-16 rounded-lg object-cover border-2 border-red-200 cursor-pointer"
                      onClick={() =>
                        window.open(todayRecord.timeOutImage!.url, "_blank")
                      }
                      title="Click to view Time Out photo"
                    />
                  )}
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Attendance History
            </h2>
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
                        {record.timeOut ? formatTime(record.timeOut) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex gap-2">
                          {record.timeInImage && (
                            <img
                              src={record.timeInImage.thumbnail}
                              alt="Time In Photo"
                              className="w-12 h-12 rounded-lg object-cover cursor-pointer border-2 border-green-200"
                              onClick={() =>
                                window.open(record.timeInImage!.url, "_blank")
                              }
                              title="Click to view Time In photo"
                            />
                          )}
                          {record.timeOutImage && (
                            <img
                              src={record.timeOutImage.thumbnail}
                              alt="Time Out Photo"
                              className="w-12 h-12 rounded-lg object-cover cursor-pointer border-2 border-red-200"
                              onClick={() =>
                                window.open(record.timeOutImage!.url, "_blank")
                              }
                              title="Click to view Time Out photo"
                            />
                          )}
                          {!record.timeInImage && !record.timeOutImage && (
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
        </div>
      </div>
    </>
  );
}
