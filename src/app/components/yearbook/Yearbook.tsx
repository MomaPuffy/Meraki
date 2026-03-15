"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface YearbookSummary {
  year: string;
  departments: { members: unknown[] }[];
}

export default function YearBook() {
  const [yearbooks, setYearbooks] = useState<YearbookSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/yearbook")
      .then((r) => r.json())
      .then((data) => setYearbooks(data.yearbooks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-6 w-24 bg-gray-100 animate-pulse rounded" />;
  }

  if (yearbooks.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-gray-400 text-sm">No yearbooks yet.</p>
        <Link
          href="/yearbook"
          className="text-purple-600 text-sm hover:underline"
        >
          View yearbooks →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {yearbooks.slice(0, 3).map((yb) => (
        <Link
          key={yb.year}
          href={`/yearbook/${yb.year}`}
          className="flex items-center justify-between p-3 rounded-lg bg-linear-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-100 transition-colors group"
        >
          <div>
            <p className="font-semibold text-sm text-purple-800">
              Class of {yb.year}
            </p>
            <p className="text-xs text-gray-500">
              {yb.departments.reduce((s, d) => s + d.members.length, 0)} members
            </p>
          </div>
          <span className="text-purple-400 group-hover:text-purple-600 transition-colors">
            →
          </span>
        </Link>
      ))}
      {yearbooks.length > 3 && (
        <Link
          href="/yearbook"
          className="text-purple-600 text-xs hover:underline block text-center"
        >
          View all yearbooks
        </Link>
      )}
    </div>
  );
}
