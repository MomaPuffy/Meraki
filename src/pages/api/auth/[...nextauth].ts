import NextAuth, {
  type NextAuthOptions,
  type User,
  type Account,
  type Profile,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "../../../lib/mongodb";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { getUserColorKey } from "../../../lib/colorConfig";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      position?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    position?: string;
  }
}

// Add this type declaration
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    position?: string;
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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const client = await clientPromise;
          const db = client.db("meraki");
          const user = await db
            .collection("users")
            .findOne({ email: credentials.email });

          if (!user) {
            return null;
          }

          // Check if user signed up with Google
          if (user.provider === "google") {
            throw new Error(
              "This email is associated with a Google account. Please sign in with Google."
            );
          }

          // Check if user has a password (credentials-based account)
          if (!user.password) {
            throw new Error(
              "This account was created with Google. Please sign in with Google."
            );
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            position: user.position || "Member",
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
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
    async signIn({
      user,
      account,
    }: {
      user: User;
      account: Account | null;
      profile?: Profile;
    }) {
      if (account?.provider === "google") {
        try {
          const client = await clientPromise;
          const db = client.db("meraki");

          // Check if user already exists in database
          let existingUser = await db
            .collection("users")
            .findOne({ email: user.email });

          if (!existingUser) {
            // Add Google user to database
            const newUser = {
              email: user.email,
              name: user.name,
              image: user.image,
              provider: "google",
              department: "Unassigned",
              position: "Member",
              color: getUserColorKey("Member", "Unassigned"),
              createdAt: new Date(),
            };
            const result = await db.collection("users").insertOne(newUser);
            existingUser = await db
              .collection("users")
              .findOne({ _id: result.insertedId });
          }

          // Add position and id to user object for the JWT callback
          user.position = existingUser?.position;
          user.id = existingUser?._id?.toString() || user.id;
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
        token.position = user.position;
      } else if (!token.position && token.email) {
        // Fallback: fetch position from database if not in token
        try {
          const client = await clientPromise;
          const db = client.db("meraki");
          const dbUser = await db
            .collection("users")
            .findOne({ email: token.email });
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.position = dbUser.position;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.position = token.position; // Add position to session
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
