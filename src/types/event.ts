export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date | string; // Allow both Date objects and ISO strings
  time?: string;
  duration?: number; // in minutes
  location?: string;
  category?: "meeting" | "deadline" | "personal" | "other";
}

export interface EventFormData {
  title: string;
  description: string;
  datetime: string;
  category: CalendarEvent["category"];
}
