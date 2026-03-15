"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import UpcomingEvents from "@/app/components/calendar/UpcomingEvents";
import { getUserColorTheme } from "@/lib/colorConfig";
import Link from "next/link";
import {
  IoLogoFacebook,
  IoShareSocial,
  IoLogoInstagram,
  IoLogoTiktok,
} from "react-icons/io5";
import { GrGallery } from "react-icons/gr";
import { FaCartShopping } from "react-icons/fa6";
import YearBook from "@/app/components/yearbook/Yearbook";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 text-sm sm:text-base">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center max-w-md w-full">
          <div className="mb-6">
            <Image
              src="/meraki.png"
              alt="Meraki Logo"
              height={120}
              width={120}
              className="mx-auto"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Welcome to Meraki
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            Please sign in to access your dashboard and start exploring.
          </p>
          <p className="text-gray-500 text-xs sm:text-sm">
            Coming Soon! Stay Tuned for Updates
          </p>
        </div>
      </div>
    );
  }

  const userColors = getUserColorTheme(session.user?.position);

  return (
    <div className="min-h-screen py-4 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div
            className={`bg-linear-to-r ${userColors.headerFrom} ${userColors.headerTo} px-4 sm:px-6 py-6 sm:py-8`}
          >
            <div className="text-center">
              <div className="mb-4">
                <Image
                  src="/meraki.png"
                  alt="Meraki Logo"
                  height={80}
                  width={80}
                  className="mx-auto"
                />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white wrap-break-word">
                Welcome to Meraki
              </h1>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg mt-2">
                Your Digital Hub for Creative Excellence
              </p>
              <div className="flex justify-center items-center mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white bg-opacity-20 text-black">
                  Dashboard Overview
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* User Profile Preview Module */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                User Profile
              </h2>
            </div>
            <div className="p-6 flex items-center justify-center min-h-75">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
                <div className="relative shrink-0">
                  <Image
                    src={session.user?.image || "/meraki.png"}
                    alt={session.user?.name || "User"}
                    height={240}
                    width={240}
                    className="rounded-lg object-cover border-4 border-gray-200"
                  />
                  <div className="absolute bottom-0 right-0 bg-green-500 rounded-full w-6 h-6 border-2 border-white"></div>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    {session.user?.name || "Welcome User"}
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base mb-4">
                    {session.user?.email}
                  </p>
                  {session.user?.position && (
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-4">
                      <span className="text-blue-800 text-sm font-medium">
                        {session.user.position}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <Link
                      href="/profile"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Events Module */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-green-50 to-blue-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg
                  className="w-5 h-5 text-green-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Upcoming Events
              </h2>
            </div>
            <div className="p-6">
              <UpcomingEvents />
            </div>
          </div>

          {/* Chat Widget Module */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <GrGallery className="w-5 h-5 text-blue-600 mr-2" />
                Year Book
              </h2>
            </div>
            <div className="p-6">
              <YearBook />
            </div>
          </div>

          {/* Recent Activity Module */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-2 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-purple-50 to-pink-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <IoShareSocial className="w-5 h-5 text-purple-600 mr-2" />
                Social Media
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {/* Facebook */}
                <Link
                  href="https://www.facebook.com/share/g/1AL7ti6KMj/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <IoLogoFacebook className="w-5 h-5 mr-2" />
                  Facebook
                </Link>

                {/* TikTok */}
                <Link
                  href="https://www.tiktok.com/@pinakacutenaartclub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-3 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  <IoLogoTiktok className="w-5 h-5 mr-2" />
                  TikTok
                </Link>

                {/* Instagram */}
                <Link
                  href="https://www.instagram.com/pinakacutenaartclub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-3 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors"
                >
                  <IoLogoInstagram className="w-5 h-5 mr-2" />
                  Instagram
                </Link>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-orange-50 to-yellow-50">
              <h2 className="text-lg font-semibold text-gray-400 flex items-center">
                <FaCartShopping className="w-5 h-5 text-orange-400 mr-2" />
                Shop
              </h2>
            </div>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Coming Soon</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-teal-50 to-cyan-50">
              <h2 className="text-lg font-semibold text-gray-400 flex items-center">
                <svg
                  className="w-5 h-5 text-teal-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"
                  />
                </svg>
                Module Slot
              </h2>
            </div>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Ready for new content</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
