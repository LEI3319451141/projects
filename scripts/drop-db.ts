import dotenv from 'dotenv';
import { Pool } from 'pg';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// 加载 .env.local
dotenv.config({ path: '.env.local' });

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return answer === 'yes' || answer === 'y';
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  console.log('⚠️  This will DROP ALL TABLES and DATA in the database.');
  const ok = await confirm('Type "yes" to confirm: ');
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Dropping existing tables...');
    // CASCADE 删除所有相关表，包括外键依赖
    await pool.query(`
      DROP TABLE IF EXISTS chat_messages CASCADE;
      DROP TABLE IF EXISTS chat_sessions CASCADE;
      DROP TABLE IF EXISTS guests CASCADE;
    `);
    console.log('✅ All tables dropped successfully.');
  } catch (err) {
    console.error('❌ Error dropping tables:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
