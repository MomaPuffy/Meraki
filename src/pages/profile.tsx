import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "../app/components/navbar/Navbar";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: string;
  googleId?: string;
  createdAt: string;
}

export default function Profile() {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session) {
        try {
          const response = await fetch("/api/profile");
          const data = await response.json();

          if (response.ok) {
            setUserProfile(data.user);
            setEditName(data.user.name); // Initialize edit name
          } else {
            setError(data.message || "Failed to fetch profile");
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
          setError("Something went wrong while fetching your profile");
        } finally {
          setLoading(false);
        }
      } else if (status !== "loading") {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [session, status]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setSaveError("Name cannot be empty");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserProfile(data.user);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
      } else {
        setSaveError(data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setSaveError("Something went wrong while updating your profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(userProfile?.name || "");
    setSaveError("");
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex justify-center items-center px-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-sm w-full">
            # TODO: Add way to change profile color based on department
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600 text-sm sm:text-base">
              Loading your profile...
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
              Please sign in to view your profile.
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 py-4 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 sm:px-6 py-6 sm:py-8">
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
                    {userProfile?.name}
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base md:text-lg break-all">
                    {userProfile?.email}
                  </p>
                  <div className="flex justify-center sm:justify-start items-center mt-2">
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                      {userProfile?.provider === "google" ? (
                        <>
                          <Image
                            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                            alt="Google"
                            width={16}
                            height={16}
                            className="mr-1 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4"
                          />
                          <span className="hidden xs:inline">Google </span>
                          Account
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="hidden xs:inline">Email </span>
                          Account
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="px-4 sm:px-6 py-6 sm:py-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Profile Information
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Success Message */}
              {saveSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-green-800 font-medium">
                      Profile updated successfully!
                    </span>
                  </div>
                </div>
              )}

              {/* Edit Mode */}
              {isEditing && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Edit Profile
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="editName"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Full Name
                      </label>
                      <input
                        id="editName"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black text-base"
                        placeholder="Enter your full name"
                        maxLength={100}
                      />
                    </div>

                    {saveError && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                        {saveError}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 w-full sm:w-auto"
                      >
                        {saving ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Save Changes
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <p className="text-base sm:text-lg text-gray-900 break-words">
                      {userProfile?.name}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <p className="text-base sm:text-lg text-gray-900 break-all">
                      {userProfile?.email}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Type
                    </label>
                    <p className="text-base sm:text-lg text-gray-900 capitalize">
                      {userProfile?.provider === "google"
                        ? "Google OAuth"
                        : "Email & Password"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User ID
                    </label>
                    <p className="text-xs sm:text-sm text-gray-600 font-mono break-all">
                      {userProfile?.id}
                    </p>
                  </div>

                  {userProfile?.googleId && (
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Google ID
                      </label>
                      <p className="text-xs sm:text-sm text-gray-600 font-mono break-all">
                        {userProfile.googleId}
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Member Since
                    </label>
                    <p className="text-base sm:text-lg text-gray-900">
                      {userProfile?.createdAt
                        ? new Date(userProfile.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Security Section */}
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Account Security
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start sm:items-center">
                    <svg
                      className="w-5 h-5 text-blue-600 mr-2 mt-0.5 sm:mt-0 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 1L5 6v6l5 5 5-5V6l-5-5zM8.5 13.5L10 12l1.5 1.5L10 15l-1.5-1.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-blue-800 font-medium text-sm sm:text-base leading-relaxed">
                      {userProfile?.provider === "google"
                        ? "Your account is secured with Google OAuth 2.0"
                        : "Your account is secured with encrypted password authentication"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
