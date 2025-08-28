import React from "react";
import { IoHeart, IoHeartOutline, IoTrash } from "react-icons/io5";
import BaseImageViewer from "./BaseImageViewer";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    _id?: string;
    id?: string;
    title: string;
    category: string;
    src: string;
    likes?: number;
    likedBy?: string[];
  } | null;
  isLiked: boolean;
  onLike: () => void;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  onDelete?: (itemId: string) => void;
  isDeleting?: boolean;
}

export default function ImageViewer({
  isOpen,
  onClose,
  item,
  isLiked,
  onLike,
  isAuthenticated,
  isAdmin = false,
  onDelete,
  isDeleting = false,
}: ImageViewerProps) {
  if (!item) return null;

  return (
    <BaseImageViewer
      isOpen={isOpen}
      onClose={onClose}
      imageUrl={item.src}
      imageAlt={item.title}
      title={item.title}
      subtitle={item.category}
    >
      <button
        onClick={onLike}
        disabled={!isAuthenticated}
        className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
          !isAuthenticated
            ? "opacity-50 cursor-not-allowed"
            : isLiked
            ? "bg-red-500 hover:bg-red-600"
            : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
        }`}
        title={
          !isAuthenticated
            ? "Please log in to like items"
            : isLiked
            ? "Unlike"
            : "Like"
        }
      >
        {isLiked ? (
          <IoHeart className="text-white" />
        ) : (
          <IoHeartOutline className="text-white" />
        )}
        <span className="text-sm font-medium">{item.likes ?? 0}</span>
      </button>

      {isAdmin && onDelete && (
        <button
          onClick={() => onDelete(item._id || item.id!)}
          disabled={isDeleting}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
          title="Delete artwork"
        >
          {isDeleting ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            <IoTrash className="text-white" />
          )}
          <span className="text-sm font-medium text-white">Delete</span>
        </button>
      )}
    </BaseImageViewer>
  );
}
