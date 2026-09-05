import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { requireAdminApi } from '@/lib/admin-auth';

const { orders, guests } = schema;

const VALID_STATUSES = ['pending', 'paid', 'shipped', 'completed', 'cancelled'] as const;

/**
 * GET /admin/api/orders/[id]
 * 订单详情（含关联用户信息）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    const [order] = await db
      .select({
        id: orders.id,
        guestId: orders.guestId,
        amount: orders.amount,
        status: orders.status,
        remark: orders.remark,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        guestNickname: guests.nickname,
        guestEmail: guests.email,
      })
      .from(orders)
      .leftJoin(guests, eq(orders.guestId, guests.id))
      .where(eq(orders.id, id));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Get order detail error:', error);
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }
}

/**
 * PATCH /admin/api/orders/[id]
 * 编辑订单 status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status, must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
