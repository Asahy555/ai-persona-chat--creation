'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  MessageSquare, 
  Trash2,
  Users,
} from 'lucide-react';
import { storage } from '@/lib/storage';
import { Personality, Chat } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PersonalitiesPage() {
  const router = useRouter();
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setPersonalities(storage.getPersonalities());
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

  const handleDelete = (id: string) => {
    storage.deletePersonality(id);
    setPersonalities(storage.getPersonalities());
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 p-3 md:p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-start gap-2 md:gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              size="sm"
              className="shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Назад</span>
            </Button>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ИИ Личности
              </h1>
              <p className="text-xs md:text-base text-muted-foreground mt-1">
                Управляйте вашими ИИ-компаньонами
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push('/create-personality')}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm md:text-base"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать новую
          </Button>
        </div>

        {personalities.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <div className="max-w-md mx-auto">
              <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">Пока нет личностей</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Создайте свою первую ИИ-личность, чтобы начать общение
              </p>
              <Button
                onClick={() => router.push('/create-personality')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Создать личность
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {personalities.map((personality) => (
              <Card key={personality.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative">
                  <img
                    src={personality.avatar}
                    alt={personality.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-4">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                      {personality.name}
                    </h3>
                    <p className="text-white/90 text-xs md:text-sm line-clamp-2">
                      {personality.personality}
                    </p>
                  </div>
                </div>

                <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                  {personality.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {personality.traits.slice(0, 4).map((trait) => (
                        <Badge key={trait} variant="secondary" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                      {personality.traits.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{personality.traits.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {personality.description && (
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-3">
                      {personality.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleStartChat(personality)}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm md:text-base"
                      size="sm"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Чат
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteId(personality.id)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Alert Dialog - Mobile Optimized */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base md:text-lg">Удалить личность?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-sm">
              Это навсегда удалит эту ИИ-личность. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="text-sm md:text-base m-0">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleDelete(deleteId)}
              className="text-sm md:text-base m-0"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}