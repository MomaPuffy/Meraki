export const ADMIN_POSITIONS = [
  "admin",
  "advisor",
  "president",
  "vice-president",
] as const;

export type AdminPosition = (typeof ADMIN_POSITIONS)[number];

export const isAdminPosition = (position?: string): boolean => {
  return ADMIN_POSITIONS.includes(position?.toLowerCase() as AdminPosition);
};

export const hasAdminAccess = (session: any): boolean => {
  return session?.user?.position && isAdminPosition(session.user.position);
};
