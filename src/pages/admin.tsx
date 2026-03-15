import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  getUserColorTheme,
  POSITION_COLOR_MAP,
  DEPARTMENT_COLOR_MAP,
} from "@/lib/colorConfig";
import { formatTimeForDisplay, formatDateForDisplay } from "@/utils/dateUtils";
import { UserData, UserAttendanceModalData, AttendanceRecord } from "@/types";
import { isAdminPosition } from "@/utils/adminRoles";
import DataTable, { Column, FilterOption } from "@/components/DataTable";
import UnifiedImageViewer, {
  createAttendanceViewerProps,
} from "@/components/ImageViewer";
import Modal from "@/components/Modal";

export default function Admin() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState("");
  const [selectedUser, setSelectedUser] =
    useState<UserAttendanceModalData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editDepartment, setEditDepartment] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editActiveYears, setEditActiveYears] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkYearModal, setShowBulkYearModal] = useState(false);
  const [bulkYear, setBulkYear] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    thumbnail: string;
    type: "timeIn" | "timeOut";
    timestamp?: string;
    userName?: string;
  } | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      console.log("Fetch users response:", response);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Error fetching users");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (session) {
        try {
          setLoading(true);

          // Fetch current user profile
          const profileResponse = await fetch("/api/profile");
          const profileData = await profileResponse.json();
          if (profileResponse.ok) {
            setCurrentUser(profileData.user);
          }

          // Check admin access using utility function
          if (!isAdminPosition(profileData.user?.position)) {
            setError("Access denied. Admin privileges required.");
            return;
          }

          await fetchUsers();
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

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (
      !confirm(`Are you sure you want to reset the password for ${userEmail}?`)
    ) {
      return;
    }

    setResetLoading(userId);
    setResetMessage("");

    try {
      const response = await fetch("/api/admin/reset-user-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage(`Password reset email sent to ${userEmail}`);
        setTimeout(() => setResetMessage(""), 5000);
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      setError(`Failed to reset password: ${err}`);
    } finally {
      setResetLoading(null);
    }
  };

  const handleUserRowClick = async (user: UserData) => {
    setModalLoading(true);
    setShowModal(true);
    setSelectedUser(null);

    try {
      const response = await fetch(
        `/api/admin/user-attendance?userId=${user.id}`,
      );
      const data = await response.json();

      if (response.ok) {
        // Defensive: ensure attendance entries are sorted newest-first by createdAt
        if (data && Array.isArray(data.attendance)) {
          data.attendance = (data.attendance as AttendanceRecord[])
            .slice()
            .sort((a, b) => {
              const getComparableString = (
                val: string | Date | { $date: string } | undefined,
              ): string => {
                if (!val) return "";
                if (typeof val === "string") return val;
                if (val instanceof Date) return val.toISOString();
                if (typeof val === "object" && "$date" in val) return val.$date;
                return "";
              };
              const ta = getComparableString(a.createdAt || a.date);
              const tb = getComparableString(b.createdAt || b.date);
              return tb.localeCompare(ta);
            });
        }
        setSelectedUser(data);
      } else {
        setError(data.message || "Failed to fetch user attendance");
        setShowModal(false);
      }
    } catch (err) {
      console.error("Failed to fetch user attendance:", err);
      setError("Failed to fetch user attendance");
      setShowModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const openEditUser = (user: UserData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUser(user);
    setEditDepartment(user.department || "");
    setEditPosition(user.position || "");
    setEditActiveYears(user.activeYears || []);
    setEditMessage("");
  };

  const closeEditUser = () => {
    setEditingUser(null);
    setEditMessage("");
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setEditSaving(true);
    setEditMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          department: editDepartment,
          position: editPosition,
          activeYears: editActiveYears,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  department: editDepartment,
                  position: editPosition,
                  activeYears: editActiveYears,
                }
              : u,
          ),
        );
        setEditMessage("Saved successfully!");
        setTimeout(closeEditUser, 1000);
      } else {
        setEditMessage(data.message || "Failed to save");
      }
    } catch {
      setEditMessage("An error occurred. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleBulkAssignYear = async () => {
    if (!bulkYear || selectedUserIds.size === 0) return;
    setBulkSaving(true);
    setBulkMessage("");
    try {
      // Patch each selected user — add the year to their activeYears if not already present
      await Promise.all(
        Array.from(selectedUserIds).map(async (userId) => {
          const user = users.find((u) => u.id === userId);
          if (!user) return;
          const currentYears = user.activeYears || [];
          if (currentYears.includes(bulkYear)) return; // already has it
          const updatedYears = [...currentYears, bulkYear].sort();
          return fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, activeYears: updatedYears }),
          });
        }),
      );
      // Update local state
      setUsers((prev) =>
        prev.map((u) => {
          if (!selectedUserIds.has(u.id)) return u;
          const currentYears = u.activeYears || [];
          if (currentYears.includes(bulkYear)) return u;
          return { ...u, activeYears: [...currentYears, bulkYear].sort() };
        }),
      );
      setBulkMessage(
        `Added ${bulkYear} to ${selectedUserIds.size} member${selectedUserIds.size !== 1 ? "s" : ""}.`,
      );
      setTimeout(() => {
        setShowBulkYearModal(false);
        setSelectedUserIds(new Set());
        setBulkMessage("");
        setBulkYear("");
      }, 1500);
    } catch {
      setBulkMessage("Something went wrong. Please try again.");
    } finally {
      setBulkSaving(false);
    }
  };

  const handlePhotoClick = (
    imageData: { url?: string; fullSize?: string; thumbnail: string },
    type: "timeIn" | "timeOut",
    record?: AttendanceRecord,
    userName?: string,
  ) => {
    setSelectedPhoto({
      url: imageData.url || imageData.fullSize || "",
      thumbnail: imageData.thumbnail,
      type,
      timestamp: record
        ? `${formatDateForDisplay(record.date ?? "")} at ${formatTimeForDisplay(
            record[type] as string,
          )}`
        : undefined,
      userName: userName || selectedUser?.user.name,
    });
    setShowPhotoViewer(true);
  };

  // Helper function to format time in PHT
  const formatTime = (dateString: string) => {
    return formatTimeForDisplay(dateString);
  };

  // Helper function to format date in PHT
  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString, false);
  };

  // Define attendance table columns (matching attendance page)
  const attendanceColumns: Column<AttendanceRecord>[] = [
    {
      key: "date",
      header: "Date",
      render: (record) => formatDate(record.date ?? ""),
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
              className="rounded-lg object-cover cursor-pointer border-2 border-green-200 hover:border-green-400 transition-colors"
              onClick={() =>
                handlePhotoClick(record.timeInImage!, "timeIn", record)
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
              className="rounded-lg object-cover cursor-pointer border-2 border-red-200 hover:border-red-400 transition-colors"
              onClick={() =>
                handlePhotoClick(record.timeOutImage!, "timeOut", record)
              }
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

  // Custom mobile card renderer for attendance records (matching attendance page)
  const renderAttendanceMobileCard = (record: AttendanceRecord) => (
    <>
      {/* Date Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="text-sm font-medium text-gray-900 wrap-break-word flex-1">
          {formatDate(record.date ?? "")}
        </div>
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full shrink-0 ${
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
          <div className="text-sm text-gray-900 wrap-break-word">
            {record.timeIn ? formatTime(record.timeIn) : "-"}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500 mb-1">Time Out</div>
          <div className="text-sm text-gray-900 wrap-break-word">
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
              <div className="text-center shrink-0">
                <Image
                  src={record.timeInImage.thumbnail}
                  alt="Time In Photo"
                  width={48}
                  height={48}
                  className="rounded-lg object-cover cursor-pointer border-2 border-green-200 mx-auto hover:border-green-400 transition-colors"
                  onClick={() =>
                    handlePhotoClick(record.timeInImage!, "timeIn", record)
                  }
                  title="Click to view Time In photo"
                />
                <div className="text-xs text-green-600 mt-1 wrap-break-word">
                  Time In
                </div>
              </div>
            )}
            {record.timeOutImage && (
              <div className="text-center shrink-0">
                <Image
                  src={record.timeOutImage.thumbnail}
                  alt="Time Out Photo"
                  width={48}
                  height={48}
                  className="rounded-lg object-cover cursor-pointer border-2 border-red-200 mx-auto hover:border-red-400 transition-colors"
                  onClick={() =>
                    handlePhotoClick(record.timeOutImage!, "timeOut", record)
                  }
                  title="Click to view Time Out photo"
                />
                <div className="text-xs text-red-600 mt-1 wrap-break-word">
                  Time Out
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  // Get unique departments and positions for filters
  const departments = [
    ...new Set(users.map((user) => user.department).filter(Boolean)),
  ];
  const positions = [
    ...new Set(users.map((user) => user.position).filter(Boolean)),
  ];

  // Count statistics
  const totalUsers = users.length;
  const loggedInToday = users.filter((user) => user.lastLoginToday).length;
  const adminUsers = users.filter((user) =>
    isAdminPosition(user.position),
  ).length;

  // Define filters using computedFilters approach
  const filters: FilterOption[] = [
    {
      key: "department",
      label: "Filter by Department",
      value: departmentFilter,
      onChange: setDepartmentFilter,
      options: [
        { value: "", label: "All Departments" },
        ...departments.map((dept) => ({
          value: dept as string,
          label: dept as string,
        })),
      ],
    },
    {
      key: "position",
      label: "Filter by Position",
      value: positionFilter,
      onChange: setPositionFilter,
      options: [
        { value: "", label: "All Positions" },
        ...positions.map((pos) => ({
          value: pos as string,
          label: pos as string,
        })),
      ],
    },
    {
      key: "activityStatus", // Use a computed field name
      label: "Filter by Activity",
      value: activityFilter,
      onChange: setActivityFilter,
      options: [
        { value: "", label: "All Members" },
        { value: "active", label: "Active Today" },
        { value: "inactive", label: "Not Active Today" },
      ],
    },
  ];

  // Define computed filters
  const computedFilters = {
    activityStatus: (item: Record<string, unknown>) => {
      const user = item as unknown as UserData;
      return user.lastLoginToday ? "active" : "inactive";
    },
  };

  // Custom render functions for auto-generated columns
  const renderUserActions = (user: UserData) => (
    <div className="flex flex-col gap-1 items-center">
      <button
        onClick={(e) => openEditUser(user, e)}
        className="text-blue-600 hover:text-blue-900 text-xs"
      >
        Edit Info
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleResetPassword(user.id, user.email);
        }}
        disabled={resetLoading === user.id}
        className="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        title="Reset Password"
      >
        {resetLoading === user.id ? "Sending..." : "Reset Password"}
      </button>
    </div>
  );

  // Custom columns for complex rendering
  const userColumns: Column<UserData>[] = [
    {
      key: "select",
      header: "",
      centered: true,
      render: (user) => (
        <input
          type="checkbox"
          checked={selectedUserIds.has(user.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedUserIds((prev) => {
              const next = new Set(prev);
              if (next.has(user.id)) {
                next.delete(user.id);
              } else {
                next.add(user.id);
              }
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      ),
    },
    {
      key: "member",
      header: "Member",
      render: (user) => (
        <div className="flex items-center">
          <div className="shrink-0 h-10 w-10">
            {user.image ? (
              <Image
                src={user.image}
                alt={`${user.name}'s profile`}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      centered: true,
      render: (user) => {
        const memberColors = getUserColorTheme(user.position, user.department);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${memberColors.badgeBg} ${memberColors.badgeText}`}
          >
            {user.department || "Unassigned"}
          </span>
        );
      },
    },
    {
      key: "position",
      header: "Position",
      centered: true,
      render: (user) => user.position || "Member",
    },
    {
      key: "loginStatus",
      header: "Login Status",
      centered: true,
      render: (user) =>
        user.lastLoginToday ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active Today
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Not Active
          </span>
        ),
    },
    {
      key: "timeInToday",
      header: "Time In",
      centered: true,
      mobileHidden: true,
      render: (user) => (user.timeInToday ? formatTime(user.timeInToday) : "-"),
    },
    {
      key: "timeOutToday",
      header: "Time Out",
      centered: true,
      mobileHidden: true,
      render: (user) => {
        if (user.timeOutToday) {
          return formatTime(user.timeOutToday);
        } else if (user.lastLoginToday) {
          return (
            <span className="text-orange-600 font-medium">Still Active</span>
          );
        }
        return "-";
      },
    },
    {
      key: "lastLoginTime",
      header: "Last Login",
      centered: true,
      render: (user) =>
        user.lastLoginTime ? formatDate(user.lastLoginTime ?? "") : "Never",
    },
    {
      key: "actions",
      header: "Actions",
      centered: true,
      render: renderUserActions,
    },
  ];

  // Custom mobile card renderer for users
  const renderUserMobileCard = (user: UserData) => {
    const memberColors = getUserColorTheme(user.position, user.department);

    return (
      <>
        {/* Member Header */}
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <div className="shrink-0 h-12 w-12">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={`${user.name}'s profile`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-lg font-medium text-gray-600">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 wrap-break-word">
                {user.name}
              </div>
              <div className="text-xs text-gray-500 break-all">
                {user.email}
              </div>
            </div>
          </div>
          <div className="shrink-0">{renderUserActions(user)}</div>
        </div>

        {/* Member Details Grid */}
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-1">Department</div>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${memberColors.badgeBg} ${memberColors.badgeText} wrap-break-word`}
            >
              {user.department || "Unassigned"}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-1">Position</div>
            <div className="text-sm text-gray-900 wrap-break-word">
              {user.position || "Member"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            {user.lastLoginToday ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active Today
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Not Active
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-1">Last Login</div>
            <div className="text-sm text-gray-900 wrap-break-word">
              {user.lastLoginTime
                ? formatDate(user.lastLoginTime ?? "")
                : "Never"}
            </div>
          </div>
        </div>

        {/* Time Information */}
        {(user.timeInToday || user.timeOutToday) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-1">Time In</div>
                <div className="text-sm text-gray-900 wrap-break-word">
                  {user.timeInToday ? formatTime(user.timeInToday) : "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-1">Time Out</div>
                <div className="text-sm text-gray-900 wrap-break-word">
                  {user.timeOutToday ? (
                    formatTime(user.timeOutToday)
                  ) : user.lastLoginToday ? (
                    <span className="text-orange-600 font-medium">
                      Still Active
                    </span>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 text-sm sm:text-base">
            Loading admin panel...
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
            Please sign in to access the admin panel.
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
    currentUser?.position,
    currentUser?.department,
  );

  const selectedUserColors = getUserColorTheme(
    selectedUser?.user.position,
    selectedUser?.user.department,
  );

  return (
    <>
      <div className="min-h-screen py-4 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header Section */}
            <div
              className={`bg-linear-to-r ${userColors.headerFrom} ${userColors.headerTo} px-4 sm:px-6 py-6 sm:py-8`}
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="text-white text-center sm:text-left flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold wrap-break-word">
                    Admin Panel
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base md:text-lg">
                    Member Management Dashboard
                  </p>
                  <div className="flex justify-center sm:justify-start items-center mt-2 space-x-2">
                    <span
                      className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${userColors.badgeBg} ${userColors.badgeText}`}
                    >
                      {currentUser?.position} Access
                    </span>
                    <a
                      href="/admin/yearbook"
                      className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      Manage Yearbook
                    </a>
                    <a
                      href="/admin/products"
                      className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      Manage Products
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="px-4 sm:px-6 py-6 sm:py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                      {totalUsers}
                    </div>
                    <div className="text-sm text-blue-800">Total Members</div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">
                      {loggedInToday}
                    </div>
                    <div className="text-sm text-green-800">
                      Logged In Today
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                      {adminUsers}
                    </div>
                    <div className="text-sm text-purple-800">Admin Users</div>
                  </div>
                </div>
              </div>

              {resetMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-700 text-sm">{resetMessage}</p>
                </div>
              )}

              {/* Bulk action toolbar */}
              {selectedUserIds.size > 0 && (
                <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <span className="text-sm text-blue-800 font-medium">
                    {selectedUserIds.size} member
                    {selectedUserIds.size !== 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkYearModal(true);
                        setBulkYear("");
                        setBulkMessage("");
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Assign School Year
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds(new Set())}
                      className="px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <DataTable
                data={users as unknown as Record<string, unknown>[]}
                columns={
                  userColumns as unknown as Column<Record<string, unknown>>[]
                }
                searchable
                searchPlaceholder="Search by name, email, department, position, or provider..."
                searchFields={[
                  "name",
                  "email",
                  "position",
                  "department",
                  "provider",
                  "id",
                ]}
                filters={filters}
                computedFilters={computedFilters}
                onRowClick={(item) =>
                  handleUserRowClick(item as unknown as UserData)
                }
                renderMobileCard={(item) =>
                  renderUserMobileCard(item as unknown as UserData)
                }
                emptyMessage="No members found matching your criteria."
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* User Attendance Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={
          selectedUser
            ? `${selectedUser.user.name}'s Attendance Log`
            : "Loading..."
        }
        maxWidth="max-w-4xl"
        headerColorClass={`bg-linear-to-r ${selectedUserColors.headerFrom} ${selectedUserColors.headerTo}`}
      >
        {modalLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">
              Loading attendance records...
            </span>
          </div>
        ) : selectedUser ? (
          <>
            {/* User Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{selectedUser.user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedUser.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">
                    {selectedUser.user.department || "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Position</p>
                  <p className="font-medium">
                    {selectedUser.user.position || "Member"}
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance Records DataTable */}
            <div className="p-6">
              <DataTable
                data={selectedUser.attendance}
                columns={
                  attendanceColumns as unknown as Column<
                    (typeof selectedUser.attendance)[0]
                  >[]
                }
                renderMobileCard={renderAttendanceMobileCard}
                searchable
                searchPlaceholder="Search by date (e.g., 'July 31, 2025' or '2025-07-31')..."
                emptyMessage="No attendance records found for this user."
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 25, 50]}
              />
            </div>
          </>
        ) : null}
      </Modal>

      {/* Attendance Photo Viewer */}
      {selectedPhoto && (
        <UnifiedImageViewer
          {...createAttendanceViewerProps(
            {
              isOpen: showPhotoViewer,
              onClose: () => setShowPhotoViewer(false),
              imageUrl: selectedPhoto.url,
              imageAlt:
                selectedPhoto.type === "timeIn"
                  ? "Time In Photo"
                  : "Time Out Photo",
              title:
                selectedPhoto.type === "timeIn"
                  ? "Time In Photo"
                  : "Time Out Photo",
              subtitle: [selectedPhoto.userName, selectedPhoto.timestamp]
                .filter(Boolean)
                .join(" • "),
            },
            selectedPhoto,
          )}
        />
      )}

      {/* Bulk Assign School Year Modal */}
      <Modal
        isOpen={showBulkYearModal}
        onClose={() => setShowBulkYearModal(false)}
        title={`Assign School Year — ${selectedUserIds.size} member${selectedUserIds.size !== 1 ? "s" : ""}`}
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a school year to add to all selected members. This won&apos;t
            remove any years they already have.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Year
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, i) => {
                const start = new Date().getFullYear() - 3 + i;
                const year = `${start}-${start + 1}`;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setBulkYear(year)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      bulkYear === year
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
          {bulkMessage && (
            <p
              className={`text-sm ${bulkMessage.includes("wrong") ? "text-red-600" : "text-green-600"}`}
            >
              {bulkMessage}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowBulkYearModal(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkAssignYear}
              disabled={!bulkYear || bulkSaving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {bulkSaving ? "Assigning..." : "Assign"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={closeEditUser}
        title={editingUser ? `Edit — ${editingUser.name}` : ""}
        maxWidth="max-w-md"
        headerColorClass={`bg-linear-to-r ${getUserColorTheme(editingUser?.position, editingUser?.department).headerFrom} ${getUserColorTheme(editingUser?.position, editingUser?.department).headerTo}`}
      >
        {editingUser &&
          (() => {
            // Generate a list of school years: 3 past + current + 2 future
            const currentCalendarYear = new Date().getFullYear();
            const schoolYears = Array.from({ length: 6 }, (_, i) => {
              const start = currentCalendarYear - 3 + i;
              return `${start}-${start + 1}`;
            });

            const toggleYear = (year: string) => {
              setEditActiveYears((prev) =>
                prev.includes(year)
                  ? prev.filter((y) => y !== year)
                  : [...prev, year].sort(),
              );
            };

            return (
              <div className="space-y-5">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Unassigned</option>
                    {Object.keys(DEPARTMENT_COLOR_MAP).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept.charAt(0).toUpperCase() + dept.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Member</option>
                    {Object.keys(POSITION_COLOR_MAP).map((pos) => (
                      <option key={pos} value={pos}>
                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active School Years */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Active School Years
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Select every year this member is/was active. Used to filter
                    yearbook pulls.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {schoolYears.map((year) => {
                      const active = editActiveYears.includes(year);
                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => toggleYear(year)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                  {editActiveYears.length === 0 && (
                    <p className="text-xs text-amber-500 mt-1">
                      No years selected — this member won&apos;t appear in any
                      yearbook pull.
                    </p>
                  )}
                </div>

                {editMessage && (
                  <p
                    className={`text-sm ${editMessage.includes("success") ? "text-green-600" : "text-red-600"}`}
                  >
                    {editMessage}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeEditUser}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {editSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </>
  );
}
