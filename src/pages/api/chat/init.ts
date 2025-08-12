import { NextApiRequest, NextApiResponse } from "next";
import { Session } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { withAuth } from "@/utils/withAuth";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("meraki");

    // Check if chats already exist
    const existingChats = await db.collection("chats").countDocuments();

    if (existingChats > 0) {
      return res.status(200).json({ message: "Chats already initialized" });
    }

    // Create default chats
    const defaultChats = [
      {
        name: "General",
        description: "General discussion for all team members",
        isPublic: true,
        participants: [],
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: null,
        messageCount: 0,
      },
      {
        name: "Announcements",
        description: "Important announcements and updates",
        isPublic: true,
        participants: [],
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: null,
        messageCount: 0,
      },
      {
        name: "Random",
        description: "Off-topic discussions and casual chat",
        isPublic: true,
        participants: [],
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: null,
        messageCount: 0,
      },
    ];

    const result = await db.collection("chats").insertMany(defaultChats);

    res.status(201).json({
      message: "Default chats created successfully",
      createdChats: result.insertedIds,
    });
  } catch (error) {
    console.error("Chat initialization error:", error);
    res.status(500).json({ error: "Failed to initialize chats" });
  }
}

export default withAuth(handler);
