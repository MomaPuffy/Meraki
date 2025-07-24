"use client";

import React, { useState } from "react";
import { useCalendar } from "../../../contexts/CalendarContext";
import { CalendarEvent, EventFormData } from "../../../types/event";

export default function Calendar() {
  const { events, addEvent, deleteEvent, canEdit } = useCalendar();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: 60,
    category: "other",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventDate = new Date(formData.date);
    addEvent({
      ...formData,
      date: eventDate,
    });
    setFormData({
      title: "",
      description: "",
      date: "",
      time: "",
      duration: 60,
      category: "other",
    });
    setShowForm(false);
  };

  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        {canEdit ? (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Event
          </button>
        ) : (
          <p className="text-sm text-gray-500">Admin access required to edit</p>
        )}
      </div>

      {showForm && canEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-semibold mb-4">Add New Event</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Event title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
                <textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  rows={3}
                />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as CalendarEvent["category"],
                    })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">All Events</h2>
        {events.length === 0 ? (
          <p className="text-gray-500">No events scheduled</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="border-l-4 border-blue-500 pl-4 py-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-gray-600">
                      {formatEventDate(event.date)} at {event.time}
                    </p>
                    {event.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
