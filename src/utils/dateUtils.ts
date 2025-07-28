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

// Philippine Time (PHT) utilities
export const getPHTDate = () => {
  const now = new Date();
  // Convert to PHT by getting the time in Manila timezone
  const phtTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
  );
  return phtTime;
};

export const getPHTTimeString = () => {
  const now = new Date();
  // Get current time in PHT as ISO string
  const phtDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
  );
  return phtDate.toISOString();
};

export const formatToPHT = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Date(dateObj.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
};

export const getPHTDateString = () => {
  return getPHTDate().toISOString().split("T")[0]; // YYYY-MM-DD format in PHT
};

export const formatTimeForDisplay = (dateString: string) => {
  const date = new Date(dateString);
  // Display in PHT
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Manila",
  });
};

export const formatDateForDisplay = (
  dateString: string,
  useLocalTime: boolean = true
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
    // Display in PHT
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Manila",
    });
  }
};
