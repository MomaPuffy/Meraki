import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Yearbook, YearbookDepartment, YearbookMember } from "@/types/yearbook";

// ── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
        >
          ✕
        </button>
        <Image
          src={src}
          alt={alt}
          style={{ maxHeight: "90vh", maxWidth: "90vw" }}
          className="rounded-lg object-contain"
        />
      </div>
    </div>
  );
}

// ── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({ member }: { member: YearbookMember }) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col items-center p-5 gap-3 border border-purple-100 hover:shadow-lg transition-shadow">
      <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-purple-200 bg-linear-to-br from-purple-100 to-pink-100 flex items-center justify-center shrink-0">
        {member.photo ? (
          <Image
            src={member.photo}
            alt={member.name}
            width={112}
            height={112}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-4xl font-bold text-purple-300">
            {member.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="text-center">
        <div className="font-bold text-gray-900 text-base">{member.name}</div>
        {member.position && (
          <div className="text-xs text-purple-600 font-medium mt-0.5 bg-purple-50 px-2 py-0.5 rounded-full inline-block">
            {member.position}
          </div>
        )}
        {member.quote && (
          <blockquote className="mt-3 text-sm text-gray-600 italic leading-relaxed border-l-2 border-pink-300 pl-3 text-left">
            &ldquo;{member.quote}&rdquo;
          </blockquote>
        )}
      </div>
    </div>
  );
}

// ── Activity Photos Grid ─────────────────────────────────────────────────────
function ActivityPhotos({
  photos,
  deptName,
}: {
  photos: string[];
  deptName: string;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="mt-8">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
          📸 Activity Photos
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setLightbox(url)}
              className="rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
            >
              <Image
                src={url}
                alt={`${deptName} activity ${i + 1}`}
                width={300}
                height={200}
                className="w-full h-auto"
              />
            </button>
          ))}
        </div>
      </div>
      {lightbox && (
        <Lightbox
          src={lightbox}
          alt={`${deptName} activity photo`}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

// ── Department Section ───────────────────────────────────────────────────────
function DepartmentSection({ dept }: { dept: YearbookDepartment }) {
  return (
    <section className="mb-16">
      {/* Dept header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-linear-to-r from-purple-300 to-transparent" />
        <h3 className="text-2xl font-bold text-purple-700 px-4 py-1 bg-purple-50 rounded-full border border-purple-200 whitespace-nowrap">
          {dept.name}
        </h3>
        <div className="flex-1 h-px bg-linear-to-l from-purple-300 to-transparent" />
      </div>

      {/* Members grid */}
      {dept.members.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {dept.members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">
          No members added yet.
        </p>
      )}

      {/* Activity photos */}
      <ActivityPhotos photos={dept.activityPhotos} deptName={dept.name} />
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function YearbookYear() {
  const router = useRouter();
  const { year } = router.query;
  const { data: session, status } = useSession();
  const [yearbook, setYearbook] = useState<Yearbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!year) return;
    setLoading(true);
    fetch(`/api/yearbook/${year}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setYearbook(data.yearbook);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, session]);

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
  //       <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
  //         <p className="text-gray-600">Please sign in to view the yearbook.</p>
  //       </div>
  //     </div>
  //   );
  // }

  if (notFound || !yearbook) {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-5xl mb-4">📖</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Yearbook not found
          </h1>
          <p className="text-gray-500 mb-6">No yearbook exists for {year}.</p>
          <Link href="/yearbook" className="text-purple-600 hover:underline">
            ← Back to all yearbooks
          </Link>
        </div>
      </div>
    );
  }

  const totalMembers = yearbook.departments.reduce(
    (s, d) => s + d.members.length,
    0,
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-purple-50 to-white">
      {/* Cover */}
      <div className="bg-linear-to-br from-purple-700 via-purple-600 to-pink-600 text-white py-20 px-6 text-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10">
          <Image
            src="/meraki.png"
            alt="Meraki"
            width={80}
            height={80}
            className="mx-auto mb-4 drop-shadow-lg"
          />
          <div className="text-purple-200 text-sm font-medium tracking-widest uppercase mb-2">
            Meraki Art Club
          </div>
          <h1 className="text-6xl sm:text-8xl font-black mb-2">
            {yearbook.year}
          </h1>
          <div className="text-purple-200 text-lg">Yearbook</div>
          <div className="mt-6 flex justify-center gap-6 text-sm text-purple-200">
            <span>{yearbook.departments.length} Departments</span>
            <span>·</span>
            <span>{totalMembers} Members</span>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          href="/yearbook"
          className="text-purple-600 hover:text-purple-800 text-sm flex items-center gap-1 mb-8"
        >
          ← All Yearbooks
        </Link>

        {/* Department navigation */}
        {yearbook.departments.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {yearbook.departments.map((dept) => (
              <a
                key={dept.id}
                href={`#dept-${dept.id}`}
                className="px-4 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-full text-sm hover:bg-purple-50 transition-colors"
              >
                {dept.name}
              </a>
            ))}
          </div>
        )}

        {/* Content */}
        {yearbook.departments.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🎨</div>
            <p className="text-lg">
              This yearbook is being put together. Check back soon!
            </p>
          </div>
        ) : (
          <div>
            {yearbook.departments.map((dept) => (
              <div key={dept.id} id={`dept-${dept.id}`}>
                <DepartmentSection dept={dept} />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-purple-100 mt-8 py-10 text-center text-gray-400 text-sm">
          Meraki Art Club · Class of {yearbook.year} · Made with ❤️
        </div>
      </div>
    </div>
  );
}
