import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '男友模拟器 - 和你的纸片人男友聊天',
  description: '选择你的虚拟男友，体验沉浸式恋爱聊天',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
