import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from '../../lib/mongodb';
import { getUserColorKey } from '../../lib/colorConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the session from NextAuth
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.email) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { name, department } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: 'Name must be less than 100 characters' });
    }

    // Get current user to preserve position and calculate color
    const client = await clientPromise;
    const db = client.db("meraki");
    
    const currentUser = await db.collection("users").findOne({ 
      email: session.user.email 
    });

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate color based on current position and new department
    const userColor = getUserColorKey(currentUser.position, department || "Unassigned");
    
    const result = await db.collection("users").updateOne(
      { email: session.user.email },
      { 
        $set: { 
          name: name.trim(),
          department: department || "Unassigned",
          color: userColor,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch updated user data
    const updatedUser = await db.collection("users").findOne({ 
      email: session.user.email 
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    // Return updated user data (excluding password for security)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userData } = updatedUser;
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image || null,
        provider: updatedUser.provider,
        googleId: updatedUser.googleId || null,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        ...userData
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
