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
