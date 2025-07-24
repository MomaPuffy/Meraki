import Navbar from "@/app/components/navbar/Navbar";
import Calendar from "../app/components/calendar/Calendar";

export default function CalendarPage() {
  return (
    <>
      <Navbar />
      <div className="p-6 min-h-screen bg-gray-50">
        <Calendar />
      </div>
    </>
  );
}
