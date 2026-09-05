import { sql, gte, and } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';

const { guests, orders } = schema;

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [userTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(guests);
  const [userRecent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(guests)
    .where(gte(guests.createdAt, sevenDaysAgo));

  const [orderTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
  const [orderRecent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(gte(orders.createdAt, sevenDaysAgo));

  const [revenueTotal] = await db
    .select({ total: sql<string>`COALESCE(sum(amount), '0')` })
    .from(orders)
    .where(sql`${orders.status} = 'paid'`);

  const [revenueRecent] = await db
    .select({ total: sql<string>`COALESCE(sum(amount), '0')` })
    .from(orders)
    .where(and(gte(orders.createdAt, sevenDaysAgo), sql`${orders.status} = 'paid'`));

  const stats = [
    {
      title: '用户总数',
      value: (userTotal?.count ?? 0).toLocaleString(),
      recent: `近7天 +${userRecent?.count ?? 0}`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: '订单总数',
      value: (orderTotal?.count ?? 0).toLocaleString(),
      recent: `近7天 +${orderRecent?.count ?? 0}`,
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: '总成交额',
      value: `¥${Number(revenueTotal?.total ?? 0).toLocaleString()}`,
      recent: `近7天 ¥${Number(revenueRecent?.total ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">概览</h2>
        <p className="text-sm text-slate-500">运营数据总览</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="mt-1 flex items-center text-xs text-slate-500">
                <TrendingUp className="mr-1 h-3 w-3" />
                {stat.recent}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
