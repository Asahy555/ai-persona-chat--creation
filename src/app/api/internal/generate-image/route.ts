import { NextResponse } from 'next/server';
import { generateImage } from '@/app/actions/generateImage';

export async function POST(request: Request) {
  try {
    const { prompt, negative_prompt = '', aspect_ratio = '1:1' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call the server action to generate image
    const imageUrl = await generateImage(prompt, negative_prompt, aspect_ratio);
    
    if (!imageUrl || imageUrl.startsWith('Error:')) {
      throw new Error(imageUrl || 'Failed to generate image');
    }

    return new NextResponse(imageUrl, { status: 200 });
  } catch (error) {
    console.error('Error in internal generate-image route:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}