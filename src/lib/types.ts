export interface Personality {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  traits: string[];
  description: string;
  createdAt: string;
  // Дополнительно: галерея исходных фото для построения точного 3D-аватара/референсов
  avatarGallery?: string[];
}

export interface Message {
  id: string;
  senderId: string; // personality id or 'user'
  senderName: string;
  content: string;
  images?: string[];
  timestamp: string;
}

export interface Chat {
  id: string;
  type: 'individual' | 'group';
  name: string;
  personalityIds: string[];
  messages: Message[];
  lastMessageAt: string;
  createdAt: string;
}