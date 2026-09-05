import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { requireAdminApi } from '@/lib/admin-auth';

const { guests } = schema;

const VALID_STATUSES = ['active', 'banned'] as const;

/**
 * PATCH /admin/api/users/[id]
 * 编辑用户 status（只允许改 status）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status, must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(guests)
      .set({ status })
      .where(eq(guests.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
