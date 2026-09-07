import { cookies } from 'next/headers';

/**
 * 用户会话（注册/登录后用 httpOnly cookie 存储 guestId）
 * 匿名游客：没有此 cookie，靠 Turnstile 验证
 * 注册用户：有此 cookie，自动跳过 Turnstile
 */

const COOKIE_NAME = 'user_session';

export async function setUserSession(guestId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, guestId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 天
  });
}

export async function clearUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionGuestId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}
