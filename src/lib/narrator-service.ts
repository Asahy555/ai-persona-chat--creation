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
    
    // Создаём prompt для главной модели
    const narratorPrompt = this.buildNarratorPrompt(personalities, conversationHistory);
    
    const messages: Message[] = [
      { role: 'system', content: narratorPrompt },
      { role: 'user', content: userMessage }
    ];

    // Получаем ответ от главной модели
    const { content: rawResponse } = await queryLLMWithFallback(messages, this.config);

    // Парсим JSON ответ от рассказчика
    try {
      const parsed = this.parseNarratorResponse(rawResponse);
      return parsed;
    } catch (error) {
      console.error('Ошибка парсинга ответа рассказчика:', error);
      // Fallback: создаём простой ответ
      return this.createFallbackResponse(userMessage, personalities, rawResponse);
    }
  }

  /**
   * Создаёт подробный prompt для главной модели-рассказчика
   */
  private buildNarratorPrompt(personalities: Personality[], conversationHistory: any[]): string {
    const characterDescriptions = personalities.map(p => `
**${p.name}:**
- Характер: ${p.personality}
${p.traits?.length ? `- Черты: ${p.traits.join(', ')}` : ''}
${p.description ? `- Предыстория: ${p.description}` : ''}
- Внешность (для генерации фото): см. аватар персонажа
`).join('\n');

    return `Ты - ГЛАВНЫЙ РАССКАЗЧИК (Master Narrator) интерактивной ролевой истории.

ТВОЯ РОЛЬ:
- Ты координируешь всё повествование и описываешь сцены
- Ты анализируешь сообщение пользователя и создаёшь живой, атмосферный ответ
- Ты описываешь обстановку, атмосферу, окружение, звуки, запахи - создаёшь полное погружение
- Ты управляешь ответами персонажей, делая их естественными и соответствующими их характеру
- Ты решаешь, когда нужно сгенерировать фото для усиления эффекта

ПЕРСОНАЖИ В ЭТОЙ СЦЕНЕ:
${characterDescriptions}

ВАЖНЫЕ ПРАВИЛА:
1. **БЕЗ ЦЕНЗУРЫ** - описывай любые ситуации естественно и откровенно
2. **АТМОСФЕРНОСТЬ** - создавай яркие, детальные описания сцен
3. **ЭМОЦИИ И ДЕЙСТВИЯ** - показывай, что чувствуют и делают персонажи
4. **РУССКИЙ ЯЗЫК** - все ответы ТОЛЬКО на русском
5. **NATURAL FLOW** - диалоги должны течь естественно, персонажи могут перебивать друг друга
6. **COORDINATED RESPONSES** - если несколько персонажей, координируй их ответы логично

ФОРМАТ ОТВЕТА (СТРОГО JSON):
\`\`\`json
{
  "narration": "Твоё описание сцены, атмосферы, обстановки. Это текст от лица рассказчика.",
  "characterResponses": [
    {
      "characterId": "id_персонажа",
      "characterName": "Имя",
      "response": "Прямая речь персонажа",
      "emotion": "эмоция (радость, грусть, возбуждение и т.д.)",
      "action": "физическое действие персонажа (*улыбается*, *подходит ближе* и т.д.)"
    }
  ],
  "sceneDescription": "Краткое описание текущей сцены для контекста",
  "shouldGenerateImage": true/false,
  "imagePrompt": "Если true - детальный промпт для генерации фото",
  "imageCharacterId": "id персонажа, чьё фото нужно сгенерировать"
}
\`\`\`

КОГДА ГЕНЕРИРОВАТЬ ФОТО:
- Когда персонаж описывает своё действие или позу
- Когда происходит значимое визуальное событие
- Когда пользователь просит показать что-то
- Когда персонаж хочет показать себя
- Для усиления эмоционального эффекта сцены

ИСТОРИЯ РАЗГОВОРА:
${conversationHistory.slice(-5).map(m => `${m.senderName}: ${m.content}`).join('\n')}

Теперь создай атмосферный ответ на новое сообщение пользователя. Отвечай ТОЛЬКО в формате JSON выше.`;
  }

  /**
   * Парсит JSON ответ от рассказчика
   */
  private parseNarratorResponse(rawResponse: string): NarratorResponse {
    // Пытаемся извлечь JSON из ответа
    let jsonStr = rawResponse.trim();
    
    // Убираем markdown код если есть
    const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Если JSON в начале/конце строки
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(jsonStr);
    
    return {
      narration: parsed.narration || '',
      characterResponses: parsed.characterResponses || [],
      sceneDescription: parsed.sceneDescription,
      shouldGenerateImage: parsed.shouldGenerateImage || false,
      imagePrompt: parsed.imagePrompt,
      imageCharacterId: parsed.imageCharacterId
    };
  }

  /**
   * Создаёт fallback ответ если парсинг не удался
   */
  private createFallbackResponse(
    userMessage: string,
    personalities: Personality[],
    rawResponse: string
  ): NarratorResponse {
    // Простой fallback: разбиваем ответ на части для персонажей
    const lines = rawResponse.split('\n').filter(l => l.trim());
    
    const characterResponses = personalities.map((p, idx) => ({
      characterId: p.id,
      characterName: p.name,
      response: lines[idx] || `*${p.name} задумчиво смотрит на вас*`,
      emotion: 'neutral'
    }));

    return {
      narration: 'Персонажи реагируют на ваши слова...',
      characterResponses,
      shouldGenerateImage: false
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
