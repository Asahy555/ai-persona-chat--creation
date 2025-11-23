// Сервис для генерации изображений через локальный Stable Diffusion

import { generateImageG4F, G4FConfig } from './g4f-service';

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
}

export interface ImageGenerationResult {
  imageUrl: string;
  source: 'g4f' | 'fallback';
}

export interface ImageGenConfig {
  g4f_api_key?: string;
  g4f_image_model?: string;
  g4f_base_url?: string;
}

// Fallback заглушка
function getFallbackImage(): string {
  // Простое SVG изображение как fallback
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#f3f4f6"/>
      <text x="50%" y="45%" text-anchor="middle" font-size="24" fill="#6b7280" font-family="Arial">
        Изображение не может
      </text>
      <text x="50%" y="55%" text-anchor="middle" font-size="24" fill="#6b7280" font-family="Arial">
        быть сгенерировано
      </text>
      <text x="50%" y="70%" text-anchor="middle" font-size="16" fill="#9ca3af" font-family="Arial">
        Попробуйте ещё раз
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Основная функция генерации с использованием g4f
export async function generateImageWithFallback(options: ImageGenerationOptions, config: ImageGenConfig = {}): Promise<ImageGenerationResult> {
  console.log('\n🖼️ Starting image generation with g4f...\n');

  try {
    // Используем g4f для генерации изображений
    const g4fConfig: G4FConfig = {
      apiKey: config.g4f_api_key || process.env.G4F_API_KEY,
      imageModel: config.g4f_image_model || process.env.G4F_IMAGE_MODEL || 'flux',
      baseUrl: config.g4f_base_url || process.env.G4F_BASE_URL || 'https://host.g4f.dev/v1',
    };

    // Формируем полный prompt с учетом negative prompt
    let fullPrompt = options.prompt;
    if (options.negativePrompt) {
      fullPrompt += `. Avoid: ${options.negativePrompt}`;
    }

    const result = await generateImageG4F(fullPrompt, g4fConfig);
    
    return {
      imageUrl: result.url,
      source: 'g4f'
    };
  } catch (error: any) {
    console.error('❌ G4F image generation unavailable, using fallback:', error.message);
    
    // Fallback если g4f недоступен
    return {
      imageUrl: getFallbackImage(),
      source: 'fallback'
    };
  }
}

// Функция для проверки доступности g4f
export async function checkImageGeneratorsStatus(config: ImageGenConfig = {}) {
  const baseUrl = config.g4f_base_url || process.env.G4F_BASE_URL || 'https://host.g4f.dev/v1';

  try {
    const response = await fetch(`${baseUrl}/models`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return {
      g4f: response.ok,
    };
  } catch {
    return {
      g4f: false,
    };
  }
}