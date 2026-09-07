import { NextResponse } from 'next/server';
import { getSessionGuestId } from '@/lib/user-auth';
import { db, schema } from '@/lib/db/index';
import { eq } from 'drizzle-orm';

export async function GET() {
  const guestId = await getSessionGuestId();
  if (!guestId) {
    return NextResponse.json({ user: null });
  }

  const [guest] = await db
    .select({
      id: schema.guests.id,
      username: schema.guests.username,
      nickname: schema.guests.nickname,
      humanVerified: schema.guests.humanVerified,
      status: schema.guests.status,
    })
    .from(schema.guests)
    .where(eq(schema.guests.id, guestId));

  if (!guest) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: guest });
}
