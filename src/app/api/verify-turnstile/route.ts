import { NextRequest, NextResponse } from 'next/server';
import { markGuestVerified } from '@/lib/db/queries';

/**
 * POST /api/verify-turnstile
 * 验证 Cloudflare Turnstile token，通过后标记游客为已验证
 */
export async function POST(request: NextRequest) {
  try {
    const { token, guestId } = (await request.json()) as {
      token: string;
      guestId?: string;
    };

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 },
      );
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: 'TURNSTILE_SECRET_KEY not configured' },
        { status: 500 },
      );
    }

    // 获取用户 IP
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      'unknown';

    // 调用 Cloudflare siteverify API
    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          response: token,
          remoteip: ip,
        }),
      },
    );

    const verifyResult = (await verifyRes.json()) as {
      success: boolean;
      'error-codes'?: string[];
    };

    if (!verifyResult.success) {
      console.error('Turnstile verification failed:', verifyResult['error-codes']);
      return NextResponse.json(
        { success: false, error: 'Verification failed' },
        { status: 403 },
      );
    }

    // 验证通过，标记游客（如果有 guestId）
    if (guestId) {
      try {
        await markGuestVerified(guestId);
      } catch (dbErr) {
        console.error('Failed to mark guest verified:', dbErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Turnstile verify error:', error);
    return NextResponse.json(
      { error: 'Verification service error' },
      { status: 500 },
    );
  }
}
