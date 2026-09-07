import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { findGuestByUsername } from '@/lib/db/queries';
import { setUserSession } from '@/lib/user-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 },
      );
    }

    const guest = await findGuestByUsername(username);
    if (!guest || !guest.passwordHash) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, guest.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 },
      );
    }

    if (guest.status === 'banned') {
      return NextResponse.json(
        { error: '账号已被封禁' },
        { status: 403 },
      );
    }

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
    console.error('Login error:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
