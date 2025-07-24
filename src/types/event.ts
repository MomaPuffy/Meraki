export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  category?: "meeting" | "deadline" | "personal" | "other";
}

export interface EventFormData {
  title: string;
  description: string;
  datetime: string;
  category: CalendarEvent["category"];
}
