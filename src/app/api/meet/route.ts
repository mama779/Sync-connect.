import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization');
    if (!token) {
      return NextResponse.json({ error: 'Authorization header is missing' }, { status: 401 });
    }

    const res = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Meet API error response:', errText);
      return NextResponse.json(
        { error: 'Failed to create Google Meet space', details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in Meet API route:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
