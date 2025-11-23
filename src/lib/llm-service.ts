import { generateTextG4F, G4FConfig } from './g4f-service';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  source: 'g4f' | 'fallback';
}

export interface LLMConfig {
  g4f_api_key?: string;
  g4f_text_model?: string;
  g4f_base_url?: string;
}

// Fallback ответ если g4f недоступен
function getFallbackResponse(userMessage: string): string {
  const responses = [
    'Прости, у меня сейчас технические проблемы... *грустно смотрит* Попробуешь снова через минутку?',
    'Ой, кажется я немного задумалась... *смущается* Давай попробуем ещё раз?',
    'Хм, что-то с моей головой не так сегодня... *чешет затылок* Спроси меня ещё раз, пожалуйста?',
    'Извини, я сейчас не могу сформулировать мысль... *выглядит растерянной* Повтори вопрос?',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Основная функция с использованием g4f
export async function queryLLMWithFallback(messages: Message[], config: LLMConfig = {}): Promise<LLMResponse> {
  console.log('\n🚀 Starting LLM query with g4f...\n');

  try {
    // Используем g4f для генерации текста
    const g4fConfig: G4FConfig = {
      apiKey: config.g4f_api_key || process.env.G4F_API_KEY,
      textModel: config.g4f_text_model || process.env.G4F_TEXT_MODEL || 'gpt-4.1',
      baseUrl: config.g4f_base_url || process.env.G4F_BASE_URL || 'https://host.g4f.dev/v1',
    };

    const result = await generateTextG4F(messages, g4fConfig);
    
    return {
      content: result.content,
      source: 'g4f'
    };
  } catch (error: any) {
    console.error('❌ G4F unavailable, using fallback:', error.message);
    
    // Fallback если g4f недоступен
    const userMessage = messages[messages.length - 1]?.content || '';
    return {
      content: getFallbackResponse(userMessage),
      source: 'fallback'
    };
  }
}