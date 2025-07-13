import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black">
      <Image
        src="/meraki.png"
        alt="Meraki Logo"
        height={100}
        width={100}
        className="mb-4"
      />
      <h1 className="text-5xl font-bold mb-4">404</h1>
      <p className="text-lg mb-6">
        Sorry, the page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Go back home
      </Link>
    </div>
  );
}
