"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

interface UserProfile {
  position?: string;
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  // Check if user has admin privileges
  const isAdmin = (position?: string) => {
    const adminPositions = ["advisor", "president", "vice-president"];
    return adminPositions.includes(position?.toLowerCase() || "");
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session) {
        try {
          const response = await fetch("/api/profile");
          const data = await response.json();
          if (response.ok) {
            setUserProfile(data.user);
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
        }
      }
    };

    fetchUserProfile();
  }, [session]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        mobileButtonRef.current &&
        !mobileButtonRef.current.contains(e.target as Node)
      ) {
        setShowMobileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="flex w-full h-15 bg-[#252525] sticky top-0 z-50">
      {/* Logo Section */}
      <div className="flex items-center mx-2 space-x-2">
        <Image src="/meraki.png" alt="Meraki logo" width={40} height={40} />
        <span className="text-xl sm:text-2xl leading-none text-white">
          Meraki
        </span>
      </div>

      {/* Desktop Navigation */}
      <div
        ref={menuRef}
        className="hidden md:flex items-center justify-end w-full mx-1 relative space-x-2"
      >
        <ul className="flex items-center justify-end w-full mx-1 relative space-x-2 leading-none text-lg text-white">
          <li>
            <Link
              href="/"
              className="hover:border-b-white hover:border-b-1 px-2 py-1"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/attendance"
              className="hover:border-b-white hover:border-b-1 px-2 py-1"
            >
              Attendance
            </Link>
          </li>
          {isAdmin(userProfile?.position) && (
            <li>
              <Link
                href="/admin"
                className="hover:border-b-white hover:border-b-1 px-2 py-1"
              >
                Admin
              </Link>
            </li>
          )}
          <li>
            <Link
              href="https://docs.google.com/spreadsheets/d/1BLdK3ry7XJymGRWiVIefZ1kdpxpWy-2XajthgD9ItPg"
              className="hover:border-b-white hover:border-b-1 px-2 py-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Directory
            </Link>
          </li>
          <li>
            <Link
              href="https://docs.google.com/spreadsheets/d/10AYkMS8_EohZqHXsZ3sA_qh-8iwRpfSeQTUfJa_XtMM"
              className="hover:border-b-white hover:border-b-1 px-2 py-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Task List
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
                  <ul className="absolute -right-2 top-8 mt-5 w-auto bg-[#424242] z-10 rounded-sm shadow-lg">
                    <li className="hover:bg-[#515151] hover:rounded-sm">
                      <Link
                        href="/profile"
                        className="block w-full h-full px-4 py-2 text-white whitespace-nowrap"
                      >
                        {session.user?.email}
                      </Link>
                    </li>
                    <li className="hover:bg-[#515151] hover:rounded-sm">
                      <button
                        className="block w-full h-full text-left px-4 py-2 text-white"
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
                className="text-white bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                onClick={() => signIn()}
              >
                Sign in
              </button>
            )}
          </li>
        </ul>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center justify-end w-full mx-2">
        {session && (
          <div className="flex items-center space-x-3">
            <Image
              src={session.user?.image || "/meraki.png"}
              alt="Profile"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-white text-sm truncate max-w-24">
              {session.user?.name || session.user?.email}
            </span>
          </div>
        )}
        <button
          ref={mobileButtonRef}
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="ml-2 p-2 text-white focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {showMobileMenu ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          ref={mobileMenuRef}
          className="md:hidden absolute top-full left-0 w-full bg-[#252525] border-t border-gray-600 shadow-lg z-40"
        >
          <ul className="py-2 text-white">
            <li>
              <Link
                href="/"
                className="block px-4 py-3 hover:bg-[#424242] transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/attendance"
                className="block px-4 py-3 hover:bg-[#424242] transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Attendance
              </Link>
            </li>
            {isAdmin(userProfile?.position) && (
              <li>
                <Link
                  href="/admin"
                  className="block px-4 py-3 hover:bg-[#424242] transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Admin
                </Link>
              </li>
            )}
            <li>
              <Link
                href="https://docs.google.com/spreadsheets/d/1BLdK3ry7XJymGRWiVIefZ1kdpxpWy-2XajthgD9ItPg"
                className="block px-4 py-3 hover:bg-[#424242] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Directory
              </Link>
            </li>
            <li>
              <Link
                href="https://docs.google.com/spreadsheets/d/10AYkMS8_EohZqHXsZ3sA_qh-8iwRpfSeQTUfJa_XtMM"
                className="block px-4 py-3 hover:bg-[#424242] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Task List
              </Link>
            </li>
            <li>
              <Link
                href="https://docs.google.com/spreadsheets/d/1JDq0LJWWzSISmtPTg3dt1KPX0LueThb7j1Pe95vUEDw"
                className="block px-4 py-3 hover:bg-[#424242] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Department Tasks
              </Link>
            </li>
            {session ? (
              <>
                <li>
                  <Link
                    href="/profile"
                    className="block px-4 py-3 hover:bg-[#424242] transition-colors border-t border-gray-600"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <button
                    className="block w-full text-left px-4 py-3 hover:bg-[#424242] transition-colors text-red-400"
                    onClick={() => {
                      signOut();
                      setShowMobileMenu(false);
                    }}
                  >
                    Sign out
                  </button>
                </li>
              </>
            ) : (
              <li className="border-t border-gray-600">
                <button
                  className="block w-full text-left px-4 py-3 hover:bg-[#424242] transition-colors text-blue-400"
                  onClick={() => {
                    signIn();
                    setShowMobileMenu(false);
                  }}
                >
                  Sign in
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
}
