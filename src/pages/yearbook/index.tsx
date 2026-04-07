import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Yearbook } from "@/types/yearbook";
import { isAdminPosition } from "@/utils/adminRoles";

export default function YearbookIndex() {
  const { data: session, status } = useSession();
  const [yearbooks, setYearbooks] = useState<Yearbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Allow public fetch of yearbooks; admin-only actions are behind isAdminPosition
    fetch("/api/yearbook")
      .then((r) => r.json())
      .then((data) => setYearbooks(data.yearbooks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session, status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // if (!session) {
  //   return (
  //     <div className="min-h-screen flex justify-center items-center px-4">
  //       <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
  //         <h1 className="text-2xl font-bold text-gray-900 mb-4">Yearbook</h1>
  //         <p className="text-gray-600">Please sign in to view the yearbook.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-10">
          <div className="bg-linear-to-r from-purple-600 to-pink-600 px-8 py-10 text-center">
            <div className="mb-4">
              <Image
                src="/meraki.png"
                alt="Meraki"
                width={72}
                height={72}
                className="mx-auto"
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Meraki Yearbook
            </h1>
            <p className="text-purple-100 text-lg">
              Memories, moments, and milestones
            </p>
            {session && isAdminPosition(session!.user.position) && (
              <Link
                href="/admin/yearbook"
                className="mt-4 inline-block bg-white text-purple-600 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Manage Yearbook
              </Link>
            )}
          </div>
        </div>

        {/* Year cards */}
        {yearbooks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No yearbooks yet
            </h2>
            <p className="text-gray-500">
              Check back soon — the memories are coming!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {yearbooks.map((yb) => (
              <Link
                key={yb.year}
                href={`/yearbook/${yb.year}`}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Cover */}
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  {yb.coverPhoto ? (
                    <Image
                      src={yb.coverPhoto}
                      alt={`${yb.year} cover`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-purple-400 via-pink-400 to-orange-300 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white/60">
                        {yb.year}
                      </span>
                    </div>
                  )}
                  {/* Year badge overlay */}
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-black/50 backdrop-blur-sm text-white text-sm font-bold px-3 py-1 rounded-full">
                      {yb.year}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                    Class of {yb.year}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {yb.departments.length} department
                    {yb.departments.length !== 1 ? "s" : ""} ·{" "}
                    {yb.departments.reduce(
                      (sum, d) => sum + d.members.length,
                      0,
                    )}{" "}
                    members
                  </p>
                  <div className="mt-4 inline-flex items-center text-purple-600 text-sm font-medium">
                    View yearbook →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
