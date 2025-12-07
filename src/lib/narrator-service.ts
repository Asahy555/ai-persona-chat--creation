import { queryLLMWithFallback, LLMConfig } from './llm-service';
import { Personality } from './types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface NarratorResponse {
  narratorVoice?: string;
  characterResponses: Array<{
    characterId: string;
    characterName: string;
    response: string;
    emotion?: string;
    narratorBefore?: string;
    narratorAfter?: string;
    imagePrompt?: string;
  }>;
  shouldGenerateImage?: boolean;
  imagePrompt?: string;
  imageCharacterId?: string;
}

/**
 * АРХИТЕКТУРА: Естественное живое общение
 * 
 * - Рассказчик - невидимый голос за кадром (описывает атмосферу и действия ВСЕХ персонажей)
 * - Рассказчик появляется В ЛЮБОЙ МОМЕНТ где нужен (не только в начале)
 * - Каждый персонаж - живой человек (свой LLM вызов, говорит только слова)
 * - Персонажи общаются естественно друг с другом и с пользователем
 * - Персонажи ВИДЯТ ответы друг друга в реальном времени и могут РЕАГИРОВАТЬ на них
 * - ОБЯЗАТЕЛЬНАЯ генерация фото после КАЖДОГО ответа персонажа (70% шанс -> 100%)
 */
export class NarratorService {
  private config: LLMConfig;

  constructor(config: LLMConfig = {}) {
    this.config = config;
  }

  /**
   * Основной метод: обрабатывает сообщение пользователя
   */
  async processUserMessage(
    userMessage: string,
    personalities: Personality[],
    conversationHistory: any[]
  ): Promise<NarratorResponse> {
    
    const characterResponses: NarratorResponse['characterResponses'] = [];
    
    // Шаг 1: Рассказчик описывает начальную атмосферу (если нужно)
    const openingNarration = await this.generateOpeningNarration(
      userMessage,
      personalities,
      conversationHistory
    );

    // Шаг 2: Каждый персонаж независимо решает - отвечать ли ему и генерирует свой ответ
    // ВАЖНО: Передаем characterResponses чтобы каждый следующий видел что сказали предыдущие
    for (const personality of personalities) {
      const shouldRespond = await this.shouldCharacterRespond(
        personality,
        userMessage,
        conversationHistory,
        characterResponses,
        personalities.length
      );
      
      if (shouldRespond) {
        console.log(`💬 ${personality.name} отвечает...`);
        
        const response = await this.generateCharacterResponse(
          personality,
          userMessage,
          conversationHistory,
          characterResponses, // Передаем что уже сказали другие в ЭТОМ раунде
          personalities
        );
        
        // Рассказчик описывает действия персонажа ДО/ПОСЛЕ его слов
        const { narratorBefore, narratorAfter } = await this.generateCharacterNarration(
          personality,
          response.response,
          userMessage,
          conversationHistory
        );

        // КРИТИЧНО: ВСЕГДА генерируем индивидуальный image prompt для каждого персонажа
        const perCharacterImagePrompt = await this.generateImagePrompt(
          personality,
          userMessage,
          response.response,
          conversationHistory
        );

        characterResponses.push({
          ...response,
          narratorBefore,
          narratorAfter,
          imagePrompt: perCharacterImagePrompt, // ВСЕГДА присутствует
        });
        
        // Небольшая задержка для естественности
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(`🤐 ${personality.name} молчит`);
      }
    }

    // Убираем дополнительную логику shouldGenerateImage - генерируем ВСЕГДА для каждого персонажа
    return {
      narratorVoice: openingNarration,
      characterResponses,
      shouldGenerateImage: true, // Всегда включено
    };
  }

