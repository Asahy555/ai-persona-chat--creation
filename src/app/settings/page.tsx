'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Settings as SettingsIcon,
  CheckCircle2,
  Sparkles,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  ExternalLink,
  Info,
  Globe,
  Shield
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  // Handle external links in iframe context
  const handleExternalLink = (url: string) => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      window.parent.postMessage({ type: "OPEN_EXTERNAL_URL", data: { url } }, "*");
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SettingsIcon className="h-5 w-5 md:h-6 md:w-6 text-purple-600 shrink-0" />
            <h1 className="text-lg md:text-2xl font-bold truncate">
              О приложении
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        
        {/* Main Info Card - g4f Powered */}
        <Card className="p-6 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Sparkles className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Работает на g4f
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                Бесплатный ИИ без ограничений и цензуры
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Полностью бесплатно</h3>
                  <p className="text-sm text-muted-foreground">Без API ключей и регистрации</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Без цензуры</h3>
                  <p className="text-sm text-muted-foreground">Свободное общение без ограничений</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Генерация текста</h3>
                  <p className="text-sm text-muted-foreground">Модель GPT-4.1 и другие</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Генерация изображений</h3>
                  <p className="text-sm text-muted-foreground">Flux и другие модели</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Что такое g4f?
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    g4f (gpt4free) - это бесплатный сервис, который предоставляет доступ к различным AI моделям 
                    без необходимости платить или регистрироваться. Он агрегирует множество бесплатных провайдеров 
                    для генерации текста и изображений.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Умные диалоги</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Главная модель-рассказчик координирует всё повествование, описывает сцены и управляет ответами персонажей
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-full">
                <ImageIcon className="h-6 w-6 text-pink-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Генерация фото</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Персонажи могут автоматически генерировать изображения на основе контекста разговора
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Быстрая работа</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Оптимизированная архитектура для быстрого получения ответов от AI моделей
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Приватность</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Все данные хранятся локально в вашем браузере, никакая информация не передаётся на сторонние серверы
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tech Stack */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-600" />
            Технологический стек
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">AI Модели</span>
              <Badge variant="secondary">g4f (GPT-4.1, Flux)</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Фронтенд</span>
              <Badge variant="secondary">Next.js 15 + TypeScript</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">UI компоненты</span>
              <Badge variant="secondary">Shadcn/UI + Tailwind CSS</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Хранилище</span>
              <Badge variant="secondary">LocalStorage (браузер)</Badge>
            </div>
          </div>
        </Card>

        {/* Resources */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">📚 Полезные ссылки</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleExternalLink('https://g4f.dev/docs')}
            >
              <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
              <span className="flex-1 text-left">Документация g4f</span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleExternalLink('https://github.com/xtekky/gpt4free')}
            >
              <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
              <span className="flex-1 text-left">GitHub репозиторий gpt4free</span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleExternalLink('https://host.g4f.dev/v1/models')}
            >
              <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
              <span className="flex-1 text-left">Список доступных моделей</span>
            </Button>
          </div>
        </Card>

        {/* How it Works */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <h2 className="text-xl font-semibold mb-4">🎭 Как это работает?</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center font-semibold text-purple-600">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Создаёте AI личности</h3>
                <p className="text-sm text-muted-foreground">
                  Задаёте имя, характер и внешность (генерируется автоматически)
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center font-semibold text-purple-600">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Начинаете диалог</h3>
                <p className="text-sm text-muted-foreground">
                  Пишете сообщение персонажу или группе персонажей
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center font-semibold text-purple-600">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Рассказчик координирует</h3>
                <p className="text-sm text-muted-foreground">
                  Главная AI модель описывает сцену, настроение и формирует ответы персонажей
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center font-semibold text-purple-600">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-1">Генерация контента</h3>
                <p className="text-sm text-muted-foreground">
                  При необходимости автоматически создаются изображения для иллюстрации происходящего
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => router.push('/')}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Вернуться на главную
          </Button>
        </div>
      </div>
    </div>
  );
}