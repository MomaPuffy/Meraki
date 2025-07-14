import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("meraki");
    
    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email });
    
    if (existingUser) {
      // Check if the user was created via Google OAuth
      if (existingUser.provider === 'google') {
        return res.status(400).json({ 
          message: 'An account with this email already exists. Please sign in with Google.' 
        });
      } else {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      provider: "credentials",
      createdAt: new Date(),
    });

    res.status(201).json({ 
      message: 'User created successfully',
      userId: result.insertedId 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
