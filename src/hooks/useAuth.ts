import { useSession } from "next-auth/react";
import { isAdminPosition } from "@/utils/adminRoles";

export function useAuth() {
  const { data: session, status } = useSession();

  const isAdmin = isAdminPosition(session?.user?.position);
  const isAuthenticated = !!session;
  const isLoading = status === "loading";

  return {
    user: session?.user,
    isAdmin,
    isAuthenticated,
    isLoading,
    session,
  };
}
