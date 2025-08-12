import Image from "next/image";
import { useState } from "react";

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({
  src,
  name,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-sm",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!src || imageError) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`${name}'s avatar`}
      width={40}
      height={40}
      className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 ${className}`}
      onError={() => setImageError(true)}
    />
  );
}
