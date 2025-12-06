import { NextResponse } from 'next/server'

// Server-side proxy to check OpenAI-compatible /models endpoint
// Avoids CORS issues from iframe/client and provides clearer errors
export async function POST(req: Request) {
  try {
    const { baseUrl } = await req.json();

    if (!baseUrl || typeof baseUrl !== 'string') {
      return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
    }

    const sanitized = baseUrl.replace(/\/$/, '');
    if (!/^https?:\/\//i.test(sanitized)) {
      return NextResponse.json({ error: 'baseUrl must start with http(s)://' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${sanitized}/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // leave json as null, return raw text for debugging
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Upstream error',
          status: res.status,
          statusText: res.statusText,
          body: json ?? text,
        },
        { status: res.status }
      );
    }

    const data = json ?? {};
    const list = Array.isArray(data?.data) ? data.data : [];
    return NextResponse.json({ ok: true, count: list.length, data: list });
  } catch (e: any) {
    const isAbort = e?.name === 'AbortError';
    return NextResponse.json(
      {
        error: isAbort ? 'Timeout' : e?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
