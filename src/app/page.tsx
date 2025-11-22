'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  MessageSquare, 
  Users, 
  Sparkles,
  Clock,
  Settings,
} from 'lucide-react';
import { storage } from '@/lib/storage';
import { Personality, Chat } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);

  useEffect(() => {
    setPersonalities(storage.getPersonalities());
    const chats = storage.getChats().sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ).slice(0, 6);
    setRecentChats(chats);
  }, []);

  const handleStartChat = (personality: Personality) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      type: 'individual',
      name: personality.name,
      personalityIds: [personality.id],
      messages: [],
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    storage.saveChat(newChat);
    router.push(`/chat/${newChat.id}`);
  };

  const getChatPersonalities = (chat: Chat) => {
    return chat.personalityIds
      .map(id => storage.getPersonality(id))
      .filter(Boolean) as Personality[];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Settings Button - Mobile Optimized */}
      <div className="absolute top-3 right-3 md:top-6 md:right-6 z-10">
        <Button
          onClick={() => router.push('/settings')}
          variant="outline"
          size="icon"
          className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
        >
          <Settings className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </div>

      {/* Hero Section - Mobile Optimized */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-blue-600/10" />
        <div className="relative max-w-7xl mx-auto px-3 py-12 md:px-4 md:py-16 lg:py-24 text-center">
          <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              ИИ Личности
            </h1>
          </div>
          <p className="text-base md:text-xl lg:text-2xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            Создавайте уникальных ИИ-компаньонов с персональными характерами и аватарами. Общайтесь, делитесь изображениями и стройте значимые связи.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-center px-4">
            <Button
              onClick={() => router.push('/create-personality')}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-base md:text-lg px-6 md:px-8 h-12 md:h-14"
            >
              <Plus className="mr-2 h-5 w-5" />
              Создать личность
            </Button>
            <Button
              onClick={() => router.push('/group-chat')}
              size="lg"
              variant="outline"
              className="text-base md:text-lg px-6 md:px-8 h-12 md:h-14"
            >
              <Users className="mr-2 h-5 w-5" />
              Групповой чат
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 pb-12 md:pb-16 space-y-8 md:space-y-12">
        {/* Recent Chats - Mobile Optimized */}
        {recentChats.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                <h2 className="text-xl md:text-2xl font-bold">Недавние чаты</h2>
              </div>
            </div>
            <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentChats.map((chat) => {
                const chatPersonalities = getChatPersonalities(chat);
                const lastMessage = chat.messages[chat.messages.length - 1];
                
                return (
                  <Card
                    key={chat.id}
                    className="p-3 md:p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/chat/${chat.id}`)}
                  >
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      {chatPersonalities.slice(0, 3).map((p) => (
                        <Avatar key={p.id} className="h-8 w-8 md:h-10 md:w-10 border-2 border-white dark:border-gray-800">
                          <img src={p.avatar} alt={p.name} className="object-cover" />
                        </Avatar>
                      ))}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base truncate">{chat.name}</h3>
                        {chat.type === 'group' && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            Группа
                          </Badge>
                        )}
                      </div>
                    </div>
                    {lastMessage && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                        <span className="font-medium">{lastMessage.senderName}:</span>{' '}
                        {lastMessage.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 md:mt-2">
                      {new Date(chat.lastMessageAt).toLocaleString('ru-RU')}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Personalities Gallery - Mobile Optimized */}
        <div>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              <h2 className="text-xl md:text-2xl font-bold">Ваши личности</h2>
            </div>
            <Button
              onClick={() => router.push('/personalities')}
              variant="ghost"
              className="text-sm md:text-base"
            >
              Посмотреть все
            </Button>
          </div>

          {personalities.length === 0 ? (
            <Card className="p-8 md:p-12 text-center">
              <Sparkles className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">Пока нет личностей</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Создайте свою первую ИИ-личность, чтобы начать
              </p>
              <Button
                onClick={() => router.push('/create-personality')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Создать первую личность
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
              {personalities.slice(0, 4).map((personality) => (
                <Card key={personality.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="aspect-square relative">
                    <img
                      src={personality.avatar}
                      alt={personality.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                      <h3 className="text-base md:text-xl font-bold text-white mb-1">
                        {personality.name}
                      </h3>
                      <p className="text-white/90 text-xs md:text-sm line-clamp-2">
                        {personality.personality}
                      </p>
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        onClick={() => handleStartChat(personality)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm md:text-base"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Начать чат
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Mobile Optimized */}
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card 
            className="p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
            onClick={() => router.push('/create-personality')}
          >
            <Plus className="h-6 w-6 md:h-8 md:w-8 mb-2 md:mb-3 text-purple-600" />
            <h3 className="font-semibold text-sm md:text-base mb-1">Создать личность</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Спроектируйте нового ИИ-компаньона с уникальными чертами
            </p>
          </Card>

          <Card 
            className="p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20"
            onClick={() => router.push('/personalities')}
          >
            <Users className="h-6 w-6 md:h-8 md:w-8 mb-2 md:mb-3 text-pink-600" />
            <h3 className="font-semibold text-sm md:text-base mb-1">Все личности</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Управляйте вашими ИИ-личностями
            </p>
          </Card>

          <Card 
            className="p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
            onClick={() => router.push('/group-chat')}
          >
            <MessageSquare className="h-6 w-6 md:h-8 md:w-8 mb-2 md:mb-3 text-blue-600" />
            <h3 className="font-semibold text-sm md:text-base mb-1">Групповой чат</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Общайтесь сразу с несколькими ИИ-личностями
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}