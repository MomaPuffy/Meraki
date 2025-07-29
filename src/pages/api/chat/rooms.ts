import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("meraki");

    if (req.method === "GET") {
      // Get all chats the user has access to
      const chats = await db
        .collection("chats")
        .find({
          $or: [{ participants: session.user.id }, { isPublic: true }],
        })
        .sort({ updatedAt: -1 })
        .toArray();

      const chatsWithId = chats.map((chat) => ({
        ...chat,
        id: chat._id.toString(),
      }));

      res.status(200).json(chatsWithId);
    } else if (req.method === "POST") {
      // Create new chat room
      const {
        name,
        description,
        isPublic = true,
        participants = [],
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Chat name is required" });
      }

      // Add creator to participants if not already included
      const chatParticipants = [...new Set([session.user.id, ...participants])];

      const newChat = {
        name: name.trim(),
        description: description?.trim() || "",
        isPublic,
        participants: chatParticipants,
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: null,
        messageCount: 0,
      };

      const result = await db.collection("chats").insertOne(newChat);

      const savedChat = {
        ...newChat,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      };

      res.status(201).json(savedChat);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("Chat rooms API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
