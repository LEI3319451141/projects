import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { registerUser, findGuestByUsername } from '@/lib/db/queries';
import { setUserSession } from '@/lib/user-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, nickname } = body as {
      username?: string;
      password?: string;
      nickname?: string;
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
