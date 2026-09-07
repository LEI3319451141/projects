import { eq, and, desc, asc, or } from 'drizzle-orm';
import { db, schema } from './index';
import type { ChatMessage } from './schema';

const { guests, chatSessions, chatMessages } = schema;

/**
 * 创建新游客
 */
export async function createGuest() {
  const [guest] = await db.insert(guests).values({}).returning();
  return guest;
}

/**
 * 按 username 查找用户
 */
export async function findGuestByUsername(username: string) {
  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.username, username));
  return guest ?? null;
}

/**
 * 注册：创建带账号的用户（username 唯一）
 */
export async function registerUser(params: {
  username: string;
  passwordHash: string;
  nickname?: string;
}) {
  const [guest] = await db
    .insert(guests)
    .values({
      username: params.username,
      passwordHash: params.passwordHash,
      nickname: params.nickname ?? params.username,
      humanVerified: true, // 注册用户自动通过人机验证
    })
    .returning();
  return guest;
}

/**
 * 更新用户密码
 */
export async function updatePassword(guestId: string, passwordHash: string) {
  const [updated] = await db
    .update(guests)
    .set({ passwordHash })
    .where(eq(guests.id, guestId))
    .returning();
  return updated;
}

/**
 * 获取游客并更新最后活跃时间
 */
export async function touchGuest(guestId: string) {
  const [guest] = await db
    .update(guests)
    .set({ lastSeenAt: new Date() })
    .where(eq(guests.id, guestId))
    .returning();
  return guest;
}

/**
 * 获取或创建会话（一个 guest + 一个 character 唯一）
 */
export async function getOrCreateSession(guestId: string, characterId: string) {
  // 先查
  let [session] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.guestId, guestId), eq(chatSessions.characterId, characterId)));

  if (!session) {
    [session] = await db
      .insert(chatSessions)
      .values({ guestId, characterId })
      .returning();
  }

  return session;
}

/**
 * 加载会话下的所有消息（按时间升序）
 */
export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));
}

/**
 * 添加消息
 */
export async function addMessage(params: {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  photoUrl?: string;
  audioUrl?: string;
}) {
  const [message] = await db.insert(chatMessages).values(params).returning();
  // 更新会话的 updatedAt
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, params.sessionId));
  return message;
}

/**
 * 更新消息的图片/语音 URL
 */
export async function updateMessageMedia(
  messageId: string,
  fields: { photoUrl?: string; audioUrl?: string }
) {
  const [updated] = await db
    .update(chatMessages)
    .set(fields)
    .where(eq(chatMessages.id, messageId))
    .returning();
  return updated;
}

/**
 * 标记游客已通过人机验证
 */
export async function markGuestVerified(guestId: string) {
  const [updated] = await db
    .update(guests)
    .set({ humanVerified: true })
    .where(eq(guests.id, guestId))
    .returning();
  return updated;
}

/**
 * 检查游客是否已通过人机验证
 */
export async function isGuestVerified(guestId: string): Promise<boolean> {
  const [guest] = await db
    .select({ humanVerified: guests.humanVerified })
    .from(guests)
    .where(eq(guests.id, guestId));
  return guest?.humanVerified ?? false;
}
