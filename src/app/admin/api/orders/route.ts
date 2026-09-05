import { NextRequest, NextResponse } from 'next/server';
import { sql, like, or, eq, desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { requireAdminApi } from '@/lib/admin-auth';

const { orders, guests } = schema;

/**
 * GET /admin/api/orders?page=1&pageSize=10&search=xxx&status=pending
 * 订单列表（搜索/筛选/分页，含关联用户信息）
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
      // 支持搜索订单号(id)、用户昵称、用户邮箱
      conditions.push(
        or(
          like(orders.id, `%${search}%`),
          like(guests.nickname, `%${search}%`),
          like(guests.email, `%${search}%`),
        ),
      );
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    const where =
      conditions.length > 0
        ? conditions.reduce((acc, c) => sql`${acc} AND ${c}`)
        : undefined;

    // 查询总数（需要 join）
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .leftJoin(guests, eq(orders.guestId, guests.id))
      .where(where);

    // 查询分页数据（含用户信息）
    const list = await db
      .select({
        id: orders.id,
        guestId: orders.guestId,
        amount: orders.amount,
        status: orders.status,
        remark: orders.remark,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        // 关联用户信息
        guestNickname: guests.nickname,
        guestEmail: guests.email,
      })
      .from(orders)
      .leftJoin(guests, eq(orders.guestId, guests.id))
      .where(where)
      .orderBy(desc(orders.createdAt))
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
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}
