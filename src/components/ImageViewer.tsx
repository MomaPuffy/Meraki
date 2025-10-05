import React from "react";
import Image from "next/image";
import { IoClose, IoHeart, IoHeartOutline, IoTrash } from "react-icons/io5";

// Base image viewer props
interface BaseImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
  title: string;
  subtitle?: string;
}

// Gallery-specific props
interface GalleryProps {
  type: "gallery";
  item: {
    _id?: string;
    id?: string;
    title: string;
    category: string;
    src: string;
    likes?: number;
    likedBy?: string[];
  };
  isLiked: boolean;
  onLike: () => void;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  onDelete?: (itemId: string) => void;
  isDeleting?: boolean;
}

// Attendance-specific props
interface AttendanceProps {
  type: "attendance";
  photo: {
    url: string;
    thumbnail: string;
    type: "timeIn" | "timeOut";
    timestamp?: string;
    userName?: string;
  };
}

// Basic image viewer props
interface BasicProps {
  type: "basic";
  children?: React.ReactNode;
}

// Union type for all variants
type ImageViewerProps = BaseImageViewerProps &
  (GalleryProps | AttendanceProps | BasicProps);

export default function UnifiedImageViewer(props: ImageViewerProps) {
  const { isOpen, onClose, imageUrl, imageAlt, title, subtitle } = props;

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Render different overlays based on type
  const renderOverlayContent = () => {
    switch (props.type) {
      case "gallery":
        return (
          <>
            <button
              onClick={props.onLike}
              disabled={!props.isAuthenticated}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                !props.isAuthenticated
                  ? "opacity-50 cursor-not-allowed"
                  : props.isLiked
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              }`}
              title={
                !props.isAuthenticated
                  ? "Please log in to like items"
                  : props.isLiked
                  ? "Unlike"
                  : "Like"
              }
            >
              {props.isLiked ? (
                <IoHeart className="text-white" />
              ) : (
                <IoHeartOutline className="text-white" />
              )}
              <span className="text-sm font-medium text-white">
                {props.item.likes ?? 0}
              </span>
            </button>

            {props.isAdmin && props.onDelete && (
              <button
                onClick={() =>
                  props.onDelete!(props.item._id || props.item.id!)
                }
                disabled={props.isDeleting}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                title="Delete artwork"
              >
                {props.isDeleting ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <IoTrash className="text-white" />
                )}
                <span className="text-sm font-medium text-white">Delete</span>
              </button>
            )}
          </>
        );

      case "attendance":
        const getPhotoTypeColor = () => {
          return props.photo.type === "timeIn"
            ? "text-green-400"
            : "text-red-400";
        };

        const getBorderColor = () => {
          return props.photo.type === "timeIn"
            ? "border-green-400"
            : "border-red-400";
        };

        return (
          <div
            className={`px-3 py-2 rounded-full border-2 ${getBorderColor()} bg-black/30 backdrop-blur-sm`}
          >
            <span className={`text-sm font-medium ${getPhotoTypeColor()}`}>
              {props.photo.type === "timeIn" ? "Time In" : "Time Out"}
            </span>
          </div>
        );

      case "basic":
        return props.children || null;

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 text-3xl z-10"
        >
          <IoClose />
        </button>

        {/* Image container */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={imageUrl}
            alt={imageAlt}
            width={1200}
            height={800}
            className="object-contain max-w-full max-h-[80vh] rounded-lg"
            priority
          />
        </div>

        {/* Image info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
          <div className="flex items-end justify-between text-white">
            <div>
              <h3 className="text-xl font-semibold mb-1">{title}</h3>
              {subtitle && <p className="text-sm text-gray-300">{subtitle}</p>}
            </div>

            {renderOverlayContent() && (
              <div className="flex items-center gap-3">
                {renderOverlayContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for creating props for different use cases
export const createGalleryViewerProps = (
  baseProps: BaseImageViewerProps,
  item: GalleryProps["item"],
  isLiked: boolean,
  onLike: () => void,
  isAuthenticated: boolean,
  isAdmin?: boolean,
  onDelete?: (itemId: string) => void,
  isDeleting?: boolean
): ImageViewerProps => ({
  ...baseProps,
  type: "gallery",
  item,
  isLiked,
  onLike,
  isAuthenticated,
  isAdmin,
  onDelete,
  isDeleting,
});

export const createAttendanceViewerProps = (
  baseProps: BaseImageViewerProps,
  photo: AttendanceProps["photo"]
): ImageViewerProps => ({
  ...baseProps,
  type: "attendance",
  photo,
});

export const createBasicViewerProps = (
  baseProps: BaseImageViewerProps,
  children?: React.ReactNode
): ImageViewerProps => ({
  ...baseProps,
  type: "basic",
  children,
});

/*
USAGE EXAMPLES:

1. For Gallery Images:
const galleryProps = createGalleryViewerProps(
  {
    isOpen: true,
    onClose: () => {},
    imageUrl: "image.jpg",
    imageAlt: "Gallery image",
    title: "Artwork Title",
    subtitle: "Category",
  },
  galleryItem,
  isLiked,
  handleLike,
  isAuthenticated,
  isAdmin,
  handleDelete,
  isDeleting
);

2. For Attendance Photos:
const attendanceProps = createAttendanceViewerProps(
  {
    isOpen: true,
    onClose: () => {},
    imageUrl: photo.url,
    imageAlt: "Attendance photo",
    title: "Time In Photo",
    subtitle: "User Name • Timestamp",
  },
  attendancePhoto
);

3. For Basic Image Viewing:
const basicProps = createBasicViewerProps(
  {
    isOpen: true,
    onClose: () => {},
    imageUrl: "image.jpg",
    imageAlt: "Basic image",
    title: "Image Title",
    subtitle: "Optional subtitle",
  },
  <CustomOverlayContent />
);
*/
