import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { chatId } = req.query;

  // Validate chatId
  if (!chatId || typeof chatId !== "string") {
    return res.status(400).json({ error: "Invalid chat ID format" });
  }

  // Check if chatId is a valid ObjectId
  if (!ObjectId.isValid(chatId)) {
    return res
      .status(400)
      .json({ error: "Invalid chat ID - must be a valid ObjectId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("meraki");

    if (req.method === "GET") {
      // Get messages for the chat with pagination
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

      // First verify user has access to this chat
      const chat = await db.collection("chats").findOne({
        _id: new ObjectId(chatId),
        $or: [{ participants: session.user.id }, { isPublic: true }],
      });

      if (!chat) {
        return res
          .status(403)
          .json({ error: "Access denied to this chat or chat not found" });
      }

      const messages = await db
        .collection("chatMessages")
        .find({ chatId: chatId }) // Use chatId as string, not ObjectId
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Reverse to show oldest first and add id field
      const reversedMessages = messages.reverse().map((msg) => ({
        ...msg,
        id: msg._id.toString(),
      }));

      res.status(200).json(reversedMessages);
    } else if (req.method === "POST") {
      // Add new message
      const { text, content, userId, userName, timestamp } = req.body;
      const messageContent = content || text; // Support both field names

      if (!messageContent || !userId || !userName) {
        return res
          .status(400)
          .json({
            error: "Missing required fields: content, userId, userName",
          });
      }

      // Verify user has access to this chat
      const chat = await db.collection("chats").findOne({
        _id: new ObjectId(chatId),
        $or: [{ participants: session.user.id }, { isPublic: true }],
      });

      if (!chat) {
        return res
          .status(403)
          .json({ error: "Access denied to this chat or chat not found" });
      }

      const newMessage = {
        chatId: chatId, // Store as string
        content: messageContent,
        senderId: userId,
        senderName: userName,
        senderImage: session.user.image || null,
        timestamp: new Date(timestamp || Date.now()),
        edited: false,
        editedAt: null,
        createdAt: new Date(),
      };

      const result = await db.collection("chatMessages").insertOne(newMessage);

      // Update chat's last message and activity
      await db.collection("chats").updateOne(
        { _id: new ObjectId(chatId) },
        {
          $set: {
            lastMessage: {
              content: messageContent,
              senderName: userName,
              timestamp: newMessage.timestamp,
            },
            updatedAt: new Date(),
          },
          $inc: {
            messageCount: 1,
          },
        }
      );

      const savedMessage = {
        ...newMessage,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      };

      res.status(201).json(savedMessage);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("Chat messages API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
