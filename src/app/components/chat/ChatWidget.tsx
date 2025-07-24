import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useChat } from "@/hooks/useChat";

interface Chat {
  _id: string;
  id: string;
  name: string;
  lastMessage?: {
    content: string;
    senderName: string;
    timestamp: string;
  };
  messageCount: number;
  updatedAt?: string;
}

export default function ChatWidget() {
  const router = useRouter();
  const { fetchChats } = useChat();
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentChats = async () => {
      try {
        const chats = await fetchChats();
        // Sort by last message timestamp or creation date, take top 3
        const sortedChats = chats
          .sort((a: Chat, b: Chat) => {
            const aTime = a.lastMessage?.timestamp || a.updatedAt || "";
            const bTime = b.lastMessage?.timestamp || b.updatedAt || "";
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          })
          .slice(0, 3);
        setRecentChats(sortedChats);
      } catch (error) {
        console.error("Failed to load recent chats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentChats();
  }, [fetchChats]);

  const navigateToChat = (chatId?: string) => {
    if (chatId) {
      router.push(`/chat?room=${chatId}`);
    } else {
      router.push("/chat");
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Chats</h2>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-3 bg-gray-300 rounded w-3/4 mb-1"></div>
              <div className="h-2 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Recent Chats</h2>
        <button
          onClick={() => navigateToChat()}
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {recentChats.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.732-.425l-2.268.849 1.621-2.426A7.963 7.963 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-3">No recent chats</p>
            <button
              onClick={() => navigateToChat()}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm transition-colors"
            >
              Start Chatting
            </button>
          </div>
        ) : (
          <>
            {recentChats.map((chat) => (
              <div
                key={chat._id || chat.id}
                onClick={() => navigateToChat(chat._id || chat.id)}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {chat.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {chat.name}
                  </p>
                  {chat.lastMessage ? (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 truncate flex-1">
                        {chat.lastMessage.senderName}:{" "}
                        {chat.lastMessage.content}
                      </p>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatTimestamp(chat.lastMessage.timestamp)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No messages yet</p>
                  )}
                </div>
              </div>
            ))}
            <div className="pt-2 border-t">
              <button
                onClick={() => navigateToChat()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm transition-colors"
              >
                Open Chat
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
