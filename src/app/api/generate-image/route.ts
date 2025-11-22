import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, aspectRatio = '1:1' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call the image generation API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/internal/generate-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: '',
          aspect_ratio: aspectRatio,
        }),
      }
    );

    const data = await response.text();
    
    if (!response.ok) {
      throw new Error(data || 'Failed to generate image');
    }

    // The response should be a URL
    const url = data.trim();

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error in generate-image route:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
