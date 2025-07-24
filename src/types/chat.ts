export interface Message {
  id: string;
  _id?: string;
  content: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  timestamp: Date;
  chatId: string;
  edited: boolean;
  editedAt?: Date | null;
  createdAt: Date;
}

export interface Chat {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  participants: string[];
  isPublic: boolean;
  createdBy: string;
  lastMessage?: {
    content: string;
    senderName: string;
    timestamp: Date;
  } | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
}

export interface ChatState {
  messages: Message[];
  currentChat: Chat | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
}
