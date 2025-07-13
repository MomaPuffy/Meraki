import { SessionProvider, useSession } from "next-auth/react";
import "../app/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoginPage = router.pathname === "/login";

  useEffect(() => {
    if (status === "loading") return;
    if (!session && !isLoginPage) {
      router.replace("/login");
    }
    if (session && isLoginPage) {
      router.replace("/");
    }
  }, [session, status, isLoginPage, router]);

  if (status === "loading") return null;
  if (!session && !isLoginPage) return null;
  if (session && isLoginPage) return null;
  return <>{children}</>;
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </SessionProvider>
  );
}
