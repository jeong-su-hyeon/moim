import { create } from 'zustand';

const useChatStore = create((set) => ({
  messages: [],
  isConnected: false,

  setConnected: (connected) => set({ isConnected: connected }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  clear: () => set({ messages: [], isConnected: false }),
}));

export default useChatStore;
