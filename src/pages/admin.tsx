import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "../app/components/navbar/Navbar";
import { getUserColorTheme } from "../lib/colorConfig";

interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: string;
  department?: string;
  position?: string;
  color?: string;
  createdAt: string;
  lastLoginToday?: boolean;
  lastLoginTime?: string;
  timeInToday?: string;
  timeOutToday?: string;
}

export default function Admin() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");

  // Check if user has admin privileges
  const isAdmin = (position?: string) => {
    const adminPositions = ["advisor", "president", "vice-president"];
    return adminPositions.includes(position?.toLowerCase() || "");
  };

  useEffect(() => {
    const fetchData = async () => {
      if (session) {
        try {
          // First get current user to check admin privileges
          const profileResponse = await fetch("/api/profile");
          const profileData = await profileResponse.json();

          if (profileResponse.ok) {
            setCurrentUser(profileData.user);

            // Check if user has admin privileges
            if (isAdmin(profileData.user.position)) {
              // Fetch all users if admin
              const usersResponse = await fetch("/api/admin/users");
              const usersData = await usersResponse.json();

              if (usersResponse.ok) {
                setUsers(usersData.users);
              } else {
                setError(usersData.message || "Failed to fetch users");
              }
            } else {
              setError("Access denied. Admin privileges required.");
            }
          } else {
            setError(profileData.message || "Failed to fetch profile");
          }
        } catch (err) {
          console.error("Admin fetch error:", err);
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

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      !departmentFilter || user.department === departmentFilter;
    const matchesPosition = !positionFilter || user.position === positionFilter;

    return matchesSearch && matchesDepartment && matchesPosition;
  });

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
  const adminUsers = users.filter((user) => isAdmin(user.position)).length;

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex justify-center items-center px-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-sm w-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600 text-sm sm:text-base">
              Loading admin panel...
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
              Please sign in to access the admin panel.
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
    currentUser?.position,
    currentUser?.department
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
                <div className="text-white text-center sm:text-left flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
                    Admin Panel
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base md:text-lg">
                    Member Management Dashboard
                  </p>
                  <div className="flex justify-center sm:justify-start items-center mt-2">
                    <span
                      className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${userColors.badgeBg} ${userColors.badgeText}`}
                    >
                      {currentUser?.position} Access
                    </span>
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

              {/* Search and Filters */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Members
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search by name or email..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Department
                    </label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Position
                    </label>
                    <select
                      value={positionFilter}
                      onChange={(e) => setPositionFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Positions</option>
                      {positions.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Login Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => {
                        const memberColors = getUserColorTheme(
                          user.position,
                          user.department
                        );
                        return (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
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
                                        {user.name?.charAt(0).toUpperCase() ||
                                          "U"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${memberColors.badgeBg} ${memberColors.badgeText}`}
                              >
                                {user.department || "Unassigned"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.position || "Member"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.lastLoginToday ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active Today
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Not Active
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.timeInToday
                                ? new Date(user.timeInToday).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.timeOutToday ? (
                                new Date(user.timeOutToday).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              ) : user.lastLoginToday ? (
                                <span className="text-orange-600 font-medium">
                                  Still Active
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.lastLoginTime
                                ? new Date(
                                    user.lastLoginTime
                                  ).toLocaleDateString()
                                : "Never"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No members found matching your criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
