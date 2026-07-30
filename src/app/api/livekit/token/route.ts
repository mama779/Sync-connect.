import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username') || 'Usuario';
  const role = req.nextUrl.searchParams.get('role') || 'student';

  if (!room) {
    return NextResponse.json({ error: 'Falta el parámetro room' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  const apiSecret = process.env.LIVEKIT_API_SECRET || 'secretsecretsecretsecretsecretsecretsecret';
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || '';

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${username}_${Math.random().toString(36).substring(2, 7)}`,
      name: username,
      ttl: '24h',
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: role === 'teacher' || role === 'admin',
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl: livekitUrl,
      serverConfigured: !!(process.env.LIVEKIT_API_KEY && process.env.NEXT_PUBLIC_LIVEKIT_URL),
    });
  } catch (error: any) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json({ error: error.message || 'Error al generar token' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room, username = 'Usuario', role = 'student' } = body;

    if (!room) {
      return NextResponse.json({ error: 'Falta el parámetro room' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secretsecretsecretsecretsecretsecretsecret';
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || '';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${username}_${Math.random().toString(36).substring(2, 7)}`,
      name: username,
      ttl: '24h',
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: role === 'teacher' || role === 'admin',
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl: livekitUrl,
      serverConfigured: !!(process.env.LIVEKIT_API_KEY && process.env.NEXT_PUBLIC_LIVEKIT_URL),
    });
  } catch (error: any) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json({ error: error.message || 'Error al generar token' }, { status: 500 });
  }
}
