'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, X, Loader2, Upload } from 'lucide-react';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Портрет ${avatarPrompt}, высокое качество, детализированная профессиональная фотография`,
          aspectRatio: '1:1',
        }),
      });

      const data = await response.json();
      if (data.url) {
        setAvatar(data.url);
        setUploadedFile(null);
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
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Аватар</h2>
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label htmlFor="avatarPrompt" className="text-sm md:text-base">Описание внешности</Label>
                <Textarea
                  id="avatarPrompt"
                  placeholder="например: аниме девушка с длинными фиолетовыми волосами, голубые глаза, в повседневной одежде"
                  value={avatarPrompt}
                  onChange={(e) => setAvatarPrompt(e.target.value)}
                  rows={3}
                  className="mt-2 text-sm md:text-base"
                />
              </div>

              <Button
                onClick={handleGenerateAvatar}
                disabled={!avatarPrompt.trim() || isGenerating}
                className="w-full text-sm md:text-base"
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
                    или
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="fileUpload" className="text-sm md:text-base">Загрузить своё фото</Label>
                <div className="mt-2">
                  <label
                    htmlFor="fileUpload"
                    className="flex flex-col items-center justify-center w-full h-24 md:h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-6 w-6 md:h-8 md:w-8 mb-2 text-muted-foreground" />
                      <p className="text-xs md:text-sm text-muted-foreground">
                        <span className="font-semibold">Нажмите для загрузки</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, WEBP
                      </p>
                    </div>
                    <input
                      id="fileUpload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              {avatar && (
                <div className="relative aspect-square rounded-lg overflow-hidden border-4 border-purple-200 dark:border-purple-800">
                  <img
                    src={avatar}
                    alt="Сгенерированный аватар"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => {
                        setAvatar('');
                        setUploadedFile(null);
                      }}
                      className="h-8 w-8 md:h-10 md:w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Details Section - Mobile Optimized */}
          <Card className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Детали</h2>
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