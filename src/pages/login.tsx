import Navbar from "../app/components/navbar/Navbar";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isLogin) {
      // Login with credentials
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("Google")) {
          setError(
            "This email is associated with a Google account. Please use Google Sign In."
          );
        } else {
          setError("Invalid email or password");
        }
      } else if (result?.ok) {
        router.push("/");
      }
    } else {
      // Register new user
      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          // After successful registration, automatically sign in
          const result = await signIn("credentials", {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });

          if (result?.ok) {
            router.push("/");
          }
        } else {
          setError(data.message || "Registration failed");
        }
      } catch (err) {
        console.error("Registration error:", err);
        setError("Something went wrong. Please try again.");
      }
    }

    setLoading(false);
  };

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
              {isLogin ? "Sign in to your account" : "Create your account"}
            </h2>

            {/* Email/Password Form */}
            <form
              onSubmit={handleCredentialsSubmit}
              className="w-full space-y-4 mb-4"
            >
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="sr-only">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
              </button>
            </form>

            <div className="w-full text-center mb-4">
              <span className="text-gray-500 text-sm">or</span>
            </div>

            {/* Google Sign In */}
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

            {/* Toggle between login and register */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setFormData({ name: "", email: "", password: "" });
                }}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>

            <p className="text-gray-400 text-xs mt-4 text-center">
              {isLogin
                ? "Sign in with your email and password or Google account to access the app."
                : "Create an account to get started with Meraki."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
