import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getOrCreateSession, getMessages } from '@/lib/db/queries';

const { guests } = schema;

/**
 * GET /api/messages?guestId=xxx&characterId=xxx
 * 加载指定游客+角色的历史消息
 */
export async function GET(request: NextRequest) {
  try {
    const guestId = request.nextUrl.searchParams.get('guestId');
    const characterId = request.nextUrl.searchParams.get('characterId');

    if (!guestId || !characterId) {
      return Response.json(
        { error: 'guestId and characterId are required' },
        { status: 400 },
      );
    }

    // 验证 guest 存在
    const [guest] = await db
      .select()
      .from(guests)
      .where(eq(guests.id, guestId));

    if (!guest) {
      return Response.json({ error: 'Guest not found' }, { status: 404 });
    }

    // 获取或创建会话
    const session = await getOrCreateSession(guestId, characterId);

    // 加载消息
    const messages = await getMessages(session.id);

    return Response.json({
      sessionId: session.id,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        photoUrl: m.photoUrl,
        audioUrl: m.audioUrl,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return Response.json(
      { error: 'Failed to load messages' },
      { status: 500 },
    );
  }
}
