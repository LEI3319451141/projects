import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * 游客表：匿名用户标识（后台用户管理复用此表）
 */
export const guests = pgTable('guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  nickname: varchar('nickname', { length: 50 }),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active | banned
  humanVerified: boolean('human_verified').default(false).notNull(), // Cloudflare Turnstile 验证通过
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
});

/**
 * 聊天会话表：一个游客 + 一个角色 = 一个会话
 */
export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    characterId: varchar('character_id', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // 一个游客对一个角色只能有一个会话
    uniqueIndex('chat_sessions_guest_character_idx').on(
      table.guestId,
      table.characterId,
    ),
    index('chat_sessions_guest_idx').on(table.guestId),
  ],
);

/**
 * 聊天消息表：会话下的每条消息
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    photoUrl: text('photo_url'),
    audioUrl: text('audio_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('chat_messages_session_idx').on(table.sessionId),
    index('chat_messages_created_idx').on(table.createdAt),
  ],
);

/**
 * 订单表：后台订单管理
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull().default('0'),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | paid | shipped | completed | cancelled
    remark: text('remark'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('orders_guest_idx').on(table.guestId),
    index('orders_status_idx').on(table.status),
    index('orders_created_idx').on(table.createdAt),
  ],
);

/**
 * 关系定义（方便 Drizzle 查询时使用）
 */
export const guestsRelations = relations(guests, ({ many }) => ({
  sessions: many(chatSessions),
  orders: many(orders),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  guest: one(guests, {
    fields: [chatSessions.guestId],
    references: [guests.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  guest: one(guests, {
    fields: [orders.guestId],
    references: [guests.id],
  }),
}));

/**
 * TypeScript 类型导出
 */
export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
