'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, X, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Personality } from '@/lib/types';

export default function CreatePersonalityPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [description, setDescription] = useState('');
  const [traitInput, setTraitInput] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarGallery, setAvatarGallery] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTrait = () => {
    if (traitInput.trim() && !traits.includes(traitInput.trim())) {
      setTraits([...traits, traitInput.trim()]);
      setTraitInput('');
    }
  };

  const handleRemoveTrait = (trait: string) => {
    setTraits(traits.filter(t => t !== trait));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatar(result);
        // Добавляем в галерею тоже
        if (!avatarGallery.includes(result)) {
          setAvatarGallery([result, ...avatarGallery]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarGallery(prev => {
          // Избегаем дубликатов
          if (prev.includes(result)) return prev;
          return [...prev, result];
        });
        // Первое загруженное фото становится основным аватаром
        if (!avatar) {
          setAvatar(result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Portrait of ${avatarPrompt}, high quality, detailed professional photograph, clear face, expressive eyes`,
          aspectRatio: '1:1',
        }),
      });

      const data = await response.json();
      if (data.url) {
        setAvatar(data.url);
        // Добавляем в галерею
        if (!avatarGallery.includes(data.url)) {
          setAvatarGallery([data.url, ...avatarGallery]);
        }
      }
    } catch (error) {
      console.error('Ошибка генерации аватара:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !personality.trim() || !avatar) return;

    setIsSaving(true);
    const newPersonality: Personality = {
      id: Date.now().toString(),
      name: name.trim(),
      avatar,
      personality: personality.trim(),
      traits,
      description: description.trim(),
      createdAt: new Date().toISOString(),
      avatarGallery: avatarGallery.length ? avatarGallery : undefined,
    };

    storage.savePersonality(newPersonality);
    router.push('/personalities');
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
            Создать ИИ-личность
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Спроектируйте уникального ИИ-компаньона с персональным характером и внешностью
          </p>
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Avatar Section - Mobile Optimized */}
          <Card className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Аватар и внешность
            </h2>
            <div className="space-y-3 md:space-y-4">
              
              {/* Основной аватар */}
              {avatar && (
                <div className="relative aspect-square rounded-lg overflow-hidden border-4 border-purple-200 dark:border-purple-800">
                  <img
                    src={avatar}
                    alt="Основной аватар"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge className="bg-purple-600 text-white">Основной</Badge>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => {
                        // Удаляем из галереи и выбираем следующий
                        const newGallery = avatarGallery.filter(img => img !== avatar);
                        setAvatarGallery(newGallery);
                        setAvatar(newGallery[0] || '');
                      }}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Быстрая загрузка одного фото */}
              <div>
                <Label className="text-sm md:text-base mb-2 block">
                  Загрузить фото аватара
                </Label>
                <label
                  htmlFor="singleUpload"
                  className="flex flex-col items-center justify-center w-full h-24 md:h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-6 w-6 md:h-8 md:w-8 mb-2 text-purple-600" />
                    <p className="text-xs md:text-sm text-muted-foreground">
                      <span className="font-semibold">Нажмите для загрузки</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
                  </div>
                  <input
                    id="singleUpload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    или
                  </span>
                </div>
              </div>

              {/* Генерация аватара через AI */}
              <div>
                <Label htmlFor="avatarPrompt" className="text-sm md:text-base">
                  Описание внешности для генерации
                </Label>
                <Textarea
                  id="avatarPrompt"
                  placeholder="например: anime girl with long purple hair, blue eyes, casual clothes"
                  value={avatarPrompt}
                  onChange={(e) => setAvatarPrompt(e.target.value)}
                  rows={3}
                  className="mt-2 text-sm md:text-base"
                />
              </div>

              <Button
                onClick={handleGenerateAvatar}
                disabled={!avatarPrompt.trim() || isGenerating}
                className="w-full text-sm md:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Сгенерировать аватар
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Дополнительно
                  </span>
                </div>
              </div>

              {/* Multi-Photo Upload для точной генерации */}
              <div className="space-y-2">
                <Label htmlFor="multiUpload" className="text-sm md:text-base">
                  Загрузить несколько фото для точного 3D-аватара
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Загрузите 3-5 фото с разных ракурсов для более точной генерации изображений персонажа
                </p>
                <Input 
                  id="multiUpload" 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleMultiUpload} 
                  className="text-sm md:text-base" 
                />
                
                {/* Галерея референсов */}
                {avatarGallery.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">
                      Референсные фото ({avatarGallery.length})
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {avatarGallery.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={img} 
                            alt={`ref-${idx}`} 
                            className={`w-full h-16 object-cover rounded-md border-2 cursor-pointer transition-all ${
                              img === avatar 
                                ? 'border-purple-600 ring-2 ring-purple-600' 
                                : 'border-gray-200 hover:border-purple-400'
                            }`}
                            onClick={() => setAvatar(img)}
                          />
                          {img === avatar && (
                            <Badge className="absolute -top-1 -right-1 text-[8px] px-1 py-0 h-4 bg-purple-600">
                              Основной
                            </Badge>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button 
                              size="icon" 
                              variant="destructive" 
                              className="h-6 w-6" 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newGallery = avatarGallery.filter((_, i) => i !== idx);
                                setAvatarGallery(newGallery);
                                if (img === avatar) {
                                  setAvatar(newGallery[0] || '');
                                }
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Details Section - Mobile Optimized */}
          <Card className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Детали личности</h2>
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm md:text-base">Имя *</Label>
                <Input
                  id="name"
                  placeholder="например: Сакура"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 text-sm md:text-base"
                />
              </div>

              <div>
                <Label htmlFor="personality" className="text-sm md:text-base">Основной характер *</Label>
                <Textarea
                  id="personality"
                  placeholder="например: Игривая, кокетливая, творческая, любит искусство и музыку"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  rows={3}
                  className="mt-2 text-sm md:text-base"
                />
              </div>

              <div>
                <Label htmlFor="traits" className="text-sm md:text-base">Черты характера</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="traits"
                    placeholder="Добавить черту..."
                    value={traitInput}
                    onChange={(e) => setTraitInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTrait()}
                    className="text-sm md:text-base"
                  />
                  <Button onClick={handleAddTrait} variant="outline" size="sm" className="shrink-0">
                    Добавить
                  </Button>
                </div>
                {traits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {traits.map((trait) => (
                      <Badge key={trait} variant="secondary" className="text-xs">
                        {trait}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTrait(trait)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-sm md:text-base">Предыстория</Label>
                <Textarea
                  id="description"
                  placeholder="Расскажите о предыстории этой личности..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-2 text-sm md:text-base"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-4 md:mt-6 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !personality.trim() || !avatar || isSaving}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm md:text-base"
          >
            {isSaving ? 'Создание...' : 'Создать личность'}
          </Button>
        </div>
      </div>
    </div>
  );
}