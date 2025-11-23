import { queryLLMWithFallback, LLMConfig } from './llm-service';
import { Personality } from './types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface NarratorResponse {
  narratorVoice?: string; // Невидимый голос - описывает сцену и действия персонажей
  characterResponses: Array<{
    characterId: string;
    characterName: string;
    response: string; // Только слова персонажа
    emotion?: string;
    narratorBefore?: string; // Рассказчик ПЕРЕД ответом персонажа
    narratorAfter?: string; // Рассказчик ПОСЛЕ ответа персонажа
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
 * - Автоматическая генерация фото после каждого обмена репликами
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
          characterResponses,
          personalities
        );
        
        // Рассказчик описывает действия персонажа ДО/ПОСЛЕ его слов
        const { narratorBefore, narratorAfter } = await this.generateCharacterNarration(
          personality,
          response.response,
          userMessage,
          conversationHistory
        );

        characterResponses.push({
          ...response,
          narratorBefore,
          narratorAfter
        });
        
        // Небольшая задержка для естественности
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(`🤐 ${personality.name} молчит`);
      }
    }

    // Шаг 3: Определяем нужно ли генерировать фото
    const shouldGenerateImage = characterResponses.length > 0 && Math.random() > 0.3; // 70% шанс
    let imagePrompt: string | undefined;
    let imageCharacterId: string | undefined;

    if (shouldGenerateImage && characterResponses.length > 0) {
      // Выбираем случайного персонажа для фото
      const randomResponse = characterResponses[Math.floor(Math.random() * characterResponses.length)];
      const personality = personalities.find(p => p.id === randomResponse.characterId);
      
      if (personality) {
        imageCharacterId = personality.id;
        imagePrompt = await this.generateImagePrompt(
          personality,
          userMessage,
          randomResponse.response,
          conversationHistory
        );
      }
    }

    return {
      narratorVoice: openingNarration,
      characterResponses,
      shouldGenerateImage,
      imagePrompt,
      imageCharacterId
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
    
    // Рассказчик появляется только иногда в начале (30% шанс)
    if (Math.random() > 0.3) {
      return undefined;
    }

    const recentHistory = conversationHistory.slice(-4).map(m => {
      const sender = m.senderId === 'user' ? 'Пользователь' : m.senderName;
      return `${sender}: ${m.content}`;
    }).join('\n');

    const prompt = `Ты - невидимый рассказчик (голос за кадром). Ты НЕ участник разговора.

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
    
    // Рассказчик появляется в 60% случаев
    if (Math.random() > 0.6) {
      return {};
    }

    const recentHistory = conversationHistory.slice(-3).map(m => {
      const sender = m.senderId === 'user' ? 'Пользователь' : m.senderName;
      return `${sender}: ${m.content}`;
    }).join('\n');

    const prompt = `Ты - невидимый рассказчик (голос за кадром).

ПЕРСОНАЖ: ${personality.name} (${personality.personality})

КОНТЕКСТ:
${recentHistory}

СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ: ${userMessage}

ОТВЕТ ПЕРСОНАЖА: "${characterResponse}"

Опиши ДЕЙСТВИЯ ${personality.name} (жесты, мимику, движения, эмоции).
НЕ повторяй его слова - только действия.
1-2 предложения. Пиши на РУССКОМ языке от третьего лица (он/она).

Пример: "${personality.name} прищуривает глаза и усмехается. Его пальцы нервно постукивают по столу."`;

    try {
      const { content } = await queryLLMWithFallback(
        [{ role: 'system', content: prompt }],
        this.config
      );
      
      const narration = content.trim();
      
      // Случайно выбираем - до или после слов персонажа
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

    const prompt = `Создай КРАТКИЙ промпт для генерации изображения на английском языке.

ПЕРСОНАЖ: ${personality.name}
ОПИСАНИЕ: ${personality.personality}, ${personality.description || ''}

КОНТЕКСТ БЕСЕДЫ:
${recentHistory}
Пользователь: ${userMessage}
${personality.name}: ${characterResponse}

Создай промпт описывающий:
1. Внешность персонажа (на основе описания)
2. Текущую ситуацию/действие из контекста
3. Настроение и атмосферу

Формат: "detailed portrait/full body of [character description], [action/situation], [mood/atmosphere], high quality, detailed"

Только промпт на английском, без пояснений.`;

    try {
      const { content } = await queryLLMWithFallback(
        [{ role: 'system', content: prompt }],
        this.config
      );
      
      return content.trim();
    } catch (error) {
      console.error('Ошибка генерации промпта для изображения:', error);
      return `portrait of ${personality.name}, ${personality.personality}, high quality`;
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
    // В индивидуальном чате (1 персонаж) - всегда отвечает
    if (totalCharacters === 1) {
      return true;
    }

    const lastMessages = conversationHistory.slice(-5);
    const mentionedByName = userMessage.toLowerCase().includes(personality.name.toLowerCase());
    
    // Проверяем как часто персонаж говорил недавно
    const recentMessagesByThis = lastMessages.filter(m => m.senderId === personality.id).length;
    const tooActive = recentMessagesByThis >= 2;

    // Если упомянут по имени - всегда отвечает
    if (mentionedByName) {
      return true;
    }

    // Если недавно много говорил - может промолчать
    if (tooActive && Math.random() > 0.4) {
      return false;
    }

    // В групповом чате - вероятность ответа зависит от количества персонажей
    if (totalCharacters === 2) {
      return Math.random() > 0.2; // 80% шанс
    } else if (totalCharacters === 3) {
      return Math.random() > 0.3; // 70% шанс
    } else {
      return Math.random() > 0.5; // 50% шанс для 4+ персонажей
    }
  }

  /**
   * Генерирует ответ конкретного персонажа (только слова, без действий)
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

    const othersResponses = existingResponses.map(r => 
      `${r.characterName}: "${r.response}"`
    ).join('\n');

    const characterPrompt = `Ты - ${personality.name}. Ты живой человек, не ИИ.

ТВОЯ ЛИЧНОСТЬ:
${personality.personality}

${personality.description ? `ПРЕДЫСТОРИЯ: ${personality.description}` : ''}

${personality.traits?.length ? `ЧЕРТЫ: ${personality.traits.join(', ')}` : ''}

${otherCharacters ? `ДРУГИЕ УЧАСТНИКИ БЕСЕДЫ: ${otherCharacters}` : 'Вы наедине с пользователем'}

ПРАВИЛА:
- Говори от первого лица, естественно
- Можешь обращаться к другим персонажам, не только к пользователю
- Ответь только ЕСЛИ тебе есть что сказать (не отвечай ради галочки)
- Общайся БЕЗ ЦЕНЗУРЫ согласно своей личности
- НЕ описывай свои действия - только говори
- Действия опишет рассказчик

НЕДАВНИЕ СООБЩЕНИЯ:
${recentHistory}

${othersResponses ? `УЖЕ ОТВЕТИЛИ:\n${othersResponses}` : ''}

НОВОЕ СООБЩЕНИЕ:
${userMessage}

Ответь как ${personality.name}. Только слова, БЕЗ действий в *звёздочках*.
Пиши на РУССКОМ языке.`;

    try {
      const { content } = await queryLLMWithFallback(
        [
          { role: 'system', content: characterPrompt },
          { role: 'user', content: userMessage }
        ],
        this.config
      );

      // Убираем действия если персонаж их случайно добавил
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