import { NextResponse } from 'next/server';
import { generateImageG4F } from '@/lib/g4f-service';

export async function POST(request: Request) {
  try {
    const { prompt, aspectRatio = '1:1' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating image with g4f: "${prompt.substring(0, 100)}..."`);

    // Используем g4f для генерации изображений
    const result = await generateImageG4F(prompt);

    console.log(`✅ Image generated successfully: ${result.url}`);

    return NextResponse.json({ 
      url: result.url,
      model: result.model,
      provider: result.provider
    });
  } catch (error) {
    console.error('❌ Error in generate-image route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}