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
  // Отслеживаем генерацию изображений по персонажам
  const [generatingImageFor, setGeneratingImageFor] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Индикаторы набора для нескольких личностей
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());

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

  // Плавный вывод текста как печать
  const typewriterAppend = async (messageId: string, fullText: string, speed = 18) => {
    for (let i = 1; i <= fullText.length; i++) {
      const chunk = fullText.slice(0, i);
      setChat(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          messages: prev.messages.map(m => (m.id === messageId ? { ...m, content: chunk } : m)),
        };
        storage.saveChat(updated);
        return updated;
      });
      await new Promise(r => setTimeout(r, speed));
    }
  };

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
          message: userMessage.content,
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

      // Установить индикаторы набора для всех, кто будет отвечать
      const responders: string[] = (narratorResponse.characterResponses || []).map((r: any) => r.characterId);
      setTypingIds(new Set(responders));

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
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // 2. Добавляем ответы персонажей с описаниями рассказчика + генерируем фото ПОСЛЕ каждого ответа
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
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        // 2b. Слова персонажа с постепенным набором (typewriter)
        const characterMessageId = `${Date.now()}-${charResponse.characterId}-${Math.random()}`;
        const characterMessage: Message = {
          id: characterMessageId,
          senderId: charResponse.characterId,
          senderName: charResponse.characterName,
          content: '',
          timestamp: new Date().toISOString(),
        };

        currentChat = {
          ...currentChat,
          messages: [...currentChat.messages, characterMessage],
          lastMessageAt: characterMessage.timestamp,
        };

        setChat(currentChat);
        storage.saveChat(currentChat);

        await typewriterAppend(characterMessageId, charResponse.response);

        // Снять индикатор набора для персонажа
        setTypingIds(prev => {
          const next = new Set(prev);
          next.delete(charResponse.characterId);
          return next;
        });

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
          await new Promise(resolve => setTimeout(resolve, 220));
        }

        // 2d. КРИТИЧНО: Генерируем изображение ДЛЯ КАЖДОГО персонажа после его ответа
        // Теперь imagePrompt ВСЕГДА присутствует для каждого персонажа
        if (charResponse.imagePrompt) {
          const apiCfg = getApiConfig();
          
          // Устанавливаем индикатор генерации для этого персонажа
          setGeneratingImageFor(prev => new Set([...prev, personality.id]));
          
          try {
            console.log(`🎨 Генерация изображения для ${personality.name}...`);
            
            const imageResponse = await fetch('/api/generate-image-service', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: charResponse.imagePrompt,
                negativePrompt: 'low quality, blurry, distorted, deformed, ugly, censored',
                width: 768,
                height: 768,
                apiConfig: apiCfg,
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              if (imageData.imageUrl) {
                console.log(`✅ Изображение для ${personality.name} сгенерировано:`, imageData.imageUrl.substring(0, 50) + '...');
                
                const imageMessage: Message = {
                  id: `${Date.now()}-${personality.id}-image-${Math.random()}`,
                  senderId: personality.id,
                  senderName: personality.name,
                  content: '', // Пустой контент, только изображение
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
                await new Promise(resolve => setTimeout(resolve, 150));
              } else {
                console.warn(`⚠️ Изображение для ${personality.name} не получено (пустой URL)`);
              }
            } else {
              const errorText = await imageResponse.text();
              console.error(`❌ Ошибка HTTP ${imageResponse.status} при генерации изображения для ${personality.name}:`, errorText);
            }
          } catch (error) {
            console.error(`❌ Ошибка генерации изображения для ${personality.name}:`, error);
          } finally {
            // Убираем индикатор генерации для этого персонажа
            setGeneratingImageFor(prev => {
              const next = new Set(prev);
              next.delete(personality.id);
              return next;
            });
          }
        }
      }

    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      toast.error('Не удалось отправить сообщение. Проверьте настройки API.');
    } finally {
      setIsLoading(false);
      setTypingIds(new Set());
      setGeneratingImageFor(new Set());
    }
  };

  const handleGenerateImage = async (personalityId: string) => {
    const personality = personalities.find(p => p.id === personalityId);
    if (!personality || generatingImageFor.has(personalityId) || !chat) return;

    const apiConfig = getApiConfig();

    setGeneratingImageFor(prev => new Set([...prev, personalityId]));
    try {
      const response = await fetch('/api/generate-image-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `detailed photo portrait of ${personality.name}, ${personality.personality}, ${personality.description || ''}, expressive face, professional photography, high quality, detailed, realistic`,
          negativePrompt: 'low quality, blurry, distorted, ugly, censored',
          width: 768,
          height: 768,
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
          content: '',
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
      setGeneratingImageFor(prev => {
        const next = new Set(prev);
        next.delete(personalityId);
        return next;
      });
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
                disabled={generatingImageFor.has(p.id)}
                className="hidden md:flex"
              >
                {generatingImageFor.has(p.id) ? (
                  <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 md:mr-2" />
                )}
                <span className="hidden lg:inline">Создать фото</span>
              </Button>
            ))}
            {personalities.length === 1 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleGenerateImage(personalities[0].id)}
                disabled={generatingImageFor.has(personalities[0].id)}
                className="md:hidden"
              >
                {generatingImageFor.has(personalities[0].id) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
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
                  {message.content && (
                    <p className="whitespace-pre-wrap break-words text-sm md:text-base">{message.content}</p>
                  )}
                  
                  {message.images && message.images.length > 0 && (
                    <div className={`${message.content ? 'mt-2 md:mt-3' : ''} space-y-2`}>
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

          {/* Индикаторы набора для нескольких личностей */}
          {typingIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 pl-10">
              {[...typingIds].map(id => {
                const p = personalities.find(pp => pp.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 border rounded-full px-3 py-1">
                    <Avatar className="h-5 w-5">
                      <img src={p.avatar} alt={p.name} className="object-cover" />
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{p.name} печатает…</span>
                    <span className="flex gap-0.5 items-center">
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.2s]"></span>
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce"></span>
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]"></span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Индикаторы генерации изображений для каждого персонажа */}
          {generatingImageFor.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 pl-10">
              {[...generatingImageFor].map(id => {
                const p = personalities.find(pp => pp.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 border rounded-full px-3 py-1">
                    <Avatar className="h-5 w-5">
                      <img src={p.avatar} alt={p.name} className="object-cover" />
                    </Avatar>
                    <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                    <span className="text-xs text-muted-foreground">{p.name} создаёт фото…</span>
                  </div>
                );
              })}
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