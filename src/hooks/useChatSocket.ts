import { useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/types/chat";

export function useChatSocket(
  chatId: string | null,
  onMessage: (m: Message) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!chatId) return;

    fetch("/api/socket").catch(() => {});

    const socket = io(undefined, {
      path: "/api/socket",
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", chatId);
    });

    socket.on("message:new", (raw: unknown) => {
      onMessage(raw as Message);
    });

    socket.on("disconnect", () => {});

    return () => {
      socket.emit("leave", chatId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatId, onMessage]);

  const send = useCallback(
    (payload: Partial<Message> | Record<string, unknown>) => {
      socketRef.current?.emit("message:send", payload);
    },
    []
  );

  return { send, socket: socketRef.current };
}
