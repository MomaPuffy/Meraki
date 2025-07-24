import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Navbar from "../app/components/navbar/Navbar";
import { ChatContainer } from "../app/components/chat/ChatContainer";

interface Chat {
  _id: string;
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  participants: string[];
  lastMessage?: {
    content: string;
    senderName: string;
    timestamp: string;
  };
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [newChatDescription, setNewChatDescription] = useState("");

  const fetchChats = useCallback(async () => {
    console.log("Starting fetchChats...");
    try {
      setError(null);
      setLoading(true);
      const response = await fetch("/api/chat/rooms");
      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch error:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const fetchedChats = await response.json();
      console.log("Fetched chats:", fetchedChats);

      setChats(fetchedChats);

      // Auto-select first chat if none selected
      if (fetchedChats.length > 0 && !selectedChat) {
        setSelectedChat(fetchedChats[0]);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch chats"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedChat]);

  // Add useEffect to fetch chats when component mounts and session is ready
  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("Session authenticated, fetching chats...");
      fetchChats();
    } else if (status === "unauthenticated") {
      console.log("User not authenticated");
      setLoading(false);
    }
  }, [status, session, fetchChats]);

  const initializeChats = async () => {
    try {
      const response = await fetch("/api/chat/init", {
        method: "POST",
      });

      if (response.ok) {
        await fetchChats();
      } else {
        throw new Error("Failed to initialize chats");
      }
    } catch (error) {
      console.error("Error initializing chats:", error);
      setError("Failed to initialize chats");
    }
  };

  const createChat = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newChatName.trim()) return;

    try {
      const response = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newChatName.trim(),
          description: newChatDescription.trim(),
          isPublic: true,
        }),
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats((prev) => [...prev, newChat]);
        setSelectedChat(newChat);
        setShowCreateForm(false);
        setNewChatName("");
        setNewChatDescription("");
      } else {
        throw new Error("Failed to create chat");
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      setError("Failed to create chat");
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600">Loading chat...</p>
          </div>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600">Please sign in to access chat.</p>
          </div>
        </div>
      </>
    );
  }

  // Add null checks for session.user properties
  const currentUserId = session.user?.id || session.user?.email || "anonymous";
  const currentUserName =
    session.user?.name || session.user?.email || "Anonymous";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 py-4 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-8rem)]">
            {/* Sidebar */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Chat Rooms</h2>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  + New
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                  {error}
                  {chats.length === 0 && (
                    <button
                      onClick={initializeChats}
                      className="block mt-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Initialize Default Chats
                    </button>
                  )}
                </div>
              )}

              {/* Create Chat Form */}
              {showCreateForm && (
                <form
                  onSubmit={createChat}
                  className="mb-4 p-3 bg-gray-50 rounded"
                >
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Chat name"
                    className="w-full px-2 py-1 border rounded mb-2 text-sm"
                    required
                  />
                  <input
                    type="text"
                    value={newChatDescription}
                    onChange={(e) => setNewChatDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-2 py-1 border rounded mb-2 text-sm"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Chat List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {chats.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">No chats available</p>
                    <button
                      onClick={initializeChats}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Create Default Chats
                    </button>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat._id || chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`w-full text-left p-3 rounded transition-colors ${
                        selectedChat?._id === chat._id ||
                        selectedChat?.id === chat.id
                          ? "bg-blue-100 border border-blue-300"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium text-sm">{chat.name}</div>
                      {chat.description && (
                        <div className="text-xs text-gray-600 truncate">
                          {chat.description}
                        </div>
                      )}
                      {chat.lastMessage && (
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {chat.lastMessage.senderName}:{" "}
                          {chat.lastMessage.content}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3">
              {selectedChat ? (
                <div className="bg-white rounded-lg shadow-lg h-full flex flex-col overflow-hidden">
                  {/* Chat Header */}
                  <div className="bg-blue-600 text-white p-4 rounded-t-lg flex-shrink-0">
                    <h2 className="text-xl font-semibold">
                      {selectedChat.name}
                    </h2>
                    {selectedChat.description && (
                      <p className="text-blue-100 text-sm">
                        {selectedChat.description}
                      </p>
                    )}
                  </div>

                  {/* Chat Container - Takes remaining space */}
                  <div className="flex-1 min-h-0">
                    <ChatContainer
                      chatId={selectedChat._id || selectedChat.id}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <h3 className="text-lg font-medium mb-2">
                      Welcome to Chat!
                    </h3>
                    <p>Select a chat room to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
