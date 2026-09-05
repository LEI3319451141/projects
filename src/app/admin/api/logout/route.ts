import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/admin-auth';

/**
 * POST /admin/api/logout
 * 管理员登出
 */
export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
