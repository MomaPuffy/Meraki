import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Server as HTTPServer } from "http";
import type { Server as IOServer } from "socket.io";

type ServerWithIo = HTTPServer & { io?: IOServer };

type NewMessagePayload = {
  content: string;
  userId: string;
  userName?: string;
  timestamp?: string;
  [k: string]: unknown;
};

function validateNewMessagePayload(body: unknown): NewMessagePayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const content = typeof b.content === "string" ? b.content : "";
  const userId = typeof b.userId === "string" ? b.userId : "";
  const userName = typeof b.userName === "string" ? b.userName : undefined;
  const timestamp =
    typeof b.timestamp === "string" ? b.timestamp : new Date().toISOString();
  if (!content || !userId) return null;
  return { content, userId, userName, timestamp };
}

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
      const reversedMessages = messages.reverse().map((msg) => {
        // ensure timestamp and createdAt are strings (ISO)
        const timestamp =
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : typeof msg.timestamp === "string"
            ? msg.timestamp
            : new Date().toISOString();
        const createdAt =
          msg.createdAt instanceof Date
            ? msg.createdAt.toISOString()
            : typeof msg.createdAt === "string"
            ? msg.createdAt
            : new Date().toISOString();

        return {
          ...msg,
          id: msg._id.toString(),
          timestamp,
          createdAt,
        };
      });

      res.status(200).json(reversedMessages);
    } else if (req.method === "POST") {
      // Add new message
      const raw = req.body; // unknown
      const payload = validateNewMessagePayload(raw);
      if (!payload) {
        res.status(400).json({ error: "Invalid message payload" });
        return;
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

      const collection = db.collection("chatMessages");
      const saved = await collection.insertOne({
        chatId: chatId, // Store as string
        content: payload.content,
        senderId: payload.userId,
        senderName: payload.userName,
        senderImage: session.user.image || null,
        timestamp: new Date(payload.timestamp || new Date().toISOString()),
        edited: false,
        editedAt: null,
        createdAt: new Date(),
      });

      // Update chat's last message and activity
      await db.collection("chats").updateOne(
        { _id: new ObjectId(chatId) },
        {
          $set: {
            lastMessage: {
              content: payload.content,
              senderName: payload.userName,
              timestamp: new Date(
                payload.timestamp || new Date().toISOString()
              ),
            },
            updatedAt: new Date(),
          },
          $inc: {
            messageCount: 1,
          },
        }
      );

      // when emitting via socket, send a typed object
      const savedMessage = {
        id: saved.insertedId.toString(),
        content: payload.content,
        senderId: payload.userId,
        senderName: payload.userName,
        timestamp: new Date(
          payload.timestamp || new Date().toISOString()
        ).toISOString(),
      };

      // safely access the HTTP server instance and its Socket.IO server without `any`
      const server = (res.socket as unknown as { server: ServerWithIo }).server;
      if (server?.io) {
        server.io.to(chatId).emit("message:new", savedMessage);
      }
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
