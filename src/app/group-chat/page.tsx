'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { ArrowLeft, Users } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Personality, Chat } from '@/lib/types';

export default function GroupChatPage() {
  const router = useRouter();
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    setPersonalities(storage.getPersonalities());
  }, []);

  const togglePersonality = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = () => {
    if (selectedIds.length < 2 || !groupName.trim()) return;

    const newChat: Chat = {
      id: Date.now().toString(),
      type: 'group',
      name: groupName.trim(),
      personalityIds: selectedIds,
      messages: [],
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    storage.saveChat(newChat);
    router.push(`/chat/${newChat.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 p-3 md:p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-4 md:mb-6"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад на главную
        </Button>

        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Создать групповой чат
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Выберите несколько ИИ-личностей для общения одновременно
          </p>
        </div>

        <Card className="p-4 md:p-6 mb-4 md:mb-6">
          <Label htmlFor="groupName" className="text-sm md:text-base">Название группы</Label>
          <Input
            id="groupName"
            placeholder="например: Весёлая компания"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mt-2 text-sm md:text-base"
          />
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
            Выберите личности (минимум 2)
          </h2>

          {personalities.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                Нет доступных личностей. Сначала создайте их!
              </p>
              <Button
                onClick={() => router.push('/create-personality')}
                variant="outline"
                size="sm"
              >
                Создать личность
              </Button>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {personalities.map((personality) => (
                <div
                  key={personality.id}
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => togglePersonality(personality.id)}
                >
                  <Checkbox
                    checked={selectedIds.includes(personality.id)}
                    onCheckedChange={() => togglePersonality(personality.id)}
                    className="shrink-0"
                  />
                  <Avatar className="h-10 w-10 md:h-12 md:w-12 shrink-0">
                    <img src={personality.avatar} alt={personality.name} className="object-cover" />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base">{personality.name}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
                      {personality.personality}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="mt-4 md:mt-6 flex justify-end">
          <Button
            onClick={handleCreateGroup}
            disabled={selectedIds.length < 2 || !groupName.trim()}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm md:text-base"
          >
            <Users className="mr-2 h-4 w-4" />
            Создать групповой чат
          </Button>
        </div>
      </div>
    </div>
  );
}