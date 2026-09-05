import { NextRequest, NextResponse } from 'next/server';
import { sql, like, or, eq, desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { requireAdminApi } from '@/lib/admin-auth';

const { guests } = schema;

/**
 * GET /admin/api/users?page=1&pageSize=10&search=xxx&status=active
 * 用户列表（搜索/筛选/分页）
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '10')));
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status')?.trim() ?? '';

    // 构建条件
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(guests.nickname, `%${search}%`),
          like(guests.email, `%${search}%`),
        ),
      );
    }
    if (status) {
      conditions.push(eq(guests.status, status));
    }

    const where = conditions.length > 0 ? sql`${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}` : undefined;

    // 查询总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests)
      .where(where);

    // 查询分页数据
    const list = await db
      .select()
      .from(guests)
      .where(where)
      .orderBy(desc(guests.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      list,
      pagination: {
        page,
        pageSize,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
