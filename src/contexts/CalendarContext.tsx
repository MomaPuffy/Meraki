"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { CalendarEvent } from "@/types/event";
import { RawEventData, CalendarContextType } from "@/types/calendar";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined
);

function CalendarProviderImpl({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Always call hooks, but guard their usage
  const sessionData = useSession();
  const authData = useAuth();

  // Safe destructuring with fallbacks
  const status = sessionData?.status || "loading";
  const isAdmin = authData?.isAdmin || false;

  // Load events from API on mount
  const fetchEvents = useCallback(async () => {
    // Skip during SSR or while session is loading
    if (!isClient || status === "loading") {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/calendar");
      if (!response.ok) {
        console.error(
          `Failed to fetch events: ${response.status} ${response.statusText}`
        );
        return;
      }
      const data = await response.json();
      setEvents(
        data.map((event: RawEventData) => ({
          ...event,
          id: event._id,
          date: new Date(event.date), // Ensure date is converted to Date object
        }))
      );
    } catch (error) {
      console.error("Failed to fetch events:", error);
      // Don't throw the error, just log it to prevent app crash
    } finally {
      setIsLoading(false);
    }
  }, [status, isClient]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (eventData: Omit<CalendarEvent, "id">) => {
    if (!isAdmin) {
      throw new Error("Only administrators can add events");
    }
    try {
      // Ensure date is valid before sending
      const event = {
        ...eventData,
        date: new Date(eventData.date).toISOString(),
      };

      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new Error("Failed to add event");
      const newEvent = await response.json();
      setEvents((prev) => [
        ...prev,
        {
          ...newEvent,
          id: newEvent._id,
          date: new Date(newEvent.date),
        },
      ]);
    } catch (error) {
      console.error("Failed to add event:", error);
      throw error;
    }
  };

  const updateEvent = async (id: string, eventData: Partial<CalendarEvent>) => {
    if (!isAdmin) {
      throw new Error("Only administrators can edit events");
    }
    try {
      const response = await fetch("/api/calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, ...eventData }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update event");
      }
      setEvents((prev) =>
        prev.map((event) =>
          event.id === id ? { ...event, ...eventData } : event
        )
      );
    } catch (error) {
      console.error("Failed to update event:", error);
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    if (!isAdmin) {
      throw new Error("Only administrators can delete events");
    }
    try {
      const response = await fetch(`/api/calendar?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete event");
      }
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (error) {
      console.error("Failed to delete event:", error);
      throw error;
    }
  };

  const getUpcomingEvents = (days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= now && eventDate <= futureDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5); // Show max 5 upcoming events
  };

  return (
    <CalendarContext.Provider
      value={{
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        getUpcomingEvents,
        canEdit: isAdmin,
        isLoading,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

// Create a client-only wrapper
const ClientOnlyCalendarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div>Loading...</div>;
  }

  return <CalendarProviderImpl>{children}</CalendarProviderImpl>;
};

export const CalendarProvider = dynamic(
  () => Promise.resolve(ClientOnlyCalendarProvider),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
}
