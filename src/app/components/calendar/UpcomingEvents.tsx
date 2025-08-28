"use client";

import React, { useEffect, useState } from "react";
import { useCalendar } from "@/contexts/CalendarContext";
import Link from "next/link";
import { CalendarEvent } from "@/types/event";

export default function UpcomingEvents() {
  const { canEdit } = useCalendar();
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/calendar");
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const data = await response.json();
        const events = data.events || []; // Handle the new response format

        // Filter and sort upcoming events
        const now = new Date();
        const upcoming = events
          .map((event: CalendarEvent) => ({
            ...event,
            date: new Date(event.date), // Ensure date is always a Date object
          }))
          .filter((event: CalendarEvent) => {
            const eventDate =
              event.date instanceof Date ? event.date : new Date(event.date);
            return eventDate >= now;
          })
          .sort((a: CalendarEvent, b: CalendarEvent) => {
            const aDate = a.date instanceof Date ? a.date : new Date(a.date);
            const bDate = b.date instanceof Date ? b.date : new Date(b.date);
            return aDate.getTime() - bDate.getTime();
          })
          .slice(0, 3); // Show only next 3 events

        setUpcomingEvents(upcoming);
      } catch (error) {
        console.error("Error loading upcoming events:", error);
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const formatEventDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (dateObj.toDateString() === today.toDateString()) {
      return "Today";
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatEventTime = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-red-500 text-sm">{error}</p>
        <Link
          href="/calendar"
          className="w-full text-left p-2 hover:bg-gray-100 rounded block text-blue-600 text-sm"
        >
          View calendar →
        </Link>
      </div>
    );
  }

  if (upcomingEvents.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-gray-500 text-sm">No upcoming events</p>
        {canEdit ? (
          <Link
            href="/calendar"
            className="w-full text-left p-2 hover:bg-gray-100 rounded block text-blue-600 text-sm"
          >
            Add new event →
          </Link>
        ) : (
          <Link
            href="/calendar"
            className="w-full text-left p-2 hover:bg-gray-100 rounded block text-blue-600 text-sm"
          >
            View calendar →
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
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{event.title}</p>
              <p className="text-xs text-gray-500">
                {formatEventDate(event.date)} at {formatEventTime(event.date)}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ml-2 flex-shrink-0 ${
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
