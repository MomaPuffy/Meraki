import { useState, useEffect, useCallback } from "react";
import { ChatState } from "@/types/chat";

export const useChat = (chatId?: string) => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    currentChat: null,
    users: [],
    isLoading: false,
    error: null,
  });

  const fetchMessages = useCallback(async (id: string) => {
    console.log(`Fetching messages for chat: ${id}`);
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch(`/api/chat/${id}/messages`);
      console.log(`Messages response status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to fetch messages: ${response.status} - ${errorText}`
        );
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      const messages = await response.json();
      console.log(`Fetched ${messages.length} messages`);
      setState((prev) => ({ ...prev, messages, isLoading: false }));
    } catch (error) {
      console.error("Error fetching messages:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      }));
    }
  }, []);

  const fetchChat = useCallback(async (id: string) => {
    console.log(`Fetching chat details for: ${id}`);
    try {
      const response = await fetch(`/api/chat/${id}`);
      console.log(`Chat response status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to fetch chat: ${response.status} - ${errorText}`
        );
        throw new Error(`Failed to fetch chat: ${response.status}`);
      }
      const chat = await response.json();
      console.log("Fetched chat:", chat);
      setState((prev) => ({ ...prev, currentChat: chat }));
    } catch (error) {
      console.error("Error fetching chat:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to fetch chat",
      }));
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, senderId: string, senderName: string) => {
      if (!chatId) return;

      try {
        const response = await fetch(`/api/chat/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            userId: senderId,
            userName: senderName,
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");
        const newMessage = await response.json();

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, newMessage],
        }));

        return newMessage;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to send message",
        }));
        throw error;
      }
    },
    [chatId]
  );

  const fetchChats = useCallback(async () => {
    console.log("Fetching chat rooms");
    try {
      const response = await fetch("/api/chat/rooms");
      console.log(`Chat rooms response status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to fetch chats: ${response.status} - ${errorText}`
        );
        throw new Error(`Failed to fetch chats: ${response.status}`);
      }
      const chats = await response.json();
      console.log(`Fetched ${chats.length} chat rooms`);
      return chats;
    } catch (error) {
      console.error("Error fetching chats:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to fetch chats",
      }));
      return [];
    }
  }, []);

  const createChat = useCallback(
    async (name: string, description?: string, isPublic: boolean = true) => {
      try {
        const response = await fetch("/api/chat/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, isPublic }),
        });

        if (!response.ok) throw new Error("Failed to create chat");
        return await response.json();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to create chat",
        }));
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    if (chatId) {
      console.log(`useChat effect triggered with chatId: ${chatId}`);
      fetchMessages(chatId);
      fetchChat(chatId);
    } else {
      console.log("useChat effect: no chatId provided");
    }
  }, [chatId, fetchMessages, fetchChat]);

  return {
    ...state,
    sendMessage,
    fetchChats,
    createChat,
    refreshMessages: () => chatId && fetchMessages(chatId),
  };
};
