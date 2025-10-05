"use client";

import React, { useEffect, useState } from "react";
import { useCalendar } from "@/contexts/CalendarContext";
import Link from "next/link";
import { CalendarEvent } from "@/types/event";
import Modal from "@/components/Modal";

export default function UpcomingEvents() {
  const { canEdit } = useCalendar();
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            date: event.date, // Keep the original date string/object
          }))
          .filter((event: CalendarEvent) => {
            // Parse date without timezone conversion for consistent comparison
            const dateStr =
              event.date instanceof Date
                ? event.date.toISOString()
                : event.date;
            const eventDate = new Date(dateStr.replace("Z", ""));
            return eventDate >= now;
          })
          .sort((a: CalendarEvent, b: CalendarEvent) => {
            // Parse dates without timezone conversion for consistent sorting
            const aDateStr =
              a.date instanceof Date ? a.date.toISOString() : a.date;
            const bDateStr =
              b.date instanceof Date ? b.date.toISOString() : b.date;
            const aDate = new Date(aDateStr.replace("Z", ""));
            const bDate = new Date(bDateStr.replace("Z", ""));
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
    // Parse the date without timezone conversion to show exactly what's in the database
    const dateStr = date instanceof Date ? date.toISOString() : date;
    const dateObj = new Date(dateStr.replace("Z", "")); // Remove Z to treat as local time
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
    // Parse the date without timezone conversion to show exactly what's in the database
    const dateStr = date instanceof Date ? date.toISOString() : date;
    const dateObj = new Date(dateStr.replace("Z", "")); // Remove Z to treat as local time
    return dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryModalHeader = (category: string) => {
    switch (category) {
      case "meeting":
        return "bg-gradient-to-r from-blue-600 to-blue-700";
      case "deadline":
        return "bg-gradient-to-r from-red-600 to-red-700";
      case "personal":
        return "bg-gradient-to-r from-green-600 to-green-700";
      default:
        return "bg-gradient-to-r from-gray-600 to-gray-700";
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "meeting":
        return "bg-blue-100 text-blue-800";
      case "deadline":
        return "bg-red-100 text-red-800";
      case "personal":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
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
    <>
      <div className="space-y-2">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            onClick={() => handleEventClick(event)}
            className="w-full text-left p-2 hover:bg-gray-100 rounded border-l-2 border-blue-500 cursor-pointer transition-colors"
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

      {/* Event Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedEvent?.title || "Event Details"}
        maxWidth="max-w-lg"
        headerColorClass={getCategoryModalHeader(
          selectedEvent?.category || "other"
        )}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Date & Time</h3>
              <p className="text-gray-700">
                {formatEventDate(selectedEvent.date)} at{" "}
                {formatEventTime(selectedEvent.date)}
              </p>
            </div>

            {selectedEvent.location && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
                <p className="text-gray-700">{selectedEvent.location}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Category</h3>
              <span
                className={`inline-block text-xs px-2 py-1 rounded ${getCategoryBadge(
                  selectedEvent.category || "other"
                )}`}
              >
                {selectedEvent.category
                  ? selectedEvent.category.charAt(0).toUpperCase() +
                    selectedEvent.category.slice(1)
                  : "Other"}
              </span>
            </div>

            {selectedEvent.duration && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Duration</h3>
                <p className="text-gray-700">
                  {selectedEvent.duration >= 60
                    ? `${Math.floor(selectedEvent.duration / 60)}h ${
                        selectedEvent.duration % 60
                      }m`
                    : `${selectedEvent.duration}m`}
                </p>
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Description
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap break-words">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            {!selectedEvent.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Description
                </h3>
                <p className="text-gray-500 italic">No description provided</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
