import { useState, useEffect, useRef, useCallback } from "react";
import { Message, ChatContainerProps } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";
import { useChatSocket } from "@/hooks/useChatSocket";

export function ChatContainer({
  chatId,
  currentUserId,
  currentUserName,
  currentUserImage,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const stopPollingRef = useRef(false);

  // Validate chatId format
  const isValidObjectId = (id: string) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // small helper to safely read string fields from a loosely typed object
  const getStringField = useCallback(
    (
      obj: Record<string, unknown> | undefined,
      key: string
    ): string | undefined => {
      if (!obj) return undefined;
      const v = obj[key];
      return typeof v === "string" ? v : undefined;
    },
    []
  );

  const getMessageId = useCallback(
    (m: Partial<Message> | Record<string, unknown>): string =>
      getStringField(m as Record<string, unknown>, "id") ??
      getStringField(m as Record<string, unknown>, "_id") ??
      `${getStringField(m as Record<string, unknown>, "timestamp") ?? ""}|${
        getStringField(m as Record<string, unknown>, "content") ?? ""
      }|${getStringField(m as Record<string, unknown>, "senderId") ?? ""}`,
    [getStringField]
  );

  // Normalize message to ensure stable id and ISO timestamp
  const normalizeMessage = useCallback(
    (m: Partial<Message> | Record<string, unknown>): Message => {
      const id = getMessageId(m);
      const tsRaw =
        getStringField(m as Record<string, unknown>, "timestamp") ??
        getStringField(m as Record<string, unknown>, "createdAt") ??
        new Date().toISOString();
      const timestamp = new Date(tsRaw).toISOString();
      return {
        ...(m as Record<string, unknown>),
        id,
        timestamp,
      } as unknown as Message;
    },
    [getMessageId, getStringField]
  );

  // Merge incoming messages into state deduping by stable id and keeping chronological order
  const mergeMessages = useCallback(
    (incoming: Array<Partial<Message> | Record<string, unknown>>) => {
      if (!incoming || incoming.length === 0) return;
      setMessages((prev) => {
        const map = new Map<string, Message>();
        // add previous messages
        prev.forEach((m) => map.set(getMessageId(m), m));
        // add normalized incoming (skip if id exists)
        incoming.map(normalizeMessage).forEach((m) => {
          const id = getMessageId(m);
          if (!map.has(id)) map.set(id, m);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) =>
            Date.parse(a.timestamp as unknown as string) -
            Date.parse(b.timestamp as unknown as string)
        );
        // update seenIdsRef to include all known ids
        merged.forEach((m) => seenIdsRef.current.add(getMessageId(m)));
        return merged;
      });
    },
    [normalizeMessage, getMessageId]
  );

  // Auto-scroll to bottom within the messages container only
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  // fetch only new messages since lastTimestamp (if provided)
  const fetchMessages = useCallback(
    async (since?: string): Promise<Message[]> => {
      if (!chatId || !isValidObjectId(chatId)) {
        setError("Invalid chat ID");
        return [];
      }

      try {
        setError(null);
        pollAbortRef.current?.abort();
        const controller = new AbortController();
        pollAbortRef.current = controller;

        const url = new URL(`/api/chat/${chatId}/messages`, location.origin);
        if (since) url.searchParams.set("since", since);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error || `HTTP ${response.status}`
          );
        }

        const fetchedRaw = await response.json().catch(() => []);
        const fetched: Array<Partial<Message> | Record<string, unknown>> =
          Array.isArray(fetchedRaw) ? fetchedRaw : [];
        return fetched.map(normalizeMessage);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return [];
        console.error("Error fetching messages:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch messages"
        );
        return [];
      }
    },
    [chatId, normalizeMessage]
  );

  useEffect(() => {
    // Small delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  // Fetch messages when chat changes
  useEffect(() => {
    stopPollingRef.current = false;
    lastTimestampRef.current = null;
    seenIdsRef.current = new Set();
    (async () => {
      if (chatId && isValidObjectId(chatId)) {
        try {
          const initial = await fetchMessages();
          // merge (dedupe + sort) instead of blind replace/append
          mergeMessages(initial);
          if (initial && initial.length) {
            const maxTs = Math.max(
              ...initial.map(
                (m) => Date.parse(m.timestamp as unknown as string) || 0
              )
            );
            if (maxTs > 0)
              lastTimestampRef.current = new Date(maxTs).toISOString();
          }
          setError(null);
        } catch {
          // error set in fetchMessages
        }
      } else if (chatId) {
        setError(`Invalid chat ID format: ${chatId}`);
        setMessages([]);
      }
    })();
  }, [chatId, fetchMessages, mergeMessages]);

  // Improved poll loop: non-overlapping, since param, backoff, pause on hidden
  // Replace polling with WebSocket hook; onMessage will merge incoming messages
  const onSocketMessage = useCallback(
    (m: Message) => {
      // normalize + merge incoming
      mergeMessages([m]);
      const ts = Date.parse(m.timestamp as unknown as string) || 0;
      if (ts > 0) lastTimestampRef.current = new Date(ts).toISOString();
    },
    [mergeMessages]
  );

  // establish socket connection; server broadcasts "message:new" which calls onSocketMessage
  useChatSocket(chatId, onSocketMessage);

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading || !chatId || !isValidObjectId(chatId))
      return;

    setIsLoading(true);
    setError(null);

    try {
      const messageData = {
        content: newMessage,
        userId: currentUserId,
        userName: currentUserName,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const savedMessage = await response.json();
      // normalize + merge sent message to avoid duplicates even if server returns full history
      const normalized = normalizeMessage(savedMessage);
      mergeMessages([normalized]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!chatId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <p className="text-gray-500">Please select a chat to start messaging</p>
      </div>
    );
  }

  if (!isValidObjectId(chatId)) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Invalid Chat ID</p>
          <p className="text-red-500 text-sm mt-1">
            Chat ID must be a valid MongoDB ObjectId
          </p>
          <p className="text-gray-500 text-xs mt-2">Current ID: {chatId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex-shrink-0">
          <div className="font-semibold">Error:</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Messages container - Fixed height with scroll */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0 max-h-[calc(100vh-15rem)]"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={getMessageId(message)}
              className={`flex items-start space-x-2 ${
                message.senderId === currentUserId
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <UserAvatar
                src={
                  message.senderId === currentUserId
                    ? currentUserImage
                    : message.senderImage
                }
                name={message.senderName}
                size="sm"
                className="mt-1"
              />
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.senderId === currentUserId
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800 shadow-sm border"
                }`}
              >
                {message.senderId !== currentUserId && (
                  <div className="text-xs font-semibold mb-1 text-gray-600">
                    {message.senderName}
                  </div>
                )}
                <div className="text-sm">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.senderId === currentUserId
                      ? "text-blue-100"
                      : "text-gray-500"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Fixed at bottom */}
      <div className="border-t bg-white p-4 flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || !isValidObjectId(chatId)}
          />
          <button
            onClick={sendMessage}
            disabled={
              !newMessage.trim() || isLoading || !isValidObjectId(chatId)
            }
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
