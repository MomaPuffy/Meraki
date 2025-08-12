import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useChat } from "@/hooks/useChat";
import { Chat } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";

export default function ChatWidget() {
  const router = useRouter();
  const { data: session } = useSession();
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
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
        <div className="pt-3">
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentChats.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
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
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            No recent chats
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Start a conversation to see your chats here
          </p>
          <button
            onClick={() => navigateToChat()}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-sm transition-colors duration-200 font-medium"
          >
            Start New Chat
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {recentChats.map((chat) => (
              <div
                key={chat._id || chat.id}
                onClick={() => navigateToChat(chat._id || chat.id)}
                className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors duration-200 border border-gray-100"
              >
                <UserAvatar name={chat.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {chat.name}
                    </p>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatTimestamp(
                          typeof chat.lastMessage.timestamp === "string"
                            ? chat.lastMessage.timestamp
                            : chat.lastMessage.timestamp.toISOString()
                        )}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage ? (
                    <p className="text-xs text-gray-600 truncate">
                      <span className="font-medium">
                        {chat.lastMessage.senderName}:
                      </span>{" "}
                      {chat.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      No messages yet
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => navigateToChat()}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-2 px-4 rounded-md text-sm transition-all duration-200 font-medium flex items-center justify-center"
            >
              {session?.user?.image && (
                <UserAvatar
                  src={session.user.image}
                  name={session.user.name || "User"}
                  size="sm"
                  className="mr-2"
                />
              )}
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z"
                />
              </svg>
              Open Chat Center
            </button>
          </div>
        </>
      )}
    </div>
  );
}
