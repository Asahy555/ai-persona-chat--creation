'use server';

export async function generateImage(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' = '1:1') {
  try {
    // Call the internal API endpoint that will be intercepted by the generate_image tool
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/internal/generate-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
        }),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate image');
    }

    const url = await response.text();
    return { success: true, url: url.trim() };
  } catch (error) {
    console.error('Error generating image:', error);
    return { success: false, error: 'Failed to generate image' };
  }
}
