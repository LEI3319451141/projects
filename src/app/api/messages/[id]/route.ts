import { NextRequest } from 'next/server';
import { updateMessageMedia } from '@/lib/db/queries';

/**
 * PATCH /api/messages/[id] - 更新消息的图片/语音 URL
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      photoUrl?: string;
      audioUrl?: string;
    };

    if (!body.photoUrl && !body.audioUrl) {
      return Response.json(
        { error: 'photoUrl or audioUrl is required' },
        { status: 400 },
      );
    }

    const updated = await updateMessageMedia(id, {
      ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
      ...(body.audioUrl !== undefined ? { audioUrl: body.audioUrl } : {}),
    });

    if (!updated) {
      return Response.json({ error: 'Message not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update message error:', error);
    return Response.json(
      { error: 'Failed to update message' },
      { status: 500 },
    );
  }
}
