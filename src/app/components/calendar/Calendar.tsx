"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCalendar } from "@/contexts/CalendarContext";
import { CalendarEvent, EventFormData } from "@/types/event";
import { UserData } from "@/types";
import { getUserColorTheme } from "@/lib/colorConfig";
import Modal from "@/components/Modal";

export default function Calendar() {
  const { data: session, status } = useSession();
  const { events, addEvent, deleteEvent, canEdit } = useCalendar();
  const [showForm, setShowForm] = useState(false);
  const [userProfile, setUserProfile] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    datetime: "",
    category: "other",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session) {
        try {
          const response = await fetch("/api/profile");
          const data = await response.json();
          if (response.ok) {
            setUserProfile(data.user);
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
        } finally {
          setLoading(false);
        }
      } else if (status !== "loading") {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [session, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventDate = new Date(formData.datetime);
    addEvent({
      ...formData,
      date: eventDate,
    });
    setFormData({
      title: "",
      description: "",
      datetime: "",
      category: "other",
    });
    setShowForm(false);
  };

  const formatEventDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEventTime = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "meeting":
        return "border-blue-500";
      case "deadline":
        return "border-red-500";
      case "personal":
        return "border-green-500";
      default:
        return "border-gray-500";
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "meeting":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case "deadline":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case "personal":
        return (
          <svg
            className="w-5 h-5"
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
        );
      default:
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        );
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex justify-center items-center px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 text-sm sm:text-base">
            Loading calendar...
          </p>
        </div>
      </div>
    );
  }

  const userColors = getUserColorTheme(
    userProfile?.position,
    userProfile?.department
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 py-4 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header Section */}
          <div
            className={`bg-gradient-to-r ${userColors.headerFrom} ${userColors.headerTo} px-4 sm:px-6 py-6 sm:py-8`}
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="text-white text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
                  Calendar
                </h1>
                <p className="text-blue-100 text-sm sm:text-base md:text-lg">
                  Event Management & Schedule
                </p>
                <div className="flex justify-center sm:justify-start items-center mt-2">
                  <span
                    className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${userColors.badgeBg} ${userColors.badgeText}`}
                  >
                    {canEdit ? "Admin Access" : "View Only"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Upcoming Events
              </h2>
              {canEdit ? (
                <button
                  onClick={() => setShowForm(true)}
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Event
                </button>
              ) : (
                <p className="text-sm text-gray-500 text-center sm:text-right">
                  Admin access required to manage events
                </p>
              )}
            </div>

            {/* Events Grid */}
            {events.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No events scheduled
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first event.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 ${getCategoryColor(
                      event.category!
                    )} overflow-hidden cursor-pointer`}
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`p-2 rounded-full ${getCategoryBadge(
                              event.category!
                            )}`}
                          >
                            {getCategoryIcon(event.category!)}
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(
                              event.category!
                            )}`}
                          >
                            {event.category!.charAt(0).toUpperCase() +
                              event.category!.slice(1)}
                          </span>
                        </div>
                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEvent(event.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                            title="Delete event"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Event Title */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 break-words">
                        {event.title}
                      </h3>

                      {/* Event Description */}
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-4 break-words line-clamp-3">
                          {event.description}
                        </p>
                      )}

                      {/* Event Details */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="w-4 h-4 mr-2 text-gray-400"
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
                          <span className="font-medium">
                            {formatEventDate(event.date)}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="w-4 h-4 mr-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-medium">
                            {formatEventTime(event.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={showForm && canEdit}
        onClose={() => setShowForm(false)}
        title="Add New Event"
        maxWidth="max-w-md"
        headerColorClass={`bg-gradient-to-r ${userColors.headerFrom} ${userColors.headerTo}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Event Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="Enter event title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              required
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              placeholder="Enter event description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              rows={3}
            />
          </div>
          <div>
            <label
              htmlFor="datetime"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Date & Time
            </label>
            <input
              id="datetime"
              type="datetime-local"
              value={formData.datetime}
              onChange={(e) =>
                setFormData({ ...formData, datetime: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              required
            />
          </div>
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as CalendarEvent["category"],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
            >
              <option value="meeting">Meeting</option>
              <option value="deadline">Deadline</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Add Event
            </button>
          </div>
        </form>
      </Modal>

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
    </div>
  );
}
