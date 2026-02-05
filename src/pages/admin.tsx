import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { getUserColorTheme } from "@/lib/colorConfig";
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
        <div className="text-sm font-medium text-gray-900 break-words flex-1">
          {formatDate(record.date ?? "")}
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
                  className="rounded-lg object-cover cursor-pointer border-2 border-green-200 mx-auto hover:border-green-400 transition-colors"
                  onClick={() =>
                    handlePhotoClick(record.timeInImage!, "timeIn", record)
                  }
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
                  className="rounded-lg object-cover cursor-pointer border-2 border-red-200 mx-auto hover:border-red-400 transition-colors"
                  onClick={() =>
                    handlePhotoClick(record.timeOutImage!, "timeOut", record)
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
  );

  // Custom columns for complex rendering
  const userColumns: Column<UserData>[] = [
    {
      key: "member",
      header: "Member",
      render: (user) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
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
            <div className="flex-shrink-0 h-12 w-12">
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
              <div className="text-sm font-medium text-gray-900 break-words">
                {user.name}
              </div>
              <div className="text-xs text-gray-500 break-all">
                {user.email}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">{renderUserActions(user)}</div>
        </div>

        {/* Member Details Grid */}
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-1">Department</div>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${memberColors.badgeBg} ${memberColors.badgeText} break-words`}
            >
              {user.department || "Unassigned"}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-1">Position</div>
            <div className="text-sm text-gray-900 break-words">
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
            <div className="text-sm text-gray-900 break-words">
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
                <div className="text-sm text-gray-900 break-words">
                  {user.timeInToday ? formatTime(user.timeInToday) : "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-1">Time Out</div>
                <div className="text-sm text-gray-900 break-words">
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
              className={`bg-gradient-to-r ${userColors.headerFrom} ${userColors.headerTo} px-4 sm:px-6 py-6 sm:py-8`}
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="text-white text-center sm:text-left flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
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
        headerColorClass={`bg-gradient-to-r ${selectedUserColors.headerFrom} ${selectedUserColors.headerTo}`}
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
    </>
  );
}
