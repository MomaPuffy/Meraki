"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import UpcomingEvents from "@/app/components/calendar/UpcomingEvents";
import { useAuth } from "@/hooks/useAuth";
import Modal from "@/components/Modal";
import UnifiedImageViewer, {
  createGalleryViewerProps,
} from "@/components/ImageViewer";
import { IoClose } from "react-icons/io5";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        setShowAddModal(false);
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

  const handleImageClick = (item: GalleryItem) => {
    setSelectedImage(item);
    setShowImageViewer(true);
  };

  const handleImageLike = async () => {
    if (!selectedImage || !isAuthenticated) {
      if (!isAuthenticated) {
        alert("Please log in to like items.");
      }
      return;
    }

    try {
      const res = await fetch(`/api/gallery/${selectedImage._id}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        // Update both gallery and selectedImage
        setGallery((g) =>
          g.map((it) => (it._id === json.item._id ? json.item : it))
        );
        setSelectedImage(json.item);
      } else {
        const err = await res.json();
        console.error(err);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this artwork? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingId(itemId);
    try {
      const res = await fetch(`/api/gallery/${itemId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove from gallery state
        setGallery((g) => g.filter((item) => (item._id || item.id) !== itemId));

        // Close image viewer if the deleted item was being viewed
        if (
          selectedImage &&
          (selectedImage._id || selectedImage.id) === itemId
        ) {
          setShowImageViewer(false);
          setSelectedImage(null);
        }
      } else {
        const err = await res.json();
        console.error(err);
        alert(err.message || "Failed to delete artwork");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete artwork");
    } finally {
      setDeletingId(null);
    }
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
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Community Gallery
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Add New Artwork
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
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
                  <div
                    className="relative w-full h-40 sm:h-44 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(item)}
                  >
                    <Image
                      src={item.src}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                          />
                        </svg>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item._id || item.id!);
                            }}
                            disabled={deletingId === (item._id || item.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50"
                            title="Delete artwork"
                          >
                            {deletingId === (item._id || item.id) ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
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

      {/* Add Artwork Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Artwork"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title
            </label>
            <input
              id="title"
              placeholder="Enter artwork title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {CATEGORIES.slice(1).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Image
            </label>
            <div
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files && files[0]) {
                  onFileChange(files[0]);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
              className="w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-md text-center hover:border-purple-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById("imageFile")?.click()}
            >
              <div className="text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-3"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm">
                  <span className="font-medium text-purple-600">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
            <input
              id="imageFile"
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange(e.target.files?.[0])}
              className="hidden"
            />
          </div>

          {filePreview && (
            <div className="flex justify-center">
              <div className="relative">
                <Image
                  src={filePreview}
                  alt="Preview"
                  width={200}
                  height={200}
                  className="object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => onFileChange(undefined)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  <IoClose />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Adding..." : "Add Artwork"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <UnifiedImageViewer
          {...createGalleryViewerProps(
            {
              isOpen: showImageViewer,
              onClose: () => setShowImageViewer(false),
              imageUrl: selectedImage.src,
              imageAlt: selectedImage.title,
              title: selectedImage.title,
              subtitle: selectedImage.category,
            },
            selectedImage,
            (selectedImage.likedBy || []).includes(user?.id || ""),
            handleImageLike,
            isAuthenticated,
            isAdmin,
            handleDelete,
            deletingId === (selectedImage._id || selectedImage.id)
          )}
        />
      )}
    </main>
  );
}
