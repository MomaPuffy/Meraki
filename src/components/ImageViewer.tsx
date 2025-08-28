import React from "react";
import { IoHeart, IoHeartOutline } from "react-icons/io5";
import BaseImageViewer from "./ImageViewers/BaseImageViewer";

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
}

export default function ImageViewer({
  isOpen,
  onClose,
  item,
  isLiked,
  onLike,
  isAuthenticated,
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
    </BaseImageViewer>
  );
}
