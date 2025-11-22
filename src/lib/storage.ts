import { Personality, Chat } from './types';

const PERSONALITIES_KEY = 'ai_personalities';
const CHATS_KEY = 'ai_chats';

export const storage = {
  // Personalities
  getPersonalities(): Personality[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(PERSONALITIES_KEY);
    return data ? JSON.parse(data) : [];
  },

  savePersonality(personality: Personality): void {
    const personalities = this.getPersonalities();
    const index = personalities.findIndex(p => p.id === personality.id);
    if (index >= 0) {
      personalities[index] = personality;
    } else {
      personalities.push(personality);
    }
    localStorage.setItem(PERSONALITIES_KEY, JSON.stringify(personalities));
  },

  deletePersonality(id: string): void {
    const personalities = this.getPersonalities().filter(p => p.id !== id);
    localStorage.setItem(PERSONALITIES_KEY, JSON.stringify(personalities));
  },

  getPersonality(id: string): Personality | undefined {
    return this.getPersonalities().find(p => p.id === id);
  },

  // Chats
  getChats(): Chat[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(CHATS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveChat(chat: Chat): void {
    const chats = this.getChats();
    const index = chats.findIndex(c => c.id === chat.id);
    if (index >= 0) {
      chats[index] = chat;
    } else {
      chats.push(chat);
    }
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  },

  deleteChat(id: string): void {
    const chats = this.getChats().filter(c => c.id !== id);
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  },

  getChat(id: string): Chat | undefined {
    return this.getChats().find(c => c.id === id);
  },
};
