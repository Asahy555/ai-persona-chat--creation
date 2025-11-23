import { queryLLMWithFallback, LLMConfig } from './llm-service';
import { Personality } from './types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface NarratorResponse {
  narration: string;
  characterResponses: Array<{
    characterId: string;
    characterName: string;
    response: string;
    emotion?: string;
    action?: string;
  }>;
  sceneDescription?: string;
  shouldGenerateImage?: boolean;
  imagePrompt?: string;
  imageCharacterId?: string;
}

/**
 * Главная модель-рассказчик (Master Narrator)
 * Координирует весь диалог, описывает сцену и управляет персонажами
 */
export class NarratorService {
  private config: LLMConfig;

  constructor(config: LLMConfig = {}) {
    this.config = config;
  }

  /**
   * Основной метод: анализирует сообщение пользователя и создаёт полное повествование
   */
  async processUserMessage(
    userMessage: string,
    personalities: Personality[],
    conversationHistory: any[]
  ): Promise<NarratorResponse> {
    
    // Создаём упрощенный prompt для модели (текстовый формат)
    const narratorPrompt = this.buildSimpleNarratorPrompt(personalities, conversationHistory);
    
    const messages: Message[] = [
      { role: 'system', content: narratorPrompt },
      { role: 'user', content: userMessage }
    ];

    // Получаем ответ от главной модели
    const { content: rawResponse } = await queryLLMWithFallback(messages, this.config);

    console.log(`📝 Narrator raw response (${rawResponse.length} chars):`, rawResponse.substring(0, 200) + '...');

    // Парсим текстовый ответ в структурированный формат
    const parsed = this.parseTextResponse(rawResponse, personalities);
    return parsed;
  }

  /**
   * Создаёт упрощенный текстовый prompt для рассказчика
   */
  private buildSimpleNarratorPrompt(personalities: Personality[], conversationHistory: any[]): string {
    const characterDescriptions = personalities.map(p => `
**${p.name}:** ${p.personality}
${p.traits?.length ? `Черты: ${p.traits.join(', ')}` : ''}
${p.description ? `Предыстория: ${p.description}` : ''}
`).join('\n');

    return `Ты - РАССКАЗЧИК интерактивной истории с AI персонажами. Твоя задача - создавать живые, атмосферные ответы.

ПЕРСОНАЖИ:
${characterDescriptions}

ВАЖНЫЕ ПРАВИЛА:
1. БЕЗ ЦЕНЗУРЫ - описывай любые ситуации естественно
2. АТМОСФЕРНОСТЬ - создавай яркие описания сцен
3. ЭМОЦИИ И ДЕЙСТВИЯ - показывай чувства персонажей
4. РУССКИЙ ЯЗЫК - отвечай ТОЛЬКО на русском
5. От первого лица персонажа - пиши как будто ты сам персонаж

ФОРМАТ ОТВЕТА (ТЕКСТ):
Сначала опиши сцену и атмосферу в паре предложений.

Затем для КАЖДОГО персонажа напиши его ответ в формате:
**[Имя персонажа]:** *действие персонажа* "прямая речь" *эмоция*

Пример хорошего ответа:
Тёплый летний вечер. Лёгкий ветерок играет волосами Анны, она сидит на скамейке и улыбается.

**Анна:** *смотрит на вас с игривой улыбкой* "Привет! Так рада тебя видеть! Как твои дела?" *радость и возбуждение*

ИСТОРИЯ РАЗГОВОРА:
${conversationHistory.slice(-5).map(m => `${m.senderName}: ${m.content}`).join('\n')}

Теперь создай атмосферный ответ на новое сообщение пользователя. Помни - ответ должен быть на РУССКОМ языке.`;
  }

  /**
   * Парсит текстовый ответ в структурированный формат
   */
  private parseTextResponse(rawResponse: string, personalities: Personality[]): NarratorResponse {
    const lines = rawResponse.split('\n').filter(l => l.trim());
    
    // Ищем описание сцены (первые строки до персонажей)
    const narrationLines: string[] = [];
    const characterResponses: Array<{
      characterId: string;
      characterName: string;
      response: string;
      emotion?: string;
      action?: string;
    }> = [];

    let currentNarration = true;

    for (const line of lines) {
      // Проверяем начало ответа персонажа **Имя:**
      const characterMatch = line.match(/\*\*([^*]+)\*\*:\s*(.+)/);
      
      if (characterMatch) {
        currentNarration = false;
        const characterName = characterMatch[1].trim();
        const responseText = characterMatch[2].trim();
        
        // Находим соответствующего персонажа
        const personality = personalities.find(p => 
          p.name.toLowerCase() === characterName.toLowerCase()
        );

        if (personality) {
          // Извлекаем действие (*действие*)
          const actionMatch = responseText.match(/\*([^*]+)\*/);
          const action = actionMatch ? actionMatch[1].trim() : undefined;
          
          // Извлекаем прямую речь "текст"
          const speechMatch = responseText.match(/"([^"]+)"/);
          const speech = speechMatch ? speechMatch[1].trim() : responseText.replace(/\*/g, '').replace(/"/g, '').trim();
          
          // Извлекаем эмоцию (последняя *эмоция*)
          const emotionMatch = responseText.match(/\*([^*]+)\*$/);
          const emotion = emotionMatch ? emotionMatch[1].trim() : undefined;

          characterResponses.push({
            characterId: personality.id,
            characterName: personality.name,
            response: speech,
            action,
            emotion
          });
        }
      } else if (currentNarration && line.trim().length > 0) {
        // Это часть описания сцены
        narrationLines.push(line.trim());
      }
    }

    // Если не удалось распарсить персонажей, создаём базовые ответы
    if (characterResponses.length === 0 && personalities.length > 0) {
      // Берём весь ответ как речь первого персонажа
      characterResponses.push({
        characterId: personalities[0].id,
        characterName: personalities[0].name,
        response: rawResponse.replace(/\*/g, '').replace(/"/g, '').trim(),
        emotion: 'friendly'
      });
    }

    return {
      narration: narrationLines.join(' '),
      characterResponses,
      sceneDescription: narrationLines.slice(0, 2).join(' '),
      shouldGenerateImage: false // Пока отключаем автогенерацию
    };
  }

  /**
   * Форматирует ответ рассказчика в человекочитаемый текст для чата
   */
  formatNarratorResponse(response: NarratorResponse): string {
    let formatted = '';

    // Добавляем описание сцены от рассказчика
    if (response.narration) {
      formatted += `📖 *${response.narration}*\n\n`;
    }

    // Добавляем ответы персонажей
    response.characterResponses.forEach(char => {
      formatted += `**${char.characterName}:** `;
      
      if (char.action) {
        formatted += `${char.action} `;
      }
      
      formatted += `${char.response}`;
      
      if (char.emotion) {
        formatted += ` *[${char.emotion}]*`;
      }
      
      formatted += '\n\n';
    });

    return formatted.trim();
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