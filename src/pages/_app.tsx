import { SessionProvider, useSession } from "next-auth/react";
import "@/app/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Footer from "@/app/components/footer/Footer";
import { CalendarProvider } from "@/contexts/CalendarContext";
import Navbar from "@/app/components/navbar/Navbar";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoginPage = router.pathname === "/login";

  const publicRoutes = ["/login", "/register", "/forgot-password", "/public"];
  const isPublicRoute =
    publicRoutes.includes(router.pathname) ||
    router.pathname.startsWith("/public/");

  useEffect(() => {
    if (status === "loading") return;
    if (!session && !isPublicRoute) {
      router.replace("/login");
    }
    if (session && isLoginPage) {
      router.replace("/");
    }
  }, [session, status, isPublicRoute, isLoginPage, router]);

  if (status === "loading") return null;
  if (!session && !isPublicRoute) return null;
  if (session && isLoginPage) return null;
  return <>{children}</>;
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <CalendarProvider>
        <AuthGuard>
          <div className="min-h-screen bg-gray-100 text-black">
            <Navbar />
            <Component {...pageProps} />
            <Footer />
          </div>
        </AuthGuard>
      </CalendarProvider>
    </SessionProvider>
  );
}
