import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * 最小后台认证方案
 * TODO: 生产环境应替换为正式认证体系（如 next-auth + RBAC）
 * 当前方案：环境变量 ADMIN_PASSWORD + httpOnly cookie
 */

const COOKIE_NAME = 'admin_session';
// 简单的会话 token（生产环境应使用 JWT 或随机 token + 存储校验）
const SESSION_TOKEN = 'admin_authenticated';

/**
 * 校验密码是否正确
 */
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD is not set in environment variables');
    return false;
  }
  return password === adminPassword;
}

/**
 * 设置管理员会话 cookie（httpOnly，防 XSS）
 */
export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 60 * 60 * 8, // 8 小时
  });
}

/**
 * 清除管理员会话 cookie
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * 服务端校验是否已登录（用于 Server Component / Route Handler）
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === SESSION_TOKEN;
}

/**
 * 保护 API 路由：未登录返回 401
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
