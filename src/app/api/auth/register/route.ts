import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { registerUser, findGuestByUsername } from '@/lib/db/queries';
import { setUserSession } from '@/lib/user-auth';

/**
 * 服务端校验 Cloudflare Turnstile token
 * token 单次有效，验证通过后不可复用
 */
async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set');
    return false;
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const result = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!result.success) {
      console.error('Turnstile verify failed:', result['error-codes']);
    }
    return result.success;
  } catch (err) {
    console.error('Turnstile siteverify error:', err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, nickname, turnstileToken } = body as {
      username?: string;
      password?: string;
      nickname?: string;
      turnstileToken?: string;
    };

    // 基本校验
    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 },
      );
    }
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: '用户名长度需在 2-20 之间' },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少 6 位' },
        { status: 400 },
      );
    }

    // 注册必须先通过人机验证（服务端强制校验，防绕过）
    if (!turnstileToken) {
      return NextResponse.json(
        { error: '请先完成人机验证' },
        { status: 403 },
      );
    }
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      undefined;
    const verified = await verifyTurnstileToken(turnstileToken, ip ?? 'unknown');
    if (!verified) {
      return NextResponse.json(
        { error: '人机验证失败，请重试' },
        { status: 403 },
      );
    }

    // 检查用户名唯一
    const existing = await findGuestByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 409 },
      );
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 10);
    const guest = await registerUser({ username, passwordHash, nickname });

    // 设置登录 cookie
    await setUserSession(guest.id);

    return NextResponse.json({
      success: true,
      user: {
        id: guest.id,
        username: guest.username,
        nickname: guest.nickname,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: '注册失败，请稍后再试' }, { status: 500 });
  }
}
