"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import UpcomingEvents from "@/app/components/calendar/UpcomingEvents";

const GALLERY = [
  { id: 1, title: "Neon Skyline", category: "Digital", src: "/meraki.png" },
  {
    id: 2,
    title: "Portrait Study",
    category: "Traditional",
    src: "/window.svg",
  },
  { id: 3, title: "Walk Cycle", category: "Animation", src: "/next.svg" },
  { id: 4, title: "Cosplay Spotlight", category: "Cosplay", src: "/globe.svg" },
  { id: 5, title: "Pixel Scene", category: "Digital", src: "/file.svg" },
  { id: 6, title: "Ink Sketch", category: "Traditional", src: "/vercel.svg" },
  { id: 7, title: "Looping GIF", category: "Animation", src: "/window.svg" },
  { id: 8, title: "Armor Build", category: "Cosplay", src: "/meraki.png" },
];

const CATEGORIES = ["All", "Digital", "Traditional", "Animation", "Cosplay"];

export default function Home() {
  const [filter, setFilter] = useState<string>("All");

  const filtered =
    filter === "All" ? GALLERY : GALLERY.filter((g) => g.category === filter);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Meraki Art Club
            </h1>
            <p className="mt-4 text-gray-600 max-w-2xl">
              A community for makers who put heart into their work. We celebrate
              digital art, traditional techniques, animation and cosplay — come
              share, learn and grow with us.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-purple-700 text-white rounded-md shadow-sm hover:bg-purple-800"
              >
                Join the Club
              </Link>
              <a
                href="#gallery"
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Explore the Gallery
              </a>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <div className="bg-white rounded-lg p-4 text-center shadow">
                <div className="text-xl font-bold">1.2k</div>
                <div className="text-sm text-gray-500">Members</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow">
                <div className="text-xl font-bold">48</div>
                <div className="text-sm text-gray-500">Events</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow">
                <div className="text-xl font-bold">4.8k</div>
                <div className="text-sm text-gray-500">Artworks</div>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-xl">
            <div className="rounded-lg overflow-hidden shadow-lg bg-white p-6">
              <Image
                src="/meraki.png"
                alt="Meraki Logo"
                width={520}
                height={320}
                className="object-cover rounded"
              />
              <p className="mt-4 text-sm text-gray-500">
                Our members share everything from quick sketches and reels to
                large cosplay projects. Tag your work and join our weekly
                challenges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Community Gallery
            </h2>
            <div className="flex items-center gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                    filter === cat
                      ? "bg-purple-700 text-white border-purple-700"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <figure
                key={item.id}
                className="bg-white rounded-lg overflow-hidden shadow group"
              >
                <div className="relative w-full h-40 sm:h-44">
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.category}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">❤️ 128</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Events + Testimonials */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
            <UpcomingEvents />
          </div>

          <aside className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">From the Community</h3>
            <div className="space-y-4">
              <blockquote className="text-sm text-gray-600">
                “Meraki helped me level up my portfolio and meet collaborators.”
              </blockquote>
              <div className="text-sm text-gray-500">
                — Alex, Digital Artist
              </div>
              <hr className="my-3" />
              <blockquote className="text-sm text-gray-600">
                “Weekly critiques keep me motivated and improving.”
              </blockquote>
              <div className="text-sm text-gray-500">— Sam, Animator</div>
            </div>
          </aside>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-gradient-to-r from-purple-700 to-indigo-600 rounded-lg p-8 text-center text-white shadow-lg">
          <h4 className="text-2xl font-semibold">Ready to Share Your Work?</h4>
          <p className="mt-2 text-sm opacity-90">
            Create an account, join our channels and participate in weekly
            community highlights.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/register"
              className="px-5 py-2 bg-white text-purple-700 rounded-md font-medium"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 border border-white rounded-md text-white"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
