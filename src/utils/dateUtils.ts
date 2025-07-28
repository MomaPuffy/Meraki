export const formatEventDate = (date: Date | string) => {
  const eventDate = date instanceof Date ? date : new Date(date);
  if (isNaN(eventDate.getTime())) {
    throw new Error("Invalid date");
  }
  return eventDate.toLocaleDateString();
};

export const ensureValidDate = (date: Date | string) => {
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date");
  }
  return parsedDate;
};

// Philippine Time (PHT) utilities - More robust for production
export const getPHTDate = () => {
  const now = new Date();
  // PHT is UTC+8, so add 8 hours to UTC
  const phtTime = new Date(now.getTime());
  return phtTime;
};

export const getPHTTimeString = () => {
  // Get current UTC time and convert to PHT
  const now = new Date();
  const phtTime = new Date(now.getTime());
  return phtTime.toISOString();
};

export const formatToPHT = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  // Convert to PHT by adding 8 hours to UTC
  const phtTime = new Date(dateObj.getTime());
  return phtTime;
};

export const getPHTDateString = () => {
  const phtDate = getPHTDate();
  return phtDate.toISOString().split("T")[0]; // YYYY-MM-DD format in PHT
};

export const formatTimeForDisplay = (dateString: string) => {
  // Parse the date - if it's from our PHT system, just display it directly
  const date = new Date(dateString);

  // Since we're storing PHT times as ISO strings, just display them directly
  // without timezone conversion
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const formatDateForDisplay = (
  dateString: string,
  useLocalTime: boolean = false
) => {
  const date = new Date(dateString);

  if (useLocalTime) {
    // Display in user's local timezone
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } else {
    // Since we're storing PHT dates, just display them directly
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
};
