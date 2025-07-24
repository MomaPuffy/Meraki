"use client";

import { useSession } from "next-auth/react";
import Navbar from "../app/components/navbar/Navbar";
import Image from "next/image";
import ChatWidget from "../app/components/chat/ChatWidget";
import UpcomingEvents from "@/app/components/calendar/UpcomingEvents";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <>
        <Navbar />
        <div className="p-4">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Navbar />
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="p-6 min-h-screen bg-gray-50">
        {/* Main Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Hero/Welcome Module */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center min-h-[300px]">
            <Image
              src="/meraki.png"
              alt="Meraki Logo"
              height={200}
              width={200}
              className="mb-4"
            />
            <h1 className="text-2xl font-bold text-center">
              Welcome to Meraki
            </h1>
            <p className="text-gray-600 text-center mt-2">
              Coming Soon! Stay Tuned for Updates
            </p>
          </div>

          {/* Quick Actions Module */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
            <UpcomingEvents />
          </div>

          {/* Chat Widget Module */}
          <ChatWidget />

          {/* Recent Activity Module */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-2 bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300">
            <h2 className="text-lg font-semibold mb-4 text-gray-400">
              Module Slot
            </h2>
            <p className="text-gray-400">Ready for new content</p>
          </div>

          {/* Placeholder Modules for Future Expansion */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300">
            <h2 className="text-lg font-semibold mb-4 text-gray-400">
              Module Slot
            </h2>
            <p className="text-gray-400">Ready for new content</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300">
            <h2 className="text-lg font-semibold mb-4 text-gray-400">
              Module Slot
            </h2>
            <p className="text-gray-400">Ready for new content</p>
          </div>
        </div>
      </div>
    </>
  );
}
