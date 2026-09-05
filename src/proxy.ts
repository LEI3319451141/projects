import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 后台路由保护 proxy（Next.js 16 中 middleware 已更名为 proxy）
 * 检查 /admin/* 路径（排除登录页和登录 API）的 cookie
 * TODO: 生产环境应替换为正式认证中间件
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只保护 /admin 下的页面（不保护 API，API 内部自行校验）
  if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/api')) {
    return NextResponse.next();
  }

  // 登录页放行
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // 检查 cookie
  const token = request.cookies.get('admin_session')?.value;
  if (token !== 'admin_authenticated') {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
