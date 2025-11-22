'use server';

export async function generateImage(
  prompt: string,
  negativePrompt: string = '',
  aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' = '1:1'
): Promise<string> {
  try {
    console.log('Generating image with prompt:', prompt);
    
    // Call the generation service API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-image-service`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          aspectRatio,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate image');
    }

    const data = await response.json();
    
    if (!data.url) {
      throw new Error('No image URL returned');
    }

    return data.url;
  } catch (error) {
    console.error('Error generating image:', error);
    return `Error: ${error instanceof Error ? error.message : 'Failed to generate image'}`;
  }
}