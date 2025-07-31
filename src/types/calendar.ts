import { CalendarEvent } from './event';

export interface RawEventData {
  _id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  type?: string;
}

export interface CalendarContextType {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getUpcomingEvents: (days?: number) => CalendarEvent[];
  canEdit: boolean;
  isLoading: boolean;
}
