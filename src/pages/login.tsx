import Navbar from "../app/components/navbar/Navbar";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function Login() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-10 px-8 shadow-lg rounded-lg flex flex-col items-center">
            <Image
              src="/meraki.png"
              alt="Meraki Logo"
              width={60}
              height={60}
              className="mb-4"
            />
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 mb-6">
              Sign in to your account
            </h2>
            <button
              onClick={() => signIn("google")}
              className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 font-medium hover:bg-gray-50 transition mb-2"
            >
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                alt="Google icon"
                width={24}
                height={24}
                className="mr-2"
              />
              Sign in with Google
            </button>
            <p className="text-gray-400 text-xs mt-4">
              You must sign in with your Google account to access the app.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
