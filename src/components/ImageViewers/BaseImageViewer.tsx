import React from "react";
import Image from "next/image";
import { IoClose } from "react-icons/io5";

interface BaseImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // For custom overlay content
}

export default function BaseImageViewer({
  isOpen,
  onClose,
  imageUrl,
  imageAlt,
  title,
  subtitle,
  children,
}: BaseImageViewerProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
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

            {children && (
              <div className="flex items-center gap-3">{children}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
