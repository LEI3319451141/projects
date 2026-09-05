import { AdminShell } from '@/components/admin/admin-shell';

export const metadata = {
  title: '管理后台 - 男友模拟器',
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminShell>{children}</AdminShell>;
}
