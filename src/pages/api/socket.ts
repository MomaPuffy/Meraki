import { Server as IOServer, Socket as IOSocket } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";

type ServerWithIo = HTTPServer & { io?: IOServer };

interface SocketPayload {
  roomId?: string;
  [key: string]: unknown;
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // reuse existing server instance between hot reloads
  const server = (res.socket as unknown as { server: ServerWithIo }).server;

  if (!server.io) {
    const io = new IOServer(server, {
      path: "/api/socket",
      // adjust CORS/origins for your deployment
      cors: { origin: "*" },
    });

    server.io = io;

    io.on("connection", (socket: IOSocket) => {
      socket.on("join", (roomId: string) => {
        if (roomId) socket.join(roomId);
      });

      socket.on("leave", (roomId: string) => {
        if (roomId) socket.leave(roomId);
      });

      // Optional: if clients emit 'message:send' over socket, broadcast to room
      socket.on("message:send", (payload: SocketPayload) => {
        const room =
          typeof payload.roomId === "string" ? payload.roomId : undefined;
        if (room) {
          // broadcast to everyone in the room (including sender)
          io.to(room).emit("message:new", payload);
        }
      });
    });

    console.log("Socket.IO server initialized.");
  }

  res.end();
}
