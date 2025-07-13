import { useSession } from "next-auth/react";
import Navbar from "../app/components/navbar/Navbar";

export default function Profile() {
  const { data: session, status } = useSession();

  return (
    <>
      <Navbar />
      <div className="p-4">
        {status === "loading" ? (
          <p>Loading...</p>
        ) : session ? (
          <h1>Welcome, {session.user?.name || session.user?.email}!</h1>
        ) : (
          <div>
            <h1>Welcome!</h1>
          </div>
        )}
      </div>
    </>
  );
}
