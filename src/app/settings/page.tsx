'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Smartphone, 
  Laptop, 
  Cloud,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  Save,
  Eye,
  EyeOff,
  Key,
  TestTube2
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeys {
  gigachat_auth_key?: string;
  openrouter_api_key?: string;
  huggingface_token?: string;
  ollama_host?: string;
  ollama_model?: string;
  fooocus_url?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState<'mobile' | 'desktop'>('mobile');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});

  // Load saved API keys
  useEffect(() => {
    const saved = localStorage.getItem('ai_api_keys');
    if (saved) {
      try {
        setApiKeys(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Handle external links in iframe context
  const handleExternalLink = (url: string) => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      window.parent.postMessage({ type: "OPEN_EXTERNAL_URL", data: { url } }, "*");
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleSaveKeys = () => {
    try {
      localStorage.setItem('ai_api_keys', JSON.stringify(apiKeys));
      toast.success('API ключи сохранены успешно!');
    } catch (e) {
      console.error('Failed to save API keys:', e);
      toast.error('Не удалось сохранить ключи');
    }
  };

  const handleClearKeys = () => {
    setApiKeys({});
    localStorage.removeItem('ai_api_keys');
    toast.success('Все ключи удалены');
  };

  const toggleShowSecret = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const updateKey = (field: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [field]: value }));
  };

  const testApiConnection = async (apiType: string) => {
    setTesting(prev => ({ ...prev, [apiType]: true }));
    
    try {
      const testMessage = { 
        role: 'user', 
        content: 'Привет! Это тестовое сообщение.' 
      };
      
      const config = {
        gigachat_auth_key: apiKeys.gigachat_auth_key,
        openrouter_api_key: apiKeys.openrouter_api_key,
        huggingface_token: apiKeys.huggingface_token,
        ollama_host: apiKeys.ollama_host,
        ollama_model: apiKeys.ollama_model
      };

      const response = await fetch('/api/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiType, config })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ ${apiType.toUpperCase()} работает! ${data.message || ''}`);
      } else {
        toast.error(`❌ ${apiType.toUpperCase()}: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Ошибка тестирования: ${error.message}`);
    } finally {
      setTesting(prev => ({ ...prev, [apiType]: false }));
    }
  };

  const mobileOptions = [
    {
      title: 'GigaChat (Сбербанк)',
      description: 'Российский ИИ, работает без VPN, бесплатный лимит',
      status: 'recommended',
      features: ['Работает в РФ', 'Бесплатно до 900k токенов/год', 'Поддержка 18+'],
      setupLink: 'https://developers.sber.ru/portal/products/gigachat',
      instructions: [
        '1. Зарегистрируйтесь на developers.sber.ru',
        '2. Создайте приложение и получите ключи',
        '3. Добавьте ключи в настройки приложения'
      ]
    },
    {
      title: 'OpenRouter API',
      description: 'Доступ к множеству моделей, включая uncensored',
      status: 'alternative',
      features: ['Много моделей', 'Uncensored варианты', 'Платные и бесплатные'],
      setupLink: 'https://openrouter.ai',
      instructions: [
        '1. Зарегистрируйтесь на openrouter.ai',
        '2. Получите API ключ',
        '3. Пополните баланс (от $5)',
        '4. Добавьте ключ в настройки'
      ]
    },
    {
      title: 'Hugging Face API',
      description: 'Бесплатные модели через облако',
      status: 'free',
      features: ['Полностью бесплатно', 'Много моделей', 'Медленнее'],
      setupLink: 'https://huggingface.co/settings/tokens',
      instructions: [
        '1. Создайте аккаунт на huggingface.co',
        '2. Перейдите в Settings → Access Tokens',
        '3. Создайте новый токен',
        '4. Добавьте токен в настройки'
      ]
    }
  ];

  const desktopOptions = [
    {
      title: 'Ollama (локально)',
      description: 'Запуск моделей на вашем ПК, полностью бесплатно',
      status: 'recommended',
      features: ['Без интернета', 'Без цензуры', 'Приватно'],
      models: [
        { name: 'llama2-uncensored', size: '7B', ram: '8GB' },
        { name: 'dolphin-mistral', size: '7B', ram: '8GB' },
        { name: 'wizard-vicuna-uncensored', size: '13B', ram: '16GB' },
        { name: 'dolphin-mixtral', size: '8x7B', ram: '32GB' }
      ],
      downloadLink: 'https://ollama.com',
      instructions: [
        '1. Скачайте Ollama с ollama.com',
        '2. Установите и запустите: ollama serve',
        '3. Загрузите модель: ollama pull llama2-uncensored',
        '4. Проверьте: ollama list'
      ]
    },
    {
      title: 'Fooocus (генерация изображений)',
      description: 'Локальная генерация изображений без цензуры',
      status: 'recommended',
      features: ['Без цензуры', 'Высокое качество', 'Бесплатно'],
      requirements: 'NVIDIA GPU с 6GB+ VRAM или CPU (медленно)',
      downloadLink: 'https://github.com/lllyasviel/Fooocus',
      instructions: [
        '1. git clone https://github.com/lllyasviel/Fooocus.git',
        '2. cd Fooocus',
        '3. python launch.py',
        '4. Откроется на localhost:7860'
      ]
    },
    {
      title: 'LM Studio',
      description: 'Альтернатива Ollama с GUI',
      status: 'alternative',
      features: ['Графический интерфейс', 'Легче для новичков', 'Uncensored модели'],
      downloadLink: 'https://lmstudio.ai',
      instructions: [
        '1. Скачайте с lmstudio.ai',
        '2. Установите и запустите',
        '3. Найдите "uncensored" модели в поиске',
        '4. Скачайте и запустите сервер'
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recommended': return 'bg-green-500';
      case 'alternative': return 'bg-blue-500';
      case 'free': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recommended': return 'Рекомендуем';
      case 'alternative': return 'Альтернатива';
      case 'free': return 'Бесплатно';
      default: return '';
    }
  };

  const options = selectedPlatform === 'mobile' ? mobileOptions : desktopOptions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header - Mobile Optimized */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3 md:gap-4">
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
              Настройки API
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        {/* API Keys Configuration */}
        <Card className="p-4 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3 md:gap-4 mb-4">
            <Key className="h-5 w-5 md:h-6 md:w-6 text-green-600 shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-semibold mb-2">🔑 Настройка API ключей</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Введите полученные API ключи для активации функций генерации. Ключи сохраняются локально в вашем браузере.
              </p>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            {/* Mobile API Keys */}
            <div className="space-y-4">
              <h3 className="text-sm md:text-base font-semibold">☁️ Облачные сервисы</h3>
              
              {/* GigaChat */}
              <div className="space-y-3 p-3 md:p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-medium">GigaChat (Сбербанк)</h4>
                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                    ⚠️ Недоступен вне РФ
                  </Badge>
                </div>
                <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                  <p className="text-red-800 dark:text-red-200">
                    <strong>⚠️ Внимание:</strong> GigaChat API работает только с российских IP адресов. 
                    Этот сервер находится не в России, поэтому GigaChat недоступен.
                    <br/><br/>
                    <strong>Рекомендуем использовать:</strong> OpenRouter или Hugging Face вместо GigaChat.
                  </p>
                </div>
                <div className="space-y-3 opacity-50">
                  <div>
                    <Label htmlFor="gigachat_auth_key" className="text-xs md:text-sm">Authorization Key</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Скопируйте готовый "Ключ авторизации" из личного кабинета GigaChat
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="gigachat_auth_key"
                        type={showSecrets['gigachat_auth_key'] ? 'text' : 'password'}
                        placeholder="Вставьте Authorization Key из GigaChat"
                        value={apiKeys.gigachat_auth_key || ''}
                        onChange={(e) => updateKey('gigachat_auth_key', e.target.value)}
                        className="text-xs md:text-sm font-mono"
                        disabled
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleShowSecret('gigachat_auth_key')}
                        className="shrink-0"
                        disabled
                      >
                        {showSecrets['gigachat_auth_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* OpenRouter */}
              <div className="space-y-3 p-3 md:p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-medium">OpenRouter API</h4>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                    ✅ Рекомендуем
                  </Badge>
                </div>
                <div>
                  <Label htmlFor="openrouter_api_key" className="text-xs md:text-sm">API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="openrouter_api_key"
                      type={showSecrets['openrouter_api_key'] ? 'text' : 'password'}
                      placeholder="sk-or-v1-..."
                      value={apiKeys.openrouter_api_key || ''}
                      onChange={(e) => updateKey('openrouter_api_key', e.target.value)}
                      className="text-xs md:text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('openrouter_api_key')}
                      className="shrink-0"
                    >
                      {showSecrets['openrouter_api_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => testApiConnection('openrouter')}
                      disabled={!apiKeys.openrouter_api_key || testing['openrouter']}
                      title="Проверить подключение"
                      className="shrink-0"
                    >
                      <TestTube2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Hugging Face */}
              <div className="space-y-3 p-3 md:p-4 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-medium">Hugging Face</h4>
                  <Badge variant="secondary" className="text-xs">Бесплатно</Badge>
                </div>
                <div>
                  <Label htmlFor="huggingface_token" className="text-xs md:text-sm">Access Token</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="huggingface_token"
                      type={showSecrets['huggingface_token'] ? 'text' : 'password'}
                      placeholder="hf_..."
                      value={apiKeys.huggingface_token || ''}
                      onChange={(e) => updateKey('huggingface_token', e.target.value)}
                      className="text-xs md:text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('huggingface_token')}
                      className="shrink-0"
                    >
                      {showSecrets['huggingface_token'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => testApiConnection('huggingface')}
                      disabled={!apiKeys.huggingface_token || testing['huggingface']}
                      title="Проверить подключение"
                      className="shrink-0"
                    >
                      <TestTube2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop/Local Settings */}
            <div className="space-y-4">
              <h3 className="text-sm md:text-base font-semibold">💻 Локальные сервисы</h3>
              
              {/* Ollama */}
              <div className="space-y-3 p-3 md:p-4 bg-white dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium">Ollama (локально)</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="ollama_host" className="text-xs md:text-sm">Host URL</Label>
                    <Input
                      id="ollama_host"
                      type="text"
                      placeholder="http://localhost:11434"
                      value={apiKeys.ollama_host || ''}
                      onChange={(e) => updateKey('ollama_host', e.target.value)}
                      className="text-xs md:text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ollama_model" className="text-xs md:text-sm">Модель</Label>
                    <Input
                      id="ollama_model"
                      type="text"
                      placeholder="llama2-uncensored"
                      value={apiKeys.ollama_model || ''}
                      onChange={(e) => updateKey('ollama_model', e.target.value)}
                      className="text-xs md:text-sm mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Fooocus */}
              <div className="space-y-3 p-3 md:p-4 bg-white dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium">Fooocus (генерация изображений)</h4>
                <div>
                  <Label htmlFor="fooocus_url" className="text-xs md:text-sm">API URL</Label>
                  <Input
                    id="fooocus_url"
                    type="text"
                    placeholder="http://localhost:7860"
                    value={apiKeys.fooocus_url || ''}
                    onChange={(e) => updateKey('fooocus_url', e.target.value)}
                    className="text-xs md:text-sm mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-2">
              <Button
                onClick={handleSaveKeys}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Сохранить ключи
              </Button>
              <Button
                onClick={handleClearKeys}
                variant="outline"
                className="flex-1"
              >
                Очистить все
              </Button>
            </div>
          </div>
        </Card>

        {/* Platform Selector - Mobile Optimized */}
        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
            📖 Инструкции по установке
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mb-4">
            Выберите вашу платформу для просмотра детальных инструкций
          </p>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Button
              variant={selectedPlatform === 'mobile' ? 'default' : 'outline'}
              className="h-auto py-4 md:py-6 flex-col gap-2"
              onClick={() => setSelectedPlatform('mobile')}
            >
              <Smartphone className="h-6 w-6 md:h-8 md:w-8" />
              <span className="text-sm md:text-base font-medium">Телефон/Планшет</span>
            </Button>
            <Button
              variant={selectedPlatform === 'desktop' ? 'default' : 'outline'}
              className="h-auto py-4 md:py-6 flex-col gap-2"
              onClick={() => setSelectedPlatform('desktop')}
            >
              <Laptop className="h-6 w-6 md:h-8 md:w-8" />
              <span className="text-sm md:text-base font-medium">Компьютер</span>
            </Button>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 md:p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex gap-3 md:gap-4">
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-purple-600 shrink-0 mt-1" />
            <div className="space-y-2 min-w-0">
              <h3 className="font-semibold text-sm md:text-base">
                {selectedPlatform === 'mobile' ? '📱 Для мобильных устройств' : '💻 Для компьютера'}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {selectedPlatform === 'mobile' 
                  ? 'На мобильных устройствах используются облачные API сервисы. Они работают через интернет и не требуют установки.' 
                  : 'На компьютере можно запустить модели локально - это полностью бесплатно, работает без интернета и без цензуры.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Options - Mobile Optimized */}
        <div className="space-y-4 md:space-y-6">
          {options.map((option, index) => (
            <Card key={index} className="p-4 md:p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-3 md:space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base md:text-lg font-semibold">
                        {option.title}
                      </h3>
                      <Badge className={`${getStatusColor(option.status)} text-white text-xs`}>
                        {getStatusText(option.status)}
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {option.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>

                {/* Models (for desktop) */}
                {'models' in option && (
                  <div className="space-y-2">
                    <p className="text-xs md:text-sm font-medium">Рекомендуемые модели:</p>
                    <div className="grid gap-2">
                      {option.models.map((model, i) => (
                        <div key={i} className="flex items-center justify-between p-2 md:p-3 bg-muted rounded-lg text-xs md:text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Download className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                            <span className="font-mono truncate">{model.name}</span>
                          </div>
                          <div className="flex gap-2 md:gap-3 text-xs text-muted-foreground shrink-0">
                            <span>{model.size}</span>
                            <span>RAM: {model.ram}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements (for some options) */}
                {'requirements' in option && (
                  <div className="p-2 md:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs md:text-sm text-amber-900 dark:text-amber-100">
                      <strong>Требования:</strong> {option.requirements}
                    </p>
                  </div>
                )}

                {/* Instructions */}
                <div className="space-y-2">
                  <p className="text-xs md:text-sm font-medium">Инструкция:</p>
                  <div className="space-y-1 md:space-y-1.5">
                    {option.instructions.map((step, i) => (
                      <p key={i} className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-2">
                        {step}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  {'setupLink' in option && (
                    <Button
                      className="flex-1"
                      onClick={() => handleExternalLink(option.setupLink)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Регистрация
                    </Button>
                  )}
                  {'downloadLink' in option && (
                    <Button
                      className="flex-1"
                      onClick={() => handleExternalLink(option.downloadLink)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Additional Resources - Mobile Optimized */}
        <Card className="p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
            📚 Полезные ссылки
          </h2>
          <div className="space-y-2 md:space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start text-xs md:text-sm h-auto py-2 md:py-3"
              onClick={() => handleExternalLink('https://ollama.com/search?q=uncensored')}
            >
              <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              Все Uncensored модели для Ollama
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-xs md:text-sm h-auto py-2 md:py-3"
              onClick={() => handleExternalLink('https://openrouter.ai/models')}
            >
              <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              Список моделей OpenRouter
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-xs md:text-sm h-auto py-2 md:py-3"
              onClick={() => handleExternalLink('https://huggingface.co/models?pipeline_tag=text-generation&sort=downloads')}
            >
              <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              Текстовые модели Hugging Face
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-xs md:text-sm h-auto py-2 md:py-3"
              onClick={() => handleExternalLink('https://github.com/AUTOMATIC1111/stable-diffusion-webui')}
            >
              <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              AUTOMATIC1111 (альтернатива Fooocus)
            </Button>
          </div>
        </Card>

        {/* Help Section */}
        <Card className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <h2 className="text-base md:text-lg font-semibold mb-2 md:mb-3">
            💡 Нужна помощь?
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 leading-relaxed">
            Если что-то не работает или есть вопросы по настройке - пишите в поддержку или читайте подробную документацию в файлах README_RU.md и SETUP_INSTRUCTIONS_RU.md
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="text-xs md:text-sm"
          >
            Вернуться на главную
          </Button>
        </Card>
      </div>
    </div>
  );
}