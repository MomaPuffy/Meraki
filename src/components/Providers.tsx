"use client";

import { CalendarProvider } from "@/contexts/CalendarContext";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CalendarProvider>{children}</CalendarProvider>
    </SessionProvider>
  );
}
