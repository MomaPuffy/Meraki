"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import UpcomingEvents from "@/app/components/calendar/UpcomingEvents";
import { useAuth } from "@/hooks/useAuth";

// gallery comes from the API

type GalleryItem = {
  _id?: string;
  id?: string;
  title: string;
  category: string;
  src: string;
  likes?: number;
  likedBy?: string[];
};

const CATEGORIES = ["All", "Digital", "Traditional", "Animation", "Cosplay"];

export default function Home() {
  const [filter, setFilter] = useState<string>("All");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const { isAdmin } = useAuth();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data) => {
        setGallery(data.items || []);
      })
      .catch((e) => console.error(e))
      .finally(() => {});
  }, []);

  const filtered =
    filter === "All" ? gallery : gallery.filter((g) => g.category === filter);

  // admin form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [src, setSrc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    // require title + category and either a provided src URL or a selected file
    if (!title || !category || (!src && !file)) {
      alert(
        "Please provide a title, category and either choose a file or enter an image URL."
      );
      return;
    }
    setSubmitting(true);
    try {
      let imageBase64: string | undefined = undefined;
      if (file) {
        // convert file to base64
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, src, imageBase64 }),
      });
      if (res.ok) {
        const json = await res.json();
        setGallery((g) => [json.item, ...g]);
        setTitle("");
        setSrc("");
        setFile(null);
        setFilePreview(null);
        setCategory(CATEGORIES[1]);
      } else {
        const err = await res.json();
        console.error(err);
        alert(err.message || "Could not add item");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onFileChange = (f?: File) => {
    if (!f) {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
      setFile(null);
      setFilePreview(null);
      return;
    }
    // revoke previous preview if present
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(f);
    const url = URL.createObjectURL(f);
    setFilePreview(url);
  };

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
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
          </div>

          <div className="flex-1 w-full md:max-w-xl">
            <div className="rounded-lg overflow-hidden shadow-lg bg-white p-6 flex flex-col items-center text-center">
              <Image
                src="/meraki.png"
                alt="Meraki Logo"
                width={520}
                height={520}
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
          <div className="flex items-start justify-between mb-6 flex-col sm:flex-row sm:items-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Community Gallery
            </h2>
            {isAdmin && (
              <form
                onSubmit={handleAdd}
                className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto"
              >
                <input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-2 py-1 rounded border w-full sm:w-40"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-3 py-2 rounded border w-full sm:w-32 text-sm"
                >
                  {CATEGORIES.slice(1).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onFileChange(e.target.files?.[0])}
                    className="px-2 py-1 rounded border w-full sm:w-40 text-sm"
                  />
                </div>
                {filePreview && (
                  <Image
                    src={filePreview}
                    alt="preview"
                    width={64}
                    height={64}
                    className="object-cover rounded border"
                  />
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1 rounded bg-purple-600 text-white text-sm w-full sm:w-auto"
                >
                  {submitting ? "Adding..." : "Add"}
                </button>
              </form>
            )}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap sm:overflow-x-auto sm:pb-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => {
              const likedBy: string[] = item.likedBy || [];
              const isLiked = user && likedBy.includes(user.id);
              return (
                <figure
                  key={item._id ?? item.id}
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            if (!isAuthenticated) {
                              alert("Please log in to like items.");
                              return;
                            }
                            try {
                              const res = await fetch(
                                `/api/gallery/${item._id}/like`,
                                {
                                  method: "POST",
                                }
                              );
                              if (res.ok) {
                                const json = await res.json();
                                // update item in gallery list
                                setGallery((g) =>
                                  g.map((it) =>
                                    it._id === json.item._id ? json.item : it
                                  )
                                );
                              } else {
                                const err = await res.json();
                                console.error(err);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="text-sm"
                          aria-label={isLiked ? "Unlike" : "Like"}
                        >
                          {isLiked ? "❤️" : "🤍"}
                        </button>
                        <div className="text-xs text-gray-400">
                          {item.likes ?? 0}
                        </div>
                      </div>
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* Events + Testimonials */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-gradient-to-r from-purple-700 to-indigo-600 rounded-lg p-6 sm:p-8 text-center text-white shadow-lg">
          <h4 className="text-2xl font-semibold">Ready to Share Your Work?</h4>
          <p className="mt-2 text-sm opacity-90">
            Create an account, join our channels and participate in weekly
            community highlights.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
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
