import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  timestamp: Date | string;
  chatId: string;
}

interface ChatContainerProps {
  chatId: string;
  currentUserId: string;
  currentUserName: string;
}

export function ChatContainer({
  chatId,
  currentUserId,
  currentUserName,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Validate chatId format
  const isValidObjectId = (id: string) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Auto-scroll to bottom within the messages container only
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!chatId || !isValidObjectId(chatId)) {
      setError("Invalid chat ID");
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/chat/${chatId}/messages`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const fetchedMessages = await response.json();
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch messages"
      );
    }
  }, [chatId]);

  useEffect(() => {
    // Small delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  // Fetch messages when chat changes
  useEffect(() => {
    if (chatId && isValidObjectId(chatId)) {
      fetchMessages();
      setError(null);
    } else if (chatId) {
      setError(`Invalid chat ID format: ${chatId}`);
      setMessages([]);
    }
  }, [chatId, fetchMessages]);

  // Polling for new messages
  useEffect(() => {
    if (!chatId || !isValidObjectId(chatId)) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [chatId, fetchMessages]);

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

      setMessages((prev) => [...prev, savedMessage]);
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
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0"
        style={{ maxHeight: "calc(100% - 80px)" }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUserId
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
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
