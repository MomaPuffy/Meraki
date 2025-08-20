"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useAuth } from "@/hooks/useAuth";
import { GoPerson } from "react-icons/go";

export default function Navbar() {
  const { data: session, status } = useSession();
  const { isAdmin } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

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

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowMenu(false);
        setShowMobileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    console.log("Navbar mounted, session status:", status);
    console.log("Session data:", session);
    console.log("Is admin:", isAdmin);
  }, [session, status, isAdmin]);

  return (
    <nav className="flex w-full h-15 bg-[#252525] sticky top-0 z-50">
      {/* Logo Section */}
      <Link href="/" className="flex items-center mx-2 space-x-2">
        <Image src="/meraki.png" alt="Meraki logo" width={40} height={40} />
        <span className="text-xl sm:text-2xl leading-none text-white">
          Meraki
        </span>
      </Link>

      {/* Desktop Navigation */}
      <div
        ref={menuRef}
        className="hidden md:flex items-center justify-end w-full mx-1 relative space-x-2"
      >
        <ul className="flex items-center justify-end w-full mx-1 relative space-x-2 leading-none text-lg text-white">
          <li>
            <Link
              href="/dashboard"
              className="hover:border-b-white hover:border-b-1 px-2 py-1"
            >
              Dashboard
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
          <li>
            <Link
              href="/chat"
              className="hover:border-b-white hover:border-b-1 px-2 py-1"
            >
              Chat
            </Link>
          </li>
          {isAdmin && (
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
              <div className="relative">
                <button
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#252525] rounded-full transition-all duration-200"
                  aria-expanded={showMenu}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <Image
                    src={session.user?.image || "/meraki.png"}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full cursor-pointer border-2 border-transparent hover:border-gray-400 transition-all duration-200"
                  />
                </button>
                <div
                  className={`absolute right-0 top-12 w-48 bg-white dark:bg-[#424242] rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-50 transition-all duration-200 transform ${
                    showMenu
                      ? "opacity-100 scale-100 translate-y-0"
                      : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                  }`}
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <div className="py-1">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate">
                        {session.user?.name || session.user?.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#515151] transition-colors duration-150"
                      role="menuitem"
                      onClick={() => setShowMenu(false)}
                    >
                      <GoPerson className="mr-3" />
                      Profile
                    </Link>
                    <button
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                      role="menuitem"
                      onClick={() => {
                        signOut();
                        setShowMenu(false);
                      }}
                    >
                      <svg
                        className="w-4 h-4 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
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
      <div
        ref={mobileMenuRef}
        className={`md:hidden absolute top-full left-0 w-full bg-[#252525] border-t border-gray-600 shadow-lg z-40 transition-all duration-200 ${
          showMobileMenu
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
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
          <li>
            <Link
              href="/chat"
              className="block px-4 py-3 hover:bg-[#424242] transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              Chat
            </Link>
          </li>
          {isAdmin && (
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
                  className="flex items-center px-4 py-3 hover:bg-[#424242] transition-colors border-t border-gray-600"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <GoPerson className="mr-3" />
                  Profile
                </Link>
              </li>
              <li>
                <button
                  className="flex items-center w-full text-left px-4 py-3 hover:bg-[#424242] transition-colors text-red-400"
                  onClick={() => {
                    signOut();
                    setShowMobileMenu(false);
                  }}
                >
                  <svg
                    className="w-4 h-4 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign out
                </button>
              </li>
            </>
          ) : (
            <li className="border-t border-gray-600">
              <button
                className="flex items-center w-full text-left px-4 py-3 hover:bg-[#424242] transition-colors text-blue-400"
                onClick={() => {
                  signIn();
                  setShowMobileMenu(false);
                }}
              >
                <svg
                  className="w-4 h-4 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Sign in
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
