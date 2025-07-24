import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("meraki");

    const chats = await db.collection("chats").find({}).toArray();
    const messages = await db.collection("chatMessages").find({}).toArray();

    res.status(200).json({
      chats: chats.map((chat) => ({
        ...chat,
        _id: chat._id.toString(),
        id: chat._id.toString(),
      })),
      messages: messages.map((msg) => ({
        ...msg,
        _id: msg._id.toString(),
        id: msg._id.toString(),
      })),
      chatCount: chats.length,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("Debug API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
