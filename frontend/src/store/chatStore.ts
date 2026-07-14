import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  message: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

export interface Chat {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  unreadCount: number;
  lastMessageText: string | null;
  lastMessageTime: string | null;
  members: any[];
}

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  messages: Record<string, ChatMessage[]>;
  typingUsers: Record<string, string[]>; // chatId -> userIds
  onlineUsers: Record<string, boolean>; // userId -> isOnline

  setChats: (chats: Chat[]) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  setActiveChatId: (chatId: string | null) => void;
  
  setMessages: (chatId: string, messages: ChatMessage[]) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: 'SENT' | 'DELIVERED' | 'READ') => void;

  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  setOnlineStatus: (userId: string, isOnline: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  messages: {},
  typingUsers: {},
  onlineUsers: {},

  setChats: (chats) => set((state) => {
    return {
      chats: chats.map(newChat => {
        if (state.activeChatId === newChat.id) {
          return { ...newChat, unreadCount: 0 };
        }
        const oldChat = state.chats.find(c => c.id === newChat.id);
        if (oldChat && (oldChat.unreadCount || 0) > (newChat.unreadCount || 0)) {
          return { ...newChat, unreadCount: oldChat.unreadCount };
        }
        return newChat;
      })
    };
  }),
  
  updateChat: (chatId, updates) => set((state) => ({
    chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
  })),

  removeChat: (chatId) => set((state) => ({
    chats: state.chats.filter((c) => c.id !== chatId),
    activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
  })),

  setActiveChatId: (activeChatId) => set({ activeChatId }),

  setMessages: (chatId, newMessages) => set((state) => ({
    messages: { ...state.messages, [chatId]: newMessages },
  })),

  addMessage: (chatId, message) => set((state) => {
    const existing = state.messages[chatId] || [];
    // prevent duplicates
    if (existing.some(m => m.id === message.id)) return state;
    
    // Remove temp messages from same sender if a real message arrives
    const filtered = existing.filter(m => !(m.id.startsWith('temp-') && m.senderId === message.senderId && m.message === message.message));
    
    return {
      messages: { ...state.messages, [chatId]: [...filtered, message] }
    };
  }),

  updateMessageStatus: (chatId, messageId, status) => set((state) => {
    const existing = state.messages[chatId] || [];
    return {
      messages: {
        ...state.messages,
        [chatId]: existing.map(m => m.id === messageId ? { ...m, status } : m)
      }
    };
  }),

  setTyping: (chatId, userId, isTyping) => set((state) => {
    const currentTyping = state.typingUsers[chatId] || [];
    const newTyping = isTyping 
      ? Array.from(new Set([...currentTyping, userId]))
      : currentTyping.filter(id => id !== userId);
    
    return {
      typingUsers: { ...state.typingUsers, [chatId]: newTyping }
    };
  }),

  setOnlineStatus: (userId, isOnline) => set((state) => ({
    onlineUsers: { ...state.onlineUsers, [userId]: isOnline }
  })),
}));

// Cross-tab synchronization
if (typeof window !== 'undefined') {
  const channel = new BroadcastChannel('chat-sync');
  
  channel.onmessage = (event) => {
    if (event.data.type === 'CHAT_READ') {
      const { chatId } = event.data;
      useChatStore.getState().updateChat(chatId, { unreadCount: 0 });
    } else if (event.data.type === 'NEW_MESSAGE') {
      const { message } = event.data;
      useChatStore.getState().addMessage(message.chatId, message);
    }
  };

  // We patch the store to broadcast reads
  const originalUpdateChat = useChatStore.getState().updateChat;
  useChatStore.setState({
    updateChat: (chatId, updates) => {
      originalUpdateChat(chatId, updates);
      if (updates.unreadCount === 0) {
        channel.postMessage({ type: 'CHAT_READ', chatId });
      }
    }
  });
}
