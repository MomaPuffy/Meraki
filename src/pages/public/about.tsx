export default function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">About Meraki</h1>
      <div className="prose max-w-none">
        <p className="text-lg mb-4">
          Welcome to Meraki - your comprehensive platform for organization
          management.
        </p>
        <p className="mb-4">
          Our platform provides tools for calendar management, attendance
          tracking, team communication, and administrative functions.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-3">Features</h2>
        <ul className="list-disc pl-6">
          <li>Calendar and event management</li>
          <li>Real-time chat functionality</li>
          <li>Attendance tracking</li>
          <li>User profile management</li>
          <li>Administrative controls</li>
        </ul>
      </div>
    </div>
  );
}
