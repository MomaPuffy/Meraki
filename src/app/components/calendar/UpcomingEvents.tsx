"use client";

import React from "react";
import { useCalendar } from "../../../contexts/CalendarContext";
import Link from "next/link";

export default function UpcomingEvents() {
  const { getUpcomingEvents, canEdit } = useCalendar();
  const upcomingEvents = getUpcomingEvents();

  const formatEventDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (upcomingEvents.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-gray-500 text-sm">No upcoming events</p>
        {canEdit ? (
          <Link
            href="/calendar"
            className="w-full text-left p-2 hover:bg-gray-100 rounded block text-blue-600"
          >
            Add new event
          </Link>
        ) : (
          <Link
            href="/calendar"
            className="w-full text-left p-2 hover:bg-gray-100 rounded block text-blue-600"
          >
            View calendar
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {upcomingEvents.map((event) => (
        <div
          key={event.id}
          className="w-full text-left p-2 hover:bg-gray-100 rounded border-l-2 border-blue-500"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-sm">{event.title}</p>
              <p className="text-xs text-gray-500">
                {formatEventDate(event.date)} at {formatEventTime(event.date)}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${
                event.category === "meeting"
                  ? "bg-blue-100 text-blue-800"
                  : event.category === "deadline"
                  ? "bg-red-100 text-red-800"
                  : event.category === "personal"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {event.category}
            </span>
          </div>
        </div>
      ))}
      <Link
        href="/calendar"
        className="w-full text-left p-2 hover:bg-gray-100 rounded block text-blue-600 text-sm"
      >
        {canEdit ? "Manage events →" : "View all events →"}
      </Link>
    </div>
  );
}
