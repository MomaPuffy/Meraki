export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time: string;
  duration?: number; // in minutes
  category?: "meeting" | "deadline" | "personal" | "other";
}

export interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  category: CalendarEvent["category"];
}
