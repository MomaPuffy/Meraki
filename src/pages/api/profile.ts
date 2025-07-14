import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the session from NextAuth
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.email) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Fetch complete user data from database
    const client = await clientPromise;
    const db = client.db("meraki");
    const user = await db.collection("users").findOne({ 
      email: session.user.email 
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data (excluding password for security)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userData } = user;
    
    res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image || null,
        provider: user.provider,
        googleId: user.googleId || null,
        createdAt: user.createdAt,
        ...userData
      }
    });
  } catch (error) {
    console.error('Profile API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
