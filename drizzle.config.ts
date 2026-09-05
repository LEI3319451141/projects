import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// 优先加载 .env.local（drizzle-kit 默认只读 .env，需显式指定）
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/lib/db/schema.ts', // schema 文件位置
  out: './drizzle', // 迁移文件输出目录
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
