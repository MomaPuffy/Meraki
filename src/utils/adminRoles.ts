export const ADMIN_POSITIONS = [
  "admin",
  "advisor",
  "president",
  "vice-president",
] as const;

export type AdminPosition = (typeof ADMIN_POSITIONS)[number];

export function isAdminPosition(position?: string): position is AdminPosition {
  if (!position) return false;
  return ADMIN_POSITIONS.includes(position.toLowerCase() as AdminPosition);
};
