'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Chat, Message, Personality } from '@/lib/types';
import { toast } from 'sonner';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API keys from localStorage
  const getApiConfig = () => {
    try {
      const saved = localStorage.getItem('ai_api_keys');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  useEffect(() => {
    const loadedChat = storage.getChat(chatId);
    if (!loadedChat) {
      router.push('/');
      return;
    }
    
    setChat(loadedChat);
    const loadedPersonalities = loadedChat.personalityIds
      .map(id => storage.getPersonality(id))
      .filter(Boolean) as Personality[];
    setPersonalities(loadedPersonalities);
  }, [chatId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !chat || isLoading || personalities.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      senderId: 'user',
      senderName: 'Вы',
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };

    let currentChat = {
      ...chat,
      messages: [...chat.messages, userMessage],
      lastMessageAt: userMessage.timestamp,
    };

    setChat(currentChat);
    storage.saveChat(currentChat);
    setMessageInput('');
    setIsLoading(true);

    const apiConfig = getApiConfig();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageInput.trim(),
          personalities,
          conversationHistory: currentChat.messages,
          apiConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Не удалось получить ответ');
      }

      const data = await response.json();
      const narratorResponse = data.narratorResponse;

      // 1. Добавляем начальное описание рассказчика (если есть)
      if (narratorResponse.narratorVoice) {
        const narratorMessage: Message = {
          id: `${Date.now()}-narrator-opening`,
          senderId: 'narrator',
          senderName: '',
          content: narratorResponse.narratorVoice,
          timestamp: new Date().toISOString(),
        };

        currentChat = {
          ...currentChat,
          messages: [...currentChat.messages, narratorMessage],
          lastMessageAt: narratorMessage.timestamp,
        };

        setChat(currentChat);
        storage.saveChat(currentChat);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 2. Добавляем ответы персонажей с описаниями рассказчика
      for (const charResponse of narratorResponse.characterResponses) {
        const personality = personalities.find(p => p.id === charResponse.characterId);
        if (!personality) continue;

        // 2a. Рассказчик описывает действия ПЕРЕД словами персонажа
        if (charResponse.narratorBefore) {
          const narratorBeforeMessage: Message = {
            id: `${Date.now()}-narrator-before-${charResponse.characterId}-${Math.random()}`,
            senderId: 'narrator',
            senderName: '',
            content: charResponse.narratorBefore,
            timestamp: new Date().toISOString(),
          };

          currentChat = {
            ...currentChat,
            messages: [...currentChat.messages, narratorBeforeMessage],
            lastMessageAt: narratorBeforeMessage.timestamp,
          };

          setChat(currentChat);
          storage.saveChat(currentChat);
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 2b. Слова персонажа
        const characterMessage: Message = {
          id: `${Date.now()}-${charResponse.characterId}-${Math.random()}`,
          senderId: charResponse.characterId,
          senderName: charResponse.characterName,
          content: charResponse.response,
          timestamp: new Date().toISOString(),
        };

        currentChat = {
          ...currentChat,
          messages: [...currentChat.messages, characterMessage],
          lastMessageAt: characterMessage.timestamp,
        };

        setChat(currentChat);
        storage.saveChat(currentChat);
        await new Promise(resolve => setTimeout(resolve, 400));

        // 2c. Рассказчик описывает действия ПОСЛЕ слов персонажа
        if (charResponse.narratorAfter) {
          const narratorAfterMessage: Message = {
            id: `${Date.now()}-narrator-after-${charResponse.characterId}-${Math.random()}`,
            senderId: 'narrator',
            senderName: '',
            content: charResponse.narratorAfter,
            timestamp: new Date().toISOString(),
          };

          currentChat = {
            ...currentChat,
            messages: [...currentChat.messages, narratorAfterMessage],
            lastMessageAt: narratorAfterMessage.timestamp,
          };

          setChat(currentChat);
          storage.saveChat(currentChat);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // 3. Генерируем изображение если рассказчик решил
      if (narratorResponse.shouldGenerateImage && narratorResponse.imagePrompt && narratorResponse.imageCharacterId) {
        const personality = personalities.find(p => p.id === narratorResponse.imageCharacterId);
        if (personality) {
          setIsGeneratingImage(true);
          try {
            const imageResponse = await fetch('/api/generate-image-service', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: narratorResponse.imagePrompt,
                negativePrompt: 'low quality, blurry, distorted, deformed',
                width: 512,
                height: 512,
                apiConfig,
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              if (imageData.imageUrl) {
                const imageMessage: Message = {
                  id: `${Date.now()}-${personality.id}-image`,
                  senderId: personality.id,
                  senderName: personality.name,
                  content: '*отправляет фото*',
                  images: [imageData.imageUrl],
                  timestamp: new Date().toISOString(),
                };

                currentChat = {
                  ...currentChat,
                  messages: [...currentChat.messages, imageMessage],
                  lastMessageAt: imageMessage.timestamp,
                };

                setChat(currentChat);
                storage.saveChat(currentChat);
              }
            }
          } catch (error) {
            console.error('Ошибка генерации изображения:', error);
            toast.error('Не удалось сгенерировать изображение');
          } finally {
            setIsGeneratingImage(false);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      toast.error('Не удалось отправить сообщение. Проверьте настройки API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async (personalityId: string) => {
    const personality = personalities.find(p => p.id === personalityId);
    if (!personality || isGeneratingImage || !chat) return;

    const apiConfig = getApiConfig();

    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/generate-image-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${personality.personality}, ${personality.description}, полный рост или портрет, высокое качество`,
          negativePrompt: 'low quality, blurry, distorted',
          width: 512,
          height: 512,
          apiConfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации изображения');
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        const imageMessage: Message = {
          id: `${Date.now()}-${personality.id}-image`,
          senderId: personality.id,
          senderName: personality.name,
          content: '*отправляет вам фото*',
          images: [data.imageUrl],
          timestamp: new Date().toISOString(),
        };

        const updatedChat = {
          ...chat,
          messages: [...chat.messages, imageMessage],
          lastMessageAt: imageMessage.timestamp,
        };

        setChat(updatedChat);
        storage.saveChat(updatedChat);
        
        toast.success('Изображение сгенерировано');
      } else {
        throw new Error('URL изображения не получен');
      }
    } catch (error) {
      console.error('Ошибка генерации изображения:', error);
      toast.error('Не удалось сгенерировать изображение. Проверьте настройки API.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (!chat) return null;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header - Mobile Optimized */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-3 md:p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 overflow-x-auto">
            {personalities.map((p) => (
              <div key={p.id} className="flex items-center gap-2 shrink-0">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <img src={p.avatar} alt={p.name} className="object-cover" />
                </Avatar>
                <div className="hidden sm:block">
                  <h2 className="font-semibold text-sm md:text-base">{p.name}</h2>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 shrink-0">
            {personalities.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                size="sm"
                onClick={() => handleGenerateImage(p.id)}
                disabled={isGeneratingImage}
                className="hidden md:flex"
              >
                <Sparkles className="h-4 w-4 md:mr-2" />
                <span className="hidden lg:inline">Создать фото</span>
              </Button>
            ))}
            {personalities.length === 1 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleGenerateImage(personalities[0].id)}
                disabled={isGeneratingImage}
                className="md:hidden"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages - Mobile Optimized */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">
          {chat.messages.map((message) => {
            const isUser = message.senderId === 'user';
            const isNarrator = message.senderId === 'narrator';
            const personality = personalities.find(p => p.id === message.senderId);

            // Невидимый голос рассказчика (без имени, курсивом)
            if (isNarrator) {
              return (
                <div key={message.id} className="flex justify-center px-4">
                  <p className="text-xs md:text-sm italic text-gray-600 dark:text-gray-400 text-center max-w-[85%] leading-relaxed">
                    {message.content}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`flex gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {!isUser && personality && (
                  <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
                    <img src={personality.avatar} alt={personality.name} className="object-cover" />
                  </Avatar>
                )}

                <Card className={`p-3 md:p-4 max-w-[85%] md:max-w-[70%] ${
                  isUser 
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                    : 'bg-white dark:bg-gray-800'
                }`}>
                  {!isUser && (
                    <p className="text-xs font-semibold mb-1 text-purple-600 dark:text-purple-400">
                      {message.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm md:text-base">{message.content}</p>
                  
                  {message.images && message.images.length > 0 && (
                    <div className="mt-2 md:mt-3 space-y-2">
                      {message.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Сгенерировано"
                          className="rounded-lg w-full max-w-sm"
                          onError={(e) => {
                            console.error('Ошибка загрузки изображения:', img);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <p className="text-xs opacity-60 mt-1 md:mt-2">
                    {new Date(message.timestamp).toLocaleTimeString('ru-RU')}
                  </p>
                </Card>
              </div>
            );
          })}

          {(isLoading || isGeneratingImage) && (
            <div className="flex gap-2 md:gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <Card className="p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {isGeneratingImage ? 'Генерация изображения...' : 'Персонажи отвечают...'}
                  </p>
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Mobile Optimized */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-3 md:p-4 safe-area-bottom">
        <div className="max-w-4xl mx-auto flex gap-2 md:gap-3">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Введите сообщение..."
            className="flex-1 text-sm md:text-base"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shrink-0"
            size="icon"
          >
            <Send className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}