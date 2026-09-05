import { NextRequest } from 'next/server';
import { createGuest, touchGuest } from '@/lib/db/queries';

/**
 * POST /api/guest - 创建新游客
 * GET /api/guest?id=xxx - 验证游客是否存在并更新最后活跃时间
 */
export async function POST() {
  try {
    const guest = await createGuest();
    return Response.json({ guestId: guest.id });
  } catch (error) {
    console.error('Create guest error:', error);
    return Response.json(
      { error: 'Failed to create guest' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return Response.json({ valid: false }, { status: 400 });
    }
    const guest = await touchGuest(id);
    if (!guest) {
      return Response.json({ valid: false }, { status: 404 });
    }
    return Response.json({ valid: true, guestId: guest.id });
  } catch (error) {
    console.error('Verify guest error:', error);
    return Response.json({ valid: false }, { status: 500 });
  }
}