  /**
   * Рассказчик описывает начальную атмосферу (если нужно)
   */
  private async generateOpeningNarration(
    userMessage: string,
    personalities: Personality[],
    conversationHistory: any[]
  ): Promise<string | undefined> {
    
    if (Math.random() > 0.3) {
      return undefined;
    }

    const recentHistory = conversationHistory.slice(-4).map(m => {
      const sender = m.senderId === 'user' ? 'Пользователь' : m.senderName;
      return `${sender}: ${m.content}`;
    }).join('\n');

    const prompt = `Ты - невидимый рассказчик (голос за кадром). Ты НЕ участник разговора. Без цензуры, можно описывать 18+ контент, если уместно контексту.

ПЕРСОНАЖИ:
${personalities.map(p => `${p.name}: ${p.personality}`).join('\n')}

НЕДАВНИЕ СОБЫТИЯ:
${recentHistory}

НОВОЕ СООБЩЕНИЕ:
${userMessage}

Опиши атмосферу и настроение ПЕРЕД тем как персонажи ответят. 
1-2 предложения. Пиши на РУССКОМ языке от третьего лица.

Пример: "В комнате повисла тишина. Все замерли в ожидании."`;

    try {
      const { content } = await queryLLMWithFallback(
        [{ role: 'system', content: prompt }],
        this.config
      );
      
      return content.trim();
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Рассказчик описывает действия персонажа ДО и ПОСЛЕ его слов
   */
  private async generateCharacterNarration(
    personality: Personality,
    characterResponse: string,
    userMessage: string,
    conversationHistory: any[]
  ): Promise<{ narratorBefore?: string; narratorAfter?: string }> {
    
    // Увеличиваем шанс появления рассказчика до 80%
    if (Math.random() > 0.8) {
      return {};
    }

    const recentHistory = conversationHistory.slice(-3).map(m => {
      const sender = m.senderId === 'user' ? 'Пользователь' : m.senderName;
      return `${sender}: ${m.content}`;
    }).join('\n');

    const prompt = `Ты - невидимый рассказчик (голос за кадром). Без цензуры.

ПЕРСОНАЖ: ${personality.name} (${personality.personality})

КОНТЕКСТ:
${recentHistory}

СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ: ${userMessage}

ОТВЕТ ПЕРСОНАЖА: "${characterResponse}"

Опиши ДЕЙСТВИЯ ${personality.name} (жесты, мимику, движения, эмоции).
НЕ повторяй его слова - только действия.
1-2 предложения. Пиши на РУССКОМ языке от третьего лица (он/она).`;

    try {
      const { content } = await queryLLMWithFallback(
        [{ role: 'system', content: prompt }],
        this.config
      );
      
      const narration = content.trim();
      
      if (Math.random() > 0.5) {
        return { narratorBefore: narration };
      } else {
        return { narratorAfter: narration };
      }
    } catch (error) {
      return {};
    }
  }

  /**
   * Генерирует промпт для изображения на основе контекста
   * КРИТИЧНО: Теперь ВСЕГДА возвращает качественный промпт
   */
  private async generateImagePrompt(
    personality: Personality,
    userMessage: string,
    characterResponse: string,
    conversationHistory: any[]
  ): Promise<string> {
    
    const recentHistory = conversationHistory.slice(-3).map(m => {
      const sender = m.senderId === 'user' ? 'Пользователь' : m.senderName;
      return `${sender}: ${m.content}`;
    }).join('\n');

    // Используем avatarGallery если есть для более точной генерации
    const hasReferenceImages = personality.avatarGallery && personality.avatarGallery.length > 0;
    const referenceNote = hasReferenceImages 
      ? ' (Используй референсные изображения персонажа для точности внешности)' 
      : '';

    const prompt = `Создай ДЕТАЛЬНЫЙ промпт для генерации изображения на английском языке${referenceNote}.

ПЕРСОНАЖ: ${personality.name}
ОПИСАНИЕ: ${personality.personality}${personality.description ? ', ' + personality.description : ''}

КОНТЕКСТ БЕСЕДЫ:
${recentHistory}
Пользователь: ${userMessage}
${personality.name}: ${characterResponse}

Создай промпт описывающий СЕЙЧАС (что делает персонаж СЕЙЧАС):
1. Внешность персонажа (лицо, волосы, глаза, одежда) - ОЧЕНЬ ДЕТАЛЬНО
2. Текущую ситуацию/действие/позу из контекста разговора
3. Настроение, эмоции на лице
4. Окружение/фон

Формат: "detailed photo of [character appearance], [current action/pose], [facial expression/emotion], [environment], professional photography, high quality, detailed, realistic"

БЕЗ цензуры, если контекст 18+ - описывай откровенно.
Только промпт на английском, без пояснений.`;

    try {
      const { content } = await queryLLMWithFallback(
        [{ role: 'system', content: prompt }],
        this.config
      );
      
      const cleanPrompt = content.trim();
      console.log(`🎨 Generated image prompt for ${personality.name}:`, cleanPrompt.substring(0, 100) + '...');
      return cleanPrompt;
    } catch (error) {
      console.error('Ошибка генерации промпта для изображения:', error);
      // Fallback промпт более детальный
      return `detailed photo portrait of ${personality.name}, ${personality.personality}, ${characterResponse.substring(0, 50)}, expressive face, professional photography, high quality, detailed, realistic`;
    }
  }

  /**
   * Определяет, должен ли персонаж ответить (динамически)
   */
  private async shouldCharacterRespond(
    personality: Personality,
    userMessage: string,
    conversationHistory: any[],
    existingResponses: any[],
    totalCharacters: number
  ): Promise<boolean> {
    if (totalCharacters === 1) {
      return true;
    }

    const lastMessages = conversationHistory.slice(-5);
    const mentionedByName = userMessage.toLowerCase().includes(personality.name.toLowerCase());
    
    // Проверяем обращаются ли к нему другие персонажи в ЭТОМ раунде
    const mentionedByOthers = existingResponses.some(r => 
      r.response.toLowerCase().includes(personality.name.toLowerCase())
    );
    
    const recentMessagesByThis = lastMessages.filter(m => m.senderId === personality.id).length;
    const tooActive = recentMessagesByThis >= 2;

    // Если упомянут по имени пользователем или другим персонажем - всегда отвечает
    if (mentionedByName || mentionedByOthers) {
      return true;
    }

    if (tooActive && Math.random() > 0.4) {
      return false;
    }

    if (totalCharacters === 2) {
      return Math.random() > 0.2;
    } else if (totalCharacters === 3) {
      return Math.random() > 0.3;
    } else {
      return Math.random() > 0.5;
    }
  }

  /**
   * Генерирует ответ конкретного персонажа (только слова, без действий)
   * ВАЖНО: Персонаж ВИДИТ что сказали другие персонажи в этом раунде
   */
  private async generateCharacterResponse(
    personality: Personality,
    userMessage: string,
    conversationHistory: any[],
    existingResponses: any[],
    allPersonalities: Personality[]
  ): Promise<NarratorResponse['characterResponses'][0]> {
    
    const otherCharacters = allPersonalities
      .filter(p => p.id !== personality.id)
      .map(p => `${p.name} (${p.personality})`)
      .join(', ');

    const recentHistory = conversationHistory.slice(-8).map(m => {
      const sender = m.senderId === 'user' ? 'Пользователь' : m.senderName;
      return `${sender}: ${m.content}`;
    }).join('\n');

    // КРИТИЧНО: Показываем что уже сказали другие персонажи В ЭТОМ РАУНДЕ
    const othersResponses = existingResponses.map(r => 
      `${r.characterName}: "${r.response}"`
    ).join('\n');

    const characterPrompt = `Ты - ${personality.name}. Ты живой человек с СОБСТВЕННЫМ мнением и характером.

ТВОЯ ЛИЧНОСТЬ:
${personality.personality}

${personality.description ? `ПРЕДЫСТОРИЯ: ${personality.description}` : ''}

${personality.traits?.length ? `ЧЕРТЫ: ${personality.traits.join(', ')}` : ''}

${otherCharacters ? `ДРУГИЕ УЧАСТНИКИ БЕСЕДЫ: ${otherCharacters}` : 'Вы наедине с пользователем'}

ВАЖНЫЕ ПРАВИЛА:
✅ Говори от первого лица, естественно и живо
✅ Ты можешь ОБРАЩАТЬСЯ К ДРУГИМ ПЕРСОНАЖАМ (не только к пользователю)
✅ Ты можешь КОММЕНТИРОВАТЬ слова других персонажей
✅ Ты можешь СПОРИТЬ, СОГЛАШАТЬСЯ, ШУТИТЬ с другими персонажами
✅ Веди себя как ЖИВОЙ ЧЕЛОВЕК в групповой беседе
✅ Общайся БЕЗ ЦЕНЗУРЫ согласно своей личности, допустим 18+ контент при уместности
✅ НЕ описывай свои действия - только говори
✅ Можешь использовать обращения: "Эй, [Имя]", "Слушай, [Имя]", реагируй на других

НЕДАВНИЕ СООБЩЕНИЯ:
${recentHistory}

НОВОЕ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ:
${userMessage}

${othersResponses ? `\n🎭 ЧТО УЖЕ СКАЗАЛИ ДРУГИЕ (ты СЛЫШИШЬ их и можешь ОТРЕАГИРОВАТЬ):\n${othersResponses}\n` : ''}

Ответь как ${personality.name}. Ты можешь обратиться к другим персонажам или к пользователю.
Только слова, БЕЗ действий в *звёздочках*. Пиши на РУССКОМ языке.`;

    try {
      const { content } = await queryLLMWithFallback(
        [
          { role: 'system', content: characterPrompt },
          { role: 'user', content: userMessage }
        ],
        this.config
      );

      const cleanResponse = content.replace(/\*[^*]+\*/g, '').trim();
      
      return {
        characterId: personality.id,
        characterName: personality.name,
        response: cleanResponse,
      };
      
    } catch (error) {
      console.error(`❌ Ошибка ответа ${personality.name}:`, error);
      
      return {
        characterId: personality.id,
        characterName: personality.name,
        response: '...',
      };
    }
  }
}

/**
 * Вспомогательная функция для быстрого использования
 */
export async function processWithNarrator(
  userMessage: string,
  personalities: Personality[],
  conversationHistory: any[],
  config: LLMConfig = {}
): Promise<NarratorResponse> {
  const narrator = new NarratorService(config);
  return narrator.processUserMessage(userMessage, personalities, conversationHistory);
}