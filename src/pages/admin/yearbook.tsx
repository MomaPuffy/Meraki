import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Yearbook, YearbookDepartment, YearbookMember } from "@/types/yearbook";
import { isAdminPosition } from "@/utils/adminRoles";
import { getUserColorTheme } from "@/lib/colorConfig";

// ── helpers ──────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyMember(): YearbookMember {
  return { id: uid(), name: "", position: "", quote: "", photo: "" };
}

function emptyDept(): YearbookDepartment {
  return { id: uid(), name: "", members: [], activityPhotos: [] };
}

// ── Image upload helper ──────────────────────────────────────────────────────
async function uploadToCloudinary(file: File): Promise<string> {
  const toBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const base64 = await toBase64(file);
  const res = await fetch("/api/yearbook/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64 }),
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url;
}

// ── MemberEditor ─────────────────────────────────────────────────────────────
function MemberEditor({
  member,
  onChange,
  onRemove,
}: {
  member: YearbookMember;
  onChange: (m: YearbookMember) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange({ ...member, photo: url });
    } catch {
      alert("Photo upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
      <div className="flex items-start gap-3">
        {/* Photo */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-shrink-0 w-16 h-16 rounded-full bg-purple-100 border-2 border-dashed border-purple-300 flex items-center justify-center overflow-hidden hover:bg-purple-50 transition-colors"
          title="Upload photo"
        >
          {uploading ? (
            <div className="animate-spin w-5 h-5 border-b-2 border-purple-600 rounded-full" />
          ) : member.photo ? (
            <Image
              src={member.photo}
              alt={member.name}
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-purple-400 text-xs text-center leading-tight px-1">
              Add photo
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhoto}
        />

        <div className="flex-1 space-y-2">
          <input
            type="text"
            placeholder="Full name *"
            value={member.name}
            onChange={(e) => onChange({ ...member, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <input
            type="text"
            placeholder="Position (e.g. President)"
            value={member.position || ""}
            onChange={(e) => onChange({ ...member, position: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 text-lg leading-none mt-1"
          title="Remove member"
        >
          ×
        </button>
      </div>
      <textarea
        placeholder={`Quote (e.g. "Art is not what you see, but what you make others see.")`}
        value={member.quote || ""}
        onChange={(e) => onChange({ ...member, quote: e.target.value })}
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
      />
    </div>
  );
}

// ── DeptEditor ───────────────────────────────────────────────────────────────
function DeptEditor({
  dept,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  allUsers,
}: {
  dept: YearbookDepartment;
  onChange: (d: YearbookDepartment) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  allUsers: {
    id: string;
    name: string;
    position?: string;
    image?: string;
    department?: string;
  }[];
}) {
  const [uploadingActivity, setUploadingActivity] = useState(false);
  const [deptOpen, setDeptOpen] = useState(true);
  const activityRef = useRef<HTMLInputElement>(null);

  // Users whose department matches this dept name (case-insensitive)
  const matchingUsers = allUsers.filter(
    (u) =>
      u.department?.toLowerCase().trim() === dept.name.toLowerCase().trim(),
  );

  // IDs of users already in the member list (by name match as fallback)
  const existingNames = new Set(
    dept.members.map((m) => m.name.toLowerCase().trim()),
  );

  // Users from DB not yet in the member list
  const unaddedUsers = matchingUsers.filter(
    (u) => !existingNames.has(u.name.toLowerCase().trim()),
  );

  const syncFromUsers = () => {
    const newMembers: YearbookMember[] = unaddedUsers.map((u) => ({
      id: uid(),
      name: u.name,
      position: u.position || "",
      photo: u.image || "",
      quote: "",
    }));
    onChange({ ...dept, members: [...dept.members, ...newMembers] });
  };

  const updateMember = (idx: number, m: YearbookMember) => {
    const members = [...dept.members];
    members[idx] = m;
    onChange({ ...dept, members });
  };

  const removeMember = (idx: number) => {
    onChange({ ...dept, members: dept.members.filter((_, i) => i !== idx) });
  };

  const addMember = () => {
    onChange({ ...dept, members: [...dept.members, emptyMember()] });
  };

  const handleActivityPhotos = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingActivity(true);
    try {
      const urls = await Promise.all(files.map(uploadToCloudinary));
      onChange({ ...dept, activityPhotos: [...dept.activityPhotos, ...urls] });
    } catch {
      alert("One or more photo uploads failed.");
    } finally {
      setUploadingActivity(false);
    }
  };

  const removeActivityPhoto = (idx: number) => {
    onChange({
      ...dept,
      activityPhotos: dept.activityPhotos.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-purple-100 overflow-hidden mb-6">
      {/* Dept header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-4 flex items-center gap-3 border-b border-purple-100">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="w-6 h-5 flex items-center justify-center text-purple-400 hover:text-purple-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs leading-none"
            title="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="w-6 h-5 flex items-center justify-center text-purple-400 hover:text-purple-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs leading-none"
            title="Move down"
          >
            ▼
          </button>
        </div>
        <input
          type="text"
          placeholder="Department name *"
          value={dept.name}
          onChange={(e) => onChange({ ...dept, name: e.target.value })}
          className="flex-1 bg-transparent border-b border-purple-300 text-purple-800 font-semibold text-lg focus:outline-none focus:border-purple-600 placeholder-purple-300"
        />
        <span className="text-xs text-gray-400 flex-shrink-0">
          {dept.members.length} members
        </span>
        <button
          type="button"
          onClick={() => setDeptOpen((o) => !o)}
          className="text-purple-400 hover:text-purple-700 transition-colors text-sm flex-shrink-0 w-6 text-center"
          title={deptOpen ? "Collapse" : "Expand"}
        >
          {deptOpen ? "▾" : "▸"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 text-sm font-medium flex-shrink-0"
        >
          Remove
        </button>
      </div>

      {deptOpen && (
        <div className="p-5 space-y-4">
          {/* Members */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Members
              </span>
              {unaddedUsers.length > 0 && (
                <button
                  type="button"
                  onClick={syncFromUsers}
                  className="text-xs text-purple-600 hover:text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1 hover:bg-purple-100 transition-colors"
                >
                  ↓ Pull {unaddedUsers.length} from user data
                </button>
              )}
              {matchingUsers.length > 0 && unaddedUsers.length === 0 && (
                <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1">
                  ✓ All {matchingUsers.length} synced
                </span>
              )}
            </div>
            <div className="space-y-3">
              {dept.members.map((m, i) => (
                <MemberEditor
                  key={m.id}
                  member={m}
                  onChange={(updated) => updateMember(i, updated)}
                  onRemove={() => removeMember(i)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addMember}
              className="mt-3 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50 transition-colors"
            >
              + Add member
            </button>
          </div>

          {/* Activity photos */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Activity Photos
            </div>
            {dept.activityPhotos.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                {dept.activityPhotos.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Activity ${i + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeActivityPhoto(i)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => activityRef.current?.click()}
              disabled={uploadingActivity}
              className="text-sm text-purple-600 hover:text-purple-800 border border-dashed border-purple-300 rounded-lg px-4 py-2 hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              {uploadingActivity ? "Uploading..." : "+ Add activity photos"}
            </button>
            <input
              ref={activityRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleActivityPhotos}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── YearbookEditor ────────────────────────────────────────────────────────────
function YearbookEditor({
  yearbook,
  onSaved,
  onCancel,
}: {
  yearbook: Yearbook;
  onSaved: (yb: Yearbook) => void;
  onCancel: () => void;
}) {
  const [departments, setDepartments] = useState<YearbookDepartment[]>(
    yearbook.departments.map((d) => ({ ...d })),
  );
  const [coverPhoto, setCoverPhoto] = useState<string>(
    yearbook.coverPhoto || "",
  );
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<
    {
      id: string;
      name: string;
      position?: string;
      image?: string;
      department?: string;
    }[]
  >([]);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setAllUsers(data.users || []))
      .catch(console.error);
  }, []);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadToCloudinary(file);
      setCoverPhoto(url);
    } catch {
      alert("Cover photo upload failed. Try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const updateDept = (idx: number, d: YearbookDepartment) => {
    const next = [...departments];
    next[idx] = d;
    setDepartments(next);
  };

  const removeDept = (idx: number) =>
    setDepartments(departments.filter((_, i) => i !== idx));

  const moveDept = (idx: number, dir: -1 | 1) => {
    const next = [...departments];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setDepartments(next);
  };

  const addDept = () => setDepartments([...departments, emptyDept()]);

  const handleSave = async () => {
    // Validate
    for (const d of departments) {
      if (!d.name.trim()) {
        alert("All departments need a name.");
        return;
      }
      for (const m of d.members) {
        if (!m.name.trim()) {
          alert(`All members in "${d.name}" need a name.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/yearbook/${yearbook.year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departments, coverPhoto }),
      });
      if (res.ok) {
        const data = await res.json();
        onSaved(data.yearbook);
      } else {
        const err = await res.json();
        alert(err.message || "Save failed");
      }
    } catch {
      alert("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900">
          Editing {yearbook.year} Yearbook
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save yearbook"}
          </button>
        </div>
      </div>

      {/* Cover photo */}
      <div className="bg-white rounded-2xl shadow-md border border-purple-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-4 border-b border-purple-100">
          <span className="font-semibold text-purple-800 text-lg">
            Cover Photo
          </span>
        </div>
        <div className="p-5 flex items-center gap-5">
          <div className="w-32 h-24 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-purple-200 flex items-center justify-center flex-shrink-0">
            {coverPhoto ? (
              <Image
                src={coverPhoto}
                alt="Cover"
                fill
                className="object-cover rounded-xl"
              />
            ) : (
              <span className="text-gray-400 text-xs text-center px-2">
                No cover photo
              </span>
            )}
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="text-sm text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              {uploadingCover
                ? "Uploading..."
                : coverPhoto
                  ? "Change cover photo"
                  : "Upload cover photo"}
            </button>
            {coverPhoto && (
              <button
                type="button"
                onClick={() => setCoverPhoto("")}
                className="block text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            )}
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <p className="text-xs text-gray-400">
              This appears on the yearbook index page.
            </p>
          </div>
        </div>
      </div>

      {departments.map((dept, i) => (
        <DeptEditor
          key={dept.id}
          dept={dept}
          onChange={(d) => updateDept(i, d)}
          onRemove={() => removeDept(i)}
          onMoveUp={() => moveDept(i, -1)}
          onMoveDown={() => moveDept(i, 1)}
          isFirst={i === 0}
          isLast={i === departments.length - 1}
          allUsers={allUsers}
        />
      ))}

      <button
        type="button"
        onClick={addDept}
        className="w-full py-3 border-2 border-dashed border-purple-300 rounded-2xl text-purple-600 hover:bg-purple-50 transition-colors text-sm font-medium"
      >
        + Add department
      </button>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          {saving ? "Saving..." : "Save yearbook"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminYearbook() {
  const { data: session, status } = useSession();
  const [yearbooks, setYearbooks] = useState<Yearbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    position?: string;
    department?: string;
  } | null>(null);
  const [editing, setEditing] = useState<Yearbook | null>(null);
  const [newYear, setNewYear] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      if (status !== "loading") setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const profileRes = await fetch("/api/profile");
        const profileData = await profileRes.json();
        setCurrentUser(profileData.user);

        if (!isAdminPosition(profileData.user?.position)) {
          setError("Access denied. Admin privileges required.");
          return;
        }

        const ybRes = await fetch("/api/yearbook");
        const ybData = await ybRes.json();
        setYearbooks(ybData.yearbooks || []);
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [session, status]);

  const handleCreate = async () => {
    if (!newYear.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/yearbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: newYear.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setYearbooks((prev) => [data.yearbook, ...prev]);
        setNewYear("");
        setEditing(data.yearbook);
      } else {
        alert(data.message || "Failed to create yearbook");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (year: string) => {
    if (!confirm(`Delete the ${year} yearbook? This cannot be undone.`)) return;
    setDeleting(year);
    try {
      await fetch(`/api/yearbook/${year}`, { method: "DELETE" });
      setYearbooks((prev) => prev.filter((yb) => yb.year !== year));
      if (editing?.year === year) setEditing(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleSaved = (updated: Yearbook) => {
    setYearbooks((prev) =>
      prev.map((yb) => (yb.year === updated.year ? updated : yb)),
    );
    setEditing(updated);
  };

  // ── Render guards ──
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 text-sm">
            Please sign in to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-sm">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const userColors = getUserColorTheme(
    currentUser?.position,
    currentUser?.department,
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div
            className={`bg-gradient-to-r ${userColors.headerFrom} ${userColors.headerTo} px-6 py-8`}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Yearbook Manager
                </h1>
                <p className="text-blue-100 mt-1">
                  Create and edit yearbooks for each year
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors"
                >
                  ← Admin Panel
                </Link>
                <Link
                  href="/yearbook"
                  target="_blank"
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors"
                >
                  Preview →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: year list + create */}
          <div className="lg:col-span-1 space-y-4">
            {/* Create new */}
            <div className="bg-white rounded-2xl shadow-md p-4 border border-purple-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                New Yearbook
              </h3>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Year (e.g. 2025)"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !newYear.trim()}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  {creating ? "..." : "Create"}
                </button>
              </div>
            </div>

            {/* Year list */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                All Yearbooks
              </div>
              {yearbooks.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No yearbooks yet
                </div>
              ) : (
                <ul>
                  {yearbooks.map((yb) => (
                    <li
                      key={yb.year}
                      className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${editing?.year === yb.year ? "bg-purple-50" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => setEditing(yb)}
                        className={`text-sm font-medium flex-1 text-left ${editing?.year === yb.year ? "text-purple-700" : "text-gray-700"}`}
                      >
                        {yb.year}
                        <span className="ml-1 text-xs text-gray-400">
                          (
                          {yb.departments.reduce(
                            (s, d) => s + d.members.length,
                            0,
                          )}{" "}
                          members)
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(yb.year)}
                        disabled={deleting === yb.year}
                        className="text-red-400 hover:text-red-600 text-xs ml-2"
                      >
                        {deleting === yb.year ? "..." : "Delete"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Main editor area */}
          <div className="lg:col-span-3">
            {editing ? (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <YearbookEditor
                  key={editing.year}
                  yearbook={editing}
                  onSaved={handleSaved}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-12 text-center">
                <div className="text-5xl mb-4">📖</div>
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Select a yearbook to edit
                </h2>
                <p className="text-gray-400 text-sm">
                  Choose an existing yearbook from the list, or create a new
                  one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
