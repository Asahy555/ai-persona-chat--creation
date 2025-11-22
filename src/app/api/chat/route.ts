import { NextResponse } from 'next/server';
import { processWithNarrator } from '@/lib/narrator-service';
import { LLMConfig } from '@/lib/llm-service';

export async function POST(request: Request) {
  try {
    const { message, personalities, conversationHistory, apiConfig } = await request.json();

    if (!message || !personalities || !Array.isArray(personalities)) {
      return NextResponse.json(
        { error: 'Требуются сообщение и личности' },
        { status: 400 }
      );
    }

    console.log(`🎭 Processing message with ${personalities.length} character(s) via Narrator...`);

    // Use API config from request if provided
    const config: LLMConfig = apiConfig || {};

    // Используем главную модель-рассказчика
    const narratorResponse = await processWithNarrator(
      message,
      personalities,
      conversationHistory || [],
      config
    );

    console.log(`✅ Narrator response generated with ${narratorResponse.characterResponses.length} character(s)`);

    return NextResponse.json({
      success: true,
      narratorResponse,
    });
  } catch (error) {
    console.error('Ошибка в маршруте чата:', error);
    return NextResponse.json(
      { error: 'Не удалось сгенерировать ответ', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}