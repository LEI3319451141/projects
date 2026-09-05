'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { Search, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';

interface OrderItem {
  id: string;
  guestId: string;
  amount: string;
  status: string;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  guestNickname: string | null;
  guestEmail: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '待支付', variant: 'secondary' as const },
  { value: 'paid', label: '已支付', variant: 'default' as const },
  { value: 'shipped', label: '已发货', variant: 'outline' as const },
  { value: 'completed', label: '已完成', variant: 'default' as const },
  { value: 'cancelled', label: '已取消', variant: 'destructive' as const },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOrdersPage() {
  const [list, setList] = useState<OrderItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 详情弹窗
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  // 编辑弹窗
  const [editOrder, setEditOrder] = useState<OrderItem | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/admin/api/orders?${params}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setList(data.list);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleSearch() {
    setPagination((p) => ({ ...p, page: 1 }));
    fetchOrders();
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  }

  function getStatusBadge(status: string) {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    if (!opt) return <Badge>{status}</Badge>;
    return <Badge variant={opt.variant}>{opt.label}</Badge>;
  }

  function openEdit(order: OrderItem) {
    setEditOrder(order);
    setEditStatus(order.status);
  }

  async function saveEdit() {
    if (!editOrder) return;
    setSaving(true);
    try {
      const res = await fetch(`/admin/api/orders/${editOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? '更新失败');
      }
      toast.success('订单状态已更新');
      setEditOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">订单管理</h2>
        <p className="text-sm text-slate-500">管理平台订单</p>
      </div>

      {/* 搜索筛选区 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="搜索订单号、用户昵称或邮箱"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleSearch}>
          搜索
        </Button>
      </div>

      {/* 表格 */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">订单号</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Empty className="py-8" />
                </TableCell>
              </TableRow>
            ) : (
              list.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{order.guestNickname ?? '-'}</div>
                      <div className="text-xs text-slate-500">{order.guestEmail ?? '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    ¥{Number(order.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(order)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {!loading && !error && list.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages || 1} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
            <DialogDescription>订单完整信息</DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-3 py-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">订单号</span>
                <span className="font-mono text-sm">{detailOrder.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">用户</span>
                <span className="text-sm">
                  {detailOrder.guestNickname ?? '-'}（{detailOrder.guestEmail ?? '-'}）
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">金额</span>
                <span className="font-medium">¥{Number(detailOrder.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">状态</span>
                {getStatusBadge(detailOrder.status)}
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">创建时间</span>
                <span className="text-sm">{formatDate(detailOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-slate-500">更新时间</span>
                <span className="text-sm">{formatDate(detailOrder.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">备注</span>
                <span className="text-sm">{detailOrder.remark ?? '-'}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOrder(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={!!editOrder} onOpenChange={(open) => !open && setEditOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑订单状态</DialogTitle>
            <DialogDescription>
              修改订单 {editOrder?.id.slice(0, 8)}... 的状态
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={editStatus} onValueChange={setEditStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrder(null)} disabled={saving}>
              取消
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
