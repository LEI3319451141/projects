import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 插入测试用户（guests 表）
    const users = [
      { nickname: '林小雅', email: 'linxiaoya@example.com', status: 'active' },
      { nickname: '陈默', email: 'chenmo@example.com', status: 'active' },
      { nickname: '苏雨晴', email: 'suyuqing@example.com', status: 'banned' },
      { nickname: '周子轩', email: 'zhouzixuan@example.com', status: 'active' },
      { nickname: '王梓涵', email: 'wangzihan@example.com', status: 'active' },
    ];

    const insertedUsers = [];
    for (const user of users) {
      const res = await pool.query(
        `INSERT INTO guests (nickname, email, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id`,
        [user.nickname, user.email, user.status],
      );
      if (res.rows.length > 0) {
        insertedUsers.push(res.rows[0].id);
      } else {
        // 已存在则查出来
        const existing = await pool.query(`SELECT id FROM guests WHERE email = $1`, [user.email]);
        if (existing.rows.length > 0) insertedUsers.push(existing.rows[0].id);
      }
    }

    // 插入测试订单
    const orders = [
      { amount: '99.00', status: 'paid', remark: '月度会员' },
      { amount: '199.00', status: 'pending', remark: '季度会员' },
      { amount: '59.00', status: 'shipped', remark: '语音包' },
      { amount: '299.00', status: 'completed', remark: '年度会员' },
      { amount: '39.00', status: 'cancelled', remark: '表情包' },
      { amount: '149.00', status: 'paid', remark: '钻石充值' },
      { amount: '88.00', status: 'pending', remark: '头像框' },
    ];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const guestId = insertedUsers[i % insertedUsers.length];
      await pool.query(
        `INSERT INTO orders (guest_id, amount, status, remark) VALUES ($1, $2, $3, $4)`,
        [guestId, order.amount, order.status, order.remark],
      );
    }

    console.log(`✅ Seed 完成：${insertedUsers.length} 个用户，${orders.length} 个订单`);
  } catch (err) {
    console.error('❌ Seed 失败:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
