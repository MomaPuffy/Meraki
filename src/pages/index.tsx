"use client";

import { useSession } from "next-auth/react";
import Navbar from "../app/components/navbar/Navbar";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <>
      <Navbar />
      <div className="p-4">
        {status === "loading" ? (
          <p>Loading...</p>
        ) : session ? (
          <div>This is the Home screen</div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
          </div>
        )}
      </div>
    </>
  );
}
