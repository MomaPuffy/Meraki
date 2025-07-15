"use client";

import { useSession } from "next-auth/react";
import Navbar from "../app/components/navbar/Navbar";
import Image from "next/image";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <>
      <Navbar />
      <div className="p-4">
        {status === "loading" ? (
          <p>Loading...</p>
        ) : session ? (
          <div className="flex flex-col items-center justify-center h-[90vh]">
            <Image
              src="/meraki.png"
              alt="Meraki Log"
              height={500}
              width={500}
            />
            <h1 className="text-2xl font-bold mb-4">
              Coming Soon! Stay Tuned for Updates
            </h1>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
          </div>
        )}
      </div>
    </>
  );
}
