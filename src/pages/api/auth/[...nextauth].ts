import NextAuth, { type NextAuthOptions, type User, type Account, type Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "../../../lib/mongodb";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const client = await clientPromise;
          const db = client.db("meraki");
          const user = await db.collection("users").findOne({ email: credentials.email });

          if (!user) {
            return null;
          }

          // Check if user signed up with Google
          if (user.provider === 'google') {
            throw new Error('This email is associated with a Google account. Please sign in with Google.');
          }

          // Check if user has a password (credentials-based account)
          if (!user.password) {
            throw new Error('This account was created with Google. Please sign in with Google.');
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: parseInt(process.env.SESSION_MAX_AGE!) || 24 * 60 * 60, // 24 hours (in seconds)
    updateAge: 60 * 60, // Update session every hour (in seconds)
  },
  jwt: {
    maxAge: parseInt(process.env.JWT_MAX_AGE!) || 24 * 60 * 60, // 24 hours (in seconds)
  },
  callbacks: {
    async signIn({ user, account }: { user: User; account: Account | null; profile?: Profile }) {
      if (account?.provider === "google") {
        try {
          const client = await clientPromise;
          const db = client.db("meraki");
          
          // Check if user already exists in database
          const existingUser = await db.collection("users").findOne({ email: user.email });
          
          if (!existingUser) {
            // Add Google user to database
            await db.collection("users").insertOne({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: "google",
              googleId: user.id,
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error("Error adding Google user to database:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        // For Google users, we need to get the database ID
        if (!token.id && token.email) {
          try {
            const client = await clientPromise;
            const db = client.db("meraki");
            const dbUser = await db.collection("users").findOne({ email: token.email });
            if (dbUser) {
              token.id = dbUser._id.toString();
            }
          } catch (error) {
            console.error("Error fetching user ID:", error);
          }
        }
      }
      
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
