import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { apiType, config } = await request.json();

    if (!apiType) {
      return NextResponse.json(
        { success: false, error: 'API type is required' },
        { status: 400 }
      );
    }

    let result = { success: false, error: '', message: '' };

    switch (apiType) {
      case 'gigachat':
        result = await testGigaChat(config);
        break;
      case 'openrouter':
        result = await testOpenRouter(config);
        break;
      case 'huggingface':
        result = await testHuggingFace(config);
        break;
      case 'ollama':
        result = await testOllama(config);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown API type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}

async function testGigaChat(config: any) {
  const authKey = config.gigachat_auth_key || process.env.GIGACHAT_AUTH_KEY;

  if (!authKey) {
    return { success: false, error: 'Authorization key not provided' };
  }

  try {
    const tokenResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authKey}`,
        'RqUID': crypto.randomUUID(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'scope=GIGACHAT_API_PERS',
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return { 
        success: false, 
        error: `Connection failed (${tokenResponse.status}). GigaChat works only from Russian IP addresses.` 
      };
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return { success: false, error: 'Invalid response from GigaChat' };
    }

    return { 
      success: true, 
      message: 'Connected successfully! Token received.' 
    };
  } catch (error: any) {
    if (error.message.includes('fetch failed') || error.code === 'ECONNREFUSED') {
      return { 
        success: false, 
        error: 'Connection failed. GigaChat requires Russian IP address. Use OpenRouter or Hugging Face instead.' 
      };
    }
    return { success: false, error: error.message };
  }
}

async function testOpenRouter(config: any) {
  const apiKey = config.openrouter_api_key || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'API key not provided' };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          { role: 'user', content: 'Hello! This is a test message.' }
        ],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: `API error (${response.status}): ${errorData.error?.message || 'Check your API key'}` 
      };
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      return { 
        success: true, 
        message: 'Connected successfully! API key is valid.' 
      };
    }

    return { success: false, error: 'Invalid response format' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testHuggingFace(config: any) {
  const token = config.huggingface_token || process.env.HUGGINGFACE_TOKEN;

  if (!token) {
    return { success: false, error: 'Access token not provided' };
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'Hello! This is a test.',
          parameters: {
            max_new_tokens: 10,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Invalid token. Check your Hugging Face access token.' };
      }
      if (response.status === 503) {
        return { 
          success: true, 
          message: 'Token is valid! Model is loading (this is normal for free tier). Try again in 20 seconds.' 
        };
      }
      return { success: false, error: `API error (${response.status})` };
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data[0]?.generated_text) {
      return { 
        success: true, 
        message: 'Connected successfully! Token is valid and model is ready.' 
      };
    }

    return { 
      success: true, 
      message: 'Token is valid! (Model response format varies)' 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testOllama(config: any) {
  const host = config.ollama_host || process.env.OLLAMA_HOST || 'http://localhost:11434';

  try {
    const response = await fetch(`${host}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      return { success: false, error: 'Ollama server not responding' };
    }

    const data = await response.json();
    
    if (data.models && Array.isArray(data.models)) {
      const modelCount = data.models.length;
      return { 
        success: true, 
        message: `Connected! Found ${modelCount} installed model(s).` 
      };
    }

    return { success: true, message: 'Connected to Ollama server!' };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return { 
        success: false, 
        error: 'Cannot connect to Ollama. Make sure Ollama is running: ollama serve' 
      };
    }
    return { success: false, error: error.message };
  }
}
