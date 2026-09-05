import { NextResponse } from 'next/server';
import { sql, gte, and } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { requireAdminApi } from '@/lib/admin-auth';

const { guests, orders } = schema;

/**
 * GET /admin/api/stats
 * Dashboard 统计数据
 */
export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 用户总数
    const [userTotal] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests);

    // 最近 7 天新增用户
    const [userRecent] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests)
      .where(gte(guests.createdAt, sevenDaysAgo));

    // 订单总数
    const [orderTotal] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders);

    // 最近 7 天订单数
    const [orderRecent] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(gte(orders.createdAt, sevenDaysAgo));

    // 总成交额（paid 状态）
    const [revenueTotal] = await db
      .select({ total: sql<string>`COALESCE(sum(amount), '0')` })
      .from(orders)
      .where(sql`${orders.status} = 'paid'`);

    // 最近 7 天成交额
    const [revenueRecent] = await db
      .select({ total: sql<string>`COALESCE(sum(amount), '0')` })
      .from(orders)
      .where(and(gte(orders.createdAt, sevenDaysAgo), sql`${orders.status} = 'paid'`));

    return NextResponse.json({
      users: {
        total: userTotal?.count ?? 0,
        recent: userRecent?.count ?? 0,
      },
      orders: {
        total: orderTotal?.count ?? 0,
        recent: orderRecent?.count ?? 0,
      },
      revenue: {
        total: revenueTotal?.total ?? '0',
        recent: revenueRecent?.total ?? '0',
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
