import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { ChatContainer } from "@/app/components/chat/ChatContainer";
import { UserAvatar } from "@/app/components/chat/UserAvatar";
import { Chat } from "@/types/chat";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatSwitching, setChatSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [newChatDescription, setNewChatDescription] = useState("");
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle

  // Use ref to track if we've auto-selected a chat to prevent loops
  const hasAutoSelected = useRef(false);

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

      // Auto-select first chat only if none selected and haven't auto-selected before
      if (
        fetchedChats.length > 0 &&
        !selectedChat &&
        !hasAutoSelected.current
      ) {
        setSelectedChat(fetchedChats[0]);
        hasAutoSelected.current = true;
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch chats"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedChat]); // Remove selectedChat dependency to prevent circular re-renders

  // Optimized chat selection handler
  const handleChatSelect = useCallback(
    async (chat: Chat) => {
      if (
        selectedChat &&
        (selectedChat._id === chat._id || selectedChat.id === chat.id)
      ) {
        return; // Don't reload if same chat
      }

      setChatSwitching(true);
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));
      setSelectedChat(chat);
      setChatSwitching(false);

      // Close sidebar on mobile when chat is selected
      setShowSidebar(false);
    },
    [selectedChat]
  );

  // Simplified useEffect - only fetch when session status changes
  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("Session authenticated, fetching chats...");
      fetchChats();
    } else if (status === "unauthenticated") {
      console.log("User not authenticated");
      setLoading(false);
    }
  }, [status, session, fetchChats]); // Only depend on essential session data

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
        await handleChatSelect(newChat);
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
      <div className="min-h-screen flex justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">Please sign in to access chat.</p>
        </div>
      </div>
    );
  }

  // Add null checks for session.user properties - memoize to prevent re-renders
  const currentUserId =
    session?.user?.id || session?.user?.email || "anonymous";
  const currentUserName =
    session?.user?.name || session?.user?.email || "Anonymous";
  const currentUserImage = session?.user?.image || undefined;

  return (
    <div className="min-h-screen py-2 sm:py-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-2 sm:gap-4 h-[calc(100vh-1rem)] sm:h-[calc(100vh-8rem)]">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white rounded-lg shadow-lg p-3 mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserAvatar
                src={currentUserImage}
                name={currentUserName}
                size="sm"
              />
              <div>
                <h1 className="text-lg font-semibold">Chat</h1>
                {selectedChat && (
                  <p className="text-sm text-gray-600 truncate max-w-32">
                    {selectedChat.name}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 lg:hidden"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Sidebar */}
          <div
            className={`
            ${
              showSidebar
                ? "fixed inset-0 z-50 backdrop-blur-sm bg-white/20 lg:relative lg:bg-transparent lg:backdrop-blur-none"
                : "hidden lg:block"
            }
            lg:col-span-1
            `}
          >
            <div
              className={`
              ${showSidebar ? "absolute left-0 top-0 w-80 h-full" : "h-full"}
              bg-white rounded-lg shadow-lg p-3 sm:p-4
            `}
            >
              {/* Mobile Close Button */}
              {showSidebar && (
                <div className="flex justify-between items-center mb-4 lg:hidden">
                  <h2 className="text-lg font-semibold">Chat Rooms</h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Desktop Header */}
              <div className="hidden lg:flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <UserAvatar
                    src={currentUserImage}
                    name={currentUserName}
                    size="sm"
                  />
                  <h2 className="text-lg font-semibold">Chat Rooms</h2>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  + New
                </button>
              </div>

              {/* Mobile New Chat Button */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  + Create New Chat
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
              <div className="space-y-2 max-h-64 sm:max-h-96">
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
                  chats.map((chat) => {
                    const isSelected =
                      selectedChat &&
                      (selectedChat._id === chat._id ||
                        selectedChat.id === chat.id);

                    return (
                      <button
                        key={chat._id || chat.id}
                        onClick={() => handleChatSelect(chat)}
                        disabled={chatSwitching}
                        className={`w-full text-left p-3 rounded transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-100 border border-blue-300"
                            : "hover:bg-gray-100"
                        } ${
                          chatSwitching ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <UserAvatar name={chat.name} size="sm" />
                          <div className="font-medium text-sm truncate">
                            {chat.name}
                          </div>
                        </div>
                        {chat.description && (
                          <div className="text-xs text-gray-600 truncate ml-7">
                            {chat.description}
                          </div>
                        )}
                        {chat.lastMessage && (
                          <div className="text-xs text-gray-500 mt-1 truncate ml-7">
                            {chat.lastMessage.senderName}:{" "}
                            {chat.lastMessage.content}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 lg:col-span-3">
            {selectedChat ? (
              <div className="bg-white rounded-lg shadow-lg h-full flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="bg-blue-600 text-white p-3 sm:p-4 rounded-t-lg flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Mobile back button */}
                      <button
                        onClick={() => setShowSidebar(true)}
                        className="lg:hidden p-1 hover:bg-blue-700 rounded"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                          />
                        </svg>
                      </button>
                      <h2 className="text-lg sm:text-xl font-semibold flex items-center">
                        {selectedChat.name}
                        {chatSwitching && (
                          <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                      </h2>
                    </div>
                  </div>
                  {selectedChat.description && (
                    <p className="text-blue-100 text-sm mt-1">
                      {selectedChat.description}
                    </p>
                  )}
                </div>

                {/* Chat Container - Takes remaining space */}
                <div className="flex-1 min-h-0 relative">
                  {chatSwitching && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span>Loading chat...</span>
                      </div>
                    </div>
                  )}
                  <ChatContainer
                    key={selectedChat._id || selectedChat.id}
                    chatId={selectedChat._id || selectedChat.id}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    currentUserImage={currentUserImage}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg h-full flex items-center justify-center">
                <div className="text-center text-gray-500 p-4">
                  <h3 className="text-lg font-medium mb-2">Welcome to Chat!</h3>
                  <p className="text-sm sm:text-base mb-4">
                    Select a chat room to start messaging
                  </p>
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="lg:hidden px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Browse Chat Rooms
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
