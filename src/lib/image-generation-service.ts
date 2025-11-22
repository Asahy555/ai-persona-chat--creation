// Сервис для генерации изображений через локальный Stable Diffusion

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
  source: 'fooocus' | 'automatic1111' | 'fallback';
}

export interface ImageGenConfig {
  fooocus_url?: string;
  sd_webui_url?: string;
}

// 1. Попытка использовать Fooocus (порт 7860)
async function tryFooocus(options: ImageGenerationOptions, config: ImageGenConfig): Promise<string | null> {
  const fooocusUrl = config.fooocus_url || process.env.FOOOCUS_API_URL || 'http://localhost:7860';
  
  try {
    console.log(`🎨 Trying Fooocus at ${fooocusUrl}...`);
    
    const response = await fetch(`${fooocusUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || '',
        image_number: 1,
        image_seed: -1,
        sharpness: 2.0,
        guidance_scale: options.cfgScale || 7.0,
        base_model_name: 'realisticVisionV51_v51VAE.safetensors',
        performance_selection: 'Speed',
      }),
    });

    if (!response.ok) {
      throw new Error(`Fooocus API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.images && data.images.length > 0) {
      console.log('✅ Fooocus image generated');
      return `data:image/png;base64,${data.images[0]}`;
    }
    
    return null;
  } catch (error: any) {
    console.log('❌ Fooocus unavailable:', error.message);
    return null;
  }
}

// 2. Попытка использовать AUTOMATIC1111 (порт 7860)
async function tryAutomatic1111(options: ImageGenerationOptions, config: ImageGenConfig): Promise<string | null> {
  const a1111Url = config.sd_webui_url || process.env.SD_WEBUI_URL || 'http://localhost:7860';
  
  try {
    console.log(`🎨 Trying AUTOMATIC1111 at ${a1111Url}...`);
    
    const response = await fetch(`${a1111Url}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || 'low quality, blurry, distorted, deformed',
        steps: options.steps || 20,
        cfg_scale: options.cfgScale || 7,
        width: options.width || 512,
        height: options.height || 512,
        sampler_name: 'Euler a',
        seed: -1,
        batch_size: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`A1111 API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.images && data.images.length > 0) {
      console.log('✅ AUTOMATIC1111 image generated');
      return `data:image/png;base64,${data.images[0]}`;
    }
    
    return null;
  } catch (error: any) {
    console.log('❌ AUTOMATIC1111 unavailable:', error.message);
    return null;
  }
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
        Настройте API в настройках
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Основная функция генерации с fallback
export async function generateImageWithFallback(options: ImageGenerationOptions, config: ImageGenConfig = {}): Promise<ImageGenerationResult> {
  console.log('\n🖼️ Starting image generation with fallback chain...\n');

  // 1. Пробуем Fooocus (легче и быстрее)
  const fooocusResult = await tryFooocus(options, config);
  if (fooocusResult) {
    return { imageUrl: fooocusResult, source: 'fooocus' };
  }

  // 2. Пробуем AUTOMATIC1111 (более продвинутый)
  const a1111Result = await tryAutomatic1111(options, config);
  if (a1111Result) {
    return { imageUrl: a1111Result, source: 'automatic1111' };
  }

  // 3. Fallback если локальные генераторы недоступны
  console.log('⚠️ All image generators unavailable, using fallback');
  return {
    imageUrl: getFallbackImage(),
    source: 'fallback'
  };
}

// Функция для проверки доступности генераторов
export async function checkImageGeneratorsStatus(config: ImageGenConfig = {}) {
  const fooocusUrl = config.fooocus_url || process.env.FOOOCUS_API_URL || 'http://localhost:7860';
  const a1111Url = config.sd_webui_url || process.env.SD_WEBUI_URL || 'http://localhost:7860';

  const status = {
    fooocus: false,
    automatic1111: false,
  };

  // Проверяем Fooocus
  try {
    const response = await fetch(`${fooocusUrl}/api/status`, { method: 'GET' });
    status.fooocus = response.ok;
  } catch {
    status.fooocus = false;
  }

  // Проверяем AUTOMATIC1111
  try {
    const response = await fetch(`${a1111Url}/sdapi/v1/sd-models`, { method: 'GET' });
    status.automatic1111 = response.ok;
  } catch {
    status.automatic1111 = false;
  }

  return status;
}