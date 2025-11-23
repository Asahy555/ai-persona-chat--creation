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
  }>;
  shouldGenerateImage?: boolean;
  imagePrompt?: string;
  imageCharacterId?: string;
}

/**
 * АРХИТЕКТУРА: Естественное живое общение
 * 
 * - Рассказчик - невидимый голос за кадром (описывает атмосферу и действия ВСЕХ персонажей)
 * - Каждый персонаж - живой человек (свой LLM вызов, говорит только слова)
 * - Персонажи общаются естественно друг с другом и с пользователем
 * - Нет очередности - как в реальной беседе
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
    
    // Шаг 1: Каждый персонаж независимо решает - отвечать ли ему и генерирует свой ответ
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
        
        characterResponses.push(response);
        
        // Небольшая задержка для естественности
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(`🤐 ${personality.name} молчит`);
      }
    }

    // Шаг 2: Рассказчик (невидимый голос) описывает всю сцену и действия персонажей
    const narratorVoice = await this.generateNarratorDescription(
      userMessage,
      personalities,
      conversationHistory,
      characterResponses
    );

    return {
      narratorVoice,
      characterResponses,
      shouldGenerateImage: false
    };
  }

  /**
   * Рассказчик описывает сцену и действия ВСЕХ персонажей (невидимый голос за кадром)
   */
  private async generateNarratorDescription(
    userMessage: string,
    personalities: Personality[],
    conversationHistory: any[],
    characterResponses: any[]
  ): Promise<string | undefined> {
    
    if (characterResponses.length === 0) {
      return undefined; // Никто не ответил - рассказчику нечего описывать
    }

    // Формируем контекст для рассказчика
    const recentHistory = conversationHistory.slice(-6).map(m => {
      const sender = m.senderId === 'user' ? 'Пользователь' : m.senderName;
      return `${sender}: ${m.content}`;
    }).join('\n');

    const responsesSummary = characterResponses.map(r => 
      `${r.characterName} говорит: "${r.response}"`
    ).join('\n');

    const prompt = `Ты - невидимый рассказчик (голос за кадром). Ты НЕ участник разговора.

Твоя задача:
1. Опиши атмосферу и обстановку
2. Опиши ДЕЙСТВИЯ каждого персонажа (жесты, мимику, движения)
3. Передай эмоции сцены

ПЕРСОНАЖИ:
${personalities.map(p => `${p.name}: ${p.personality}`).join('\n')}

НЕДАВНИЕ СОБЫТИЯ:
${recentHistory}

НОВОЕ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ:
${userMessage}

ОТВЕТЫ ПЕРСОНАЖЕЙ:
${responsesSummary}

Напиши описание от третьего лица (он/она/они). Опиши действия и атмосферу. 
НЕ повторяй слова персонажей - только их действия, жесты, эмоции, обстановку.
Пиши на РУССКОМ языке, 2-4 предложения.

Пример: "Комната наполнилась напряжением. Анна нервно кусает губу, её взгляд блуждает по комнате. Дмитрий скрещивает руки на груди, его брови нахмурены."`;

    try {
      const { content } = await queryLLMWithFallback(
        [{ role: 'system', content: prompt }],
        this.config
      );
      
      return content.trim();
    } catch (error) {
      console.log('⚠️ Рассказчик недоступен');
      return undefined;
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