"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="flex w-full h-15 bg-[#252525] sticky top-0 z-50">
      <div className="flex items-center mx-2 space-x-2">
        <Image src="/meraki.png" alt="Meraki logo" width={40} height={40} />
        <span className="text-2xl leading-none">Meraki</span>
      </div>
      <div
        ref={menuRef}
        className="flex items-center justify-end w-full mx-1 relative space-x-2"
      >
        <ul className="flex items-center justify-end w-full mx-1 relative space-x-2 leading-none text-lg">
          <li>
            <Link href="/" className="hover:border-b-white hover:border-b-1">
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/attendance"
              className="hover:border-b-white hover:border-b-1"
            >
              Attendance
            </Link>
          </li>
          <li>
            {status === "loading" ? null : session ? (
              <>
                <button
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="focus:outline-none"
                >
                  <Image
                    src={session.user?.image || "/meraki.png"}
                    alt="Profile logo"
                    width={40}
                    height={40}
                    className="rounded-full cursor-pointer"
                  />
                </button>
                {showMenu && (
                  <ul className="absolute -right-2 top-8 mt-5 w-auto bg-[#424242] z-10 rounded-sm">
                    <li className="hover:bg-[#515151] hover:rounded-sm">
                      <Link
                        href="/profile"
                        className="block w-full h-full px-4 py-2"
                      >
                        {session.user?.email}
                      </Link>
                    </li>
                    <li className="hover:bg-[#515151] hover:rounded-sm">
                      <button
                        className="block w-full h-full text-left px-4 py-2"
                        onClick={() => {
                          signOut();
                          setShowMenu(false);
                        }}
                      >
                        Sign out
                      </button>
                    </li>
                  </ul>
                )}
              </>
            ) : (
              <button
                className="text-white bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                onClick={() => signIn("google")}
              >
                Sign in with Google
              </button>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
