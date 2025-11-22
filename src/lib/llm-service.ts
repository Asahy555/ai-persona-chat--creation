import { Ollama } from 'ollama';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  source: 'ollama' | 'gigachat' | 'openrouter' | 'huggingface' | 'fallback';
}

export interface LLMConfig {
  gigachat_auth_key?: string;
  openrouter_api_key?: string;
  huggingface_token?: string;
  ollama_host?: string;
  ollama_model?: string;
}

// 1. Попытка использовать Ollama (локально, бесплатно, без цензуры)
async function tryOllama(messages: Message[], config: LLMConfig): Promise<string | null> {
  try {
    const host = config.ollama_host || process.env.OLLAMA_HOST || 'http://localhost:11434';
    const model = config.ollama_model || process.env.OLLAMA_MODEL || 'llama2-uncensored';
    
    const ollama = new Ollama({ host });
    
    console.log(`🤖 Trying Ollama with model: ${model} at ${host}`);
    
    const response = await ollama.chat({
      model,
      messages: messages as any,
      stream: false,
      options: {
        temperature: 0.9,
        top_p: 0.95,
        top_k: 40,
      }
    });
    
    console.log('✅ Ollama response received');
    return response.message.content;
  } catch (error: any) {
    console.log('❌ Ollama unavailable:', error.message);
    return null;
  }
}

// 2. Попытка использовать GigaChat (Сбербанк, работает в России, freemium)
async function tryGigaChat(messages: Message[], config: LLMConfig): Promise<string | null> {
  const authKey = config.gigachat_auth_key || process.env.GIGACHAT_AUTH_KEY;

  if (!authKey) {
    console.log('⚠️ GigaChat authorization key not configured');
    return null;
  }

  try {
    console.log('🔐 Getting GigaChat access token...');
    
    // Получаем access token используя готовый Authorization key
    const tokenResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authKey}`,
        'RqUID': crypto.randomUUID(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'scope=GIGACHAT_API_PERS',
      // @ts-ignore - добавляем для обхода SSL проблем в Node.js
      ...(typeof process !== 'undefined' && { agent: undefined })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('GigaChat token error:', tokenResponse.status, errorText);
      throw new Error(`Token request failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token in response');
    }
    
    console.log('💬 Calling GigaChat API...');
    
    // Делаем запрос к GigaChat
    const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'GigaChat',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GigaChat API error:', response.status, errorText);
      throw new Error(`GigaChat API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from GigaChat');
    }
    
    console.log('✅ GigaChat response received');
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('❌ GigaChat error details:', error);
    
    // Более информативные сообщения об ошибках
    if (error.message.includes('fetch failed') || error.code === 'ECONNREFUSED') {
      console.log('⚠️ GigaChat: Connection failed. Service may be unavailable outside Russia or SSL certificate issue.');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.log('⚠️ GigaChat: Authorization failed. Please check your Authorization Key.');
    } else {
      console.log('❌ GigaChat unavailable:', error.message);
    }
    
    return null;
  }
}

// 3. Попытка использовать OpenRouter (международный, работает из России)
async function tryOpenRouter(messages: Message[], config: LLMConfig): Promise<string | null> {
  const apiKey = config.openrouter_api_key || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.log('⚠️ OpenRouter API key not configured');
    return null;
  }

  try {
    console.log('🌐 Calling OpenRouter API...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ OpenRouter response received');
    return data.choices[0].message.content;
  } catch (error: any) {
    console.log('❌ OpenRouter unavailable:', error.message);
    return null;
  }
}

// 4. Попытка использовать Hugging Face (бесплатно)
async function tryHuggingFace(messages: Message[], config: LLMConfig): Promise<string | null> {
  const token = config.huggingface_token || process.env.HUGGINGFACE_TOKEN;

  if (!token) {
    console.log('⚠️ Hugging Face token not configured');
    return null;
  }

  try {
    console.log('🤗 Calling Hugging Face API...');
    
    // Объединяем сообщения в один prompt
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.9,
            top_p: 0.95,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Hugging Face response received');
    
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }
    
    return null;
  } catch (error: any) {
    console.log('❌ Hugging Face unavailable:', error.message);
    return null;
  }
}

// Fallback ответ если все провайдеры недоступны
function getFallbackResponse(userMessage: string): string {
  const responses = [
    'Прости, у меня сейчас технические проблемы... *грустно смотрит* Попробуешь снова через минутку?',
    'Ой, кажется я немного задумалась... *смущается* Давай попробуем ещё раз?',
    'Хм, что-то с моей головой не так сегодня... *чешет затылок* Спроси меня ещё раз, пожалуйста?',
    'Извини, я сейчас не могу сформулировать мысль... *выглядит растерянной* Повтори вопрос?',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Основная функция с fallback логикой
export async function queryLLMWithFallback(messages: Message[], config: LLMConfig = {}): Promise<LLMResponse> {
  console.log('\n🚀 Starting LLM query with fallback chain...\n');

  // 1. Пробуем Ollama (локально, бесплатно, без цензуры)
  const ollamaResult = await tryOllama(messages, config);
  if (ollamaResult) {
    return { content: ollamaResult, source: 'ollama' };
  }

  // 2. Пробуем GigaChat (Россия, freemium)
  const gigachatResult = await tryGigaChat(messages, config);
  if (gigachatResult) {
    return { content: gigachatResult, source: 'gigachat' };
  }

  // 3. Пробуем OpenRouter (международный)
  const openrouterResult = await tryOpenRouter(messages, config);
  if (openrouterResult) {
    return { content: openrouterResult, source: 'openrouter' };
  }

  // 4. Пробуем Hugging Face (бесплатно)
  const huggingfaceResult = await tryHuggingFace(messages, config);
  if (huggingfaceResult) {
    return { content: huggingfaceResult, source: 'huggingface' };
  }

  // 5. Fallback если все провайдеры недоступны
  console.log('⚠️ All LLM providers unavailable, using fallback');
  const userMessage = messages[messages.length - 1]?.content || '';
  return {
    content: getFallbackResponse(userMessage),
    source: 'fallback'
  };
}

// Функция для проверки доступности Ollama
export async function checkOllamaAvailable(host?: string): Promise<boolean> {
  try {
    const ollamaHost = host || process.env.OLLAMA_HOST || 'http://localhost:11434';
    const response = await fetch(`${ollamaHost}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}