/**
 * g4f API Service - Бесплатный AI без цензуры
 * Документация: https://g4f.dev/docs/
 * 
 * Поддерживает:
 * - Генерацию текста (chat completion)
 * - Генерацию изображений (image generation)
 * - Без API ключа для бесплатных провайдеров
 * - Множество fallback эндпоинтов
 */

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface G4FTextResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface G4FImageResponse {
  url: string;
  model: string;
  provider: string;
}

export interface G4FConfig {
  apiKey?: string;
  textModel?: string;
  imageModel?: string;
  baseUrl?: string;
}

/**
 * Список бесплатных эндпоинтов для текста (в порядке приоритета)
 * Обновлено с рабочими моделями для каждого провайдера
 */
const TEXT_ENDPOINTS = [
  {
    name: 'pollinations-text',
    url: 'https://text.pollinations.ai/openai',
    model: 'openai',
  },
  {
    name: 'g4f-pollinations',
    url: 'https://g4f.dev/api/pollinations.ai/v1/chat/completions',
    model: 'openai',
  },
  {
    name: 'g4f-main',
    url: 'https://host.g4f.dev/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  {
    name: 'g4f-groq',
    url: 'https://g4f.dev/api/groq/v1/chat/completions',
    model: 'llama-3.1-70b',
  },
];

/**
 * Список бесплатных эндпоинтов для изображений
 */
const IMAGE_ENDPOINTS = [
  {
    name: 'pollinations-direct',
    url: 'https://image.pollinations.ai/prompt',
    direct: true, // прямой URL генерации
  },
  {
    name: 'g4f-pollinations',
    url: 'https://g4f.dev/api/pollinations.ai/v1/images/generations',
    model: 'flux',
    direct: false,
  },
  {
    name: 'g4f-host',
    url: 'https://host.g4f.dev/v1/images/generations',
    model: 'flux',
    direct: false,
  },
];

/**
 * Генерация текста через g4f с fallback
 */
export async function generateTextG4F(
  messages: Message[],
  config: G4FConfig = {}
): Promise<G4FTextResponse> {
  let lastError: Error | null = null;

  // Пробуем каждый эндпоинт по очереди
  for (const endpoint of TEXT_ENDPOINTS) {
    try {
      console.log(`🤖 G4F: Trying ${endpoint.name}...`);

      // Формируем полный промпт из всех сообщений
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
      
      let fullPrompt = '';
      if (systemMessage) {
        fullPrompt += systemMessage.content + '\n\n';
      }
      fullPrompt += userMessages.map(m => m.content).join('\n');

      const requestBody = {
        messages: [{ role: 'user', content: fullPrompt }],
        model: endpoint.model, // ВАЖНО: используем только модель эндпоинта
        max_tokens: 2048,
        // НЕ ИСПОЛЬЗУЕМ temperature для pollinations - они не поддерживают
      };

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ ${endpoint.name} HTTP ${response.status}: ${errorText.substring(0, 150)}`);
        
        // Если rate limit (429), ждём немного и пробуем следующий
        if (response.status === 429) {
          console.log(`⏳ Rate limited, will try next endpoint...`);
        }
        
        throw new Error(`HTTP ${response.status}`);
      }

      // Пытаемся распарсить как JSON
      const contentType = response.headers.get('content-type');
      let content: string;

      if (contentType?.includes('application/json')) {
        const data = await response.json();
        
        // OpenAI-compatible формат
        if (data.choices && data.choices[0]?.message?.content) {
          content = data.choices[0].message.content;
        } else if (data.response) {
          content = data.response;
        } else if (data.text) {
          content = data.text;
        } else if (typeof data === 'string') {
          content = data;
        } else {
          console.log('❌ Unknown JSON response format:', JSON.stringify(data).substring(0, 200));
          throw new Error('Unknown response format');
        }
      } else {
        // Текстовый ответ
        content = await response.text();
      }

      if (!content || content.length < 10) {
        throw new Error('Empty or invalid response');
      }

      console.log(`✅ G4F: Text generated successfully via ${endpoint.name} (${content.length} chars)`);

      return {
        content: content.trim(),
        model: endpoint.model,
        provider: endpoint.name,
      };
    } catch (error: any) {
      console.log(`❌ ${endpoint.name} failed:`, error.message);
      lastError = error;
      // Продолжаем пробовать следующий эндпоинт
      continue;
    }
  }

  // Если все эндпоинты недоступны
  console.error('❌ All G4F text endpoints failed');
  throw lastError || new Error('All G4F text endpoints unavailable');
}

/**
 * Генерация изображений через g4f с fallback
 */
export async function generateImageG4F(
  prompt: string,
  config: G4FConfig = {}
): Promise<G4FImageResponse> {
  let lastError: Error | null = null;

  // Пробуем каждый эндпоинт по очереди
  for (const endpoint of IMAGE_ENDPOINTS) {
    try {
      console.log(`🎨 G4F: Trying ${endpoint.name} for image generation...`);

      if (endpoint.direct) {
        // Прямой URL (Pollinations - самый надежный)
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `${endpoint.url}/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${Date.now()}`;
        
        console.log(`✅ G4F: Image URL generated via ${endpoint.name}`);

        return {
          url: imageUrl,
          model: 'flux',
          provider: endpoint.name,
        };
      } else {
        // API endpoint (OpenAI-compatible)
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.imageModel || endpoint.model || 'flux',
            prompt,
            n: 1,
            size: '1024x1024',
            response_format: 'url',
          }),
          signal: AbortSignal.timeout(90000), // 90 seconds for image generation
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ ${endpoint.name} HTTP ${response.status}: ${errorText}`);
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || !data.data[0]?.url) {
          console.log('❌ Invalid image response format:', JSON.stringify(data).substring(0, 200));
          throw new Error('Invalid response format');
        }

        console.log(`✅ G4F: Image generated successfully via ${endpoint.name}`);

        return {
          url: data.data[0].url,
          model: endpoint.model || 'flux',
          provider: endpoint.name,
        };
      }
    } catch (error: any) {
      console.log(`❌ ${endpoint.name} failed:`, error.message);
      lastError = error;
      // Продолжаем пробовать следующий эндпоинт
      continue;
    }
  }

  // Если все эндпоинты недоступны
  console.error('❌ All G4F image endpoints failed');
  throw lastError || new Error('All G4F image endpoints unavailable');
}

/**
 * Проверка доступности G4F API
 */
export async function checkG4FAvailable(baseUrl: string = 'https://host.g4f.dev/v1'): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch (error) {
    console.log('G4F API check failed:', error);
    return false;
  }
}

/**
 * Получить список доступных моделей
 */
export async function getG4FModels(config: G4FConfig = {}): Promise<any[]> {
  const baseUrl = config.baseUrl || 'https://host.g4f.dev/v1';
  
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch G4F models:', error);
    return [];
  }
}