import React from "react";
import BaseImageViewer from "./BaseImageViewer";

interface AttendancePhotoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  photo: {
    url: string;
    thumbnail: string;
    type: "timeIn" | "timeOut";
    timestamp?: string;
    userName?: string;
  } | null;
}

export default function AttendancePhotoViewer({
  isOpen,
  onClose,
  photo,
}: AttendancePhotoViewerProps) {
  if (!photo) return null;

  const getPhotoTypeLabel = () => {
    return photo.type === "timeIn" ? "Time In Photo" : "Time Out Photo";
  };

  const getPhotoTypeColor = () => {
    return photo.type === "timeIn" ? "text-green-400" : "text-red-400";
  };

  const getBorderColor = () => {
    return photo.type === "timeIn" ? "border-green-400" : "border-red-400";
  };

  const getSubtitle = () => {
    const parts = [];
    if (photo.userName) parts.push(photo.userName);
    if (photo.timestamp) parts.push(photo.timestamp);
    return parts.join(" • ");
  };

  return (
    <BaseImageViewer
      isOpen={isOpen}
      onClose={onClose}
      imageUrl={photo.url}
      imageAlt={getPhotoTypeLabel()}
      title={getPhotoTypeLabel()}
      subtitle={getSubtitle()}
    >
      <div
        className={`px-3 py-2 rounded-full border-2 ${getBorderColor()} bg-black/30 backdrop-blur-sm`}
      >
        <span className={`text-sm font-medium ${getPhotoTypeColor()}`}>
          {photo.type === "timeIn" ? "Time In" : "Time Out"}
        </span>
      </div>
    </BaseImageViewer>
  );
}
