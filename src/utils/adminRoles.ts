export const ADMIN_POSITIONS = [
  "advisor",
  "president",
  "vice-president",
] as const;

export type AdminPosition = (typeof ADMIN_POSITIONS)[number];

export const isAdminPosition = (position?: string): boolean => {
  return ADMIN_POSITIONS.includes(position?.toLowerCase() as AdminPosition);
};
