'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, User, Lock, ArrowLeft, Loader2 } from 'lucide-react';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 已登录直接跳首页
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace('/');
      })
      .catch(() => {});
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload: Record<string, string> = { username, password };
      if (mode === 'register' && nickname) payload.nickname = nickname;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '请求失败');
        return;
      }
      // 登录成功，跳回首页
      router.replace('/');
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 50%, #f0f2f5 100%)',
      }}
    >
      {/* 装饰光斑 */}
      <div className="absolute top-[-120px] left-[-80px] w-[300px] h-[300px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #07C160 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-100px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #4CC9F0 0%, transparent 70%)' }} />

      {/* 返回 */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 flex items-center gap-1 text-[#666] hover:text-[#333] text-sm z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* 卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[380px] rounded-[24px] p-[2px] z-10"
      >
        {/* 渐变边框 */}
        <div className="absolute inset-0 rounded-[24px] opacity-40"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.4))',
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '2px',
          }}
        />

        {/* 毛玻璃主体 */}
        <div
          className="rounded-[24px] p-7 backdrop-blur-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.72)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08)',
          }}
        >
          {/* Logo 标题 */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-3"
              style={{
                background: 'linear-gradient(135deg, #07C160, #1AB36A)',
                boxShadow: '0 6px 16px rgba(7,193,96,0.35)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10z" fill="white" />
              </svg>
            </div>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a] tracking-tight">
              {mode === 'login' ? '欢迎回来' : '创建账号'}
            </h1>
            <p className="text-[13px] text-[#888] mt-1">
              {mode === 'login' ? '登录后与男友继续聊天' : '注册即可跳过人机验证'}
            </p>
          </div>

          {/* 模式切换 */}
          <div
            className="relative flex rounded-[12px] p-1 mb-6"
            style={{ background: 'rgba(0,0,0,0.05)' }}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px]"
              style={{
                background: 'white',
                left: mode === 'login' ? '4px' : 'calc(50% + 0px)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            />
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`relative flex-1 text-[13px] font-medium py-2 transition-colors ${
                  mode === m ? 'text-[#1a1a1a]' : 'text-[#999]'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          {/* 表单 */}
          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* 用户名 */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbb]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名"
                autoComplete="username"
                required
                className="w-full h-11 pl-10 pr-3 rounded-[12px] text-[14px] text-[#1a1a1a] placeholder:text-[#bbb] outline-none transition-all"
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#07C160';
                  e.currentTarget.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                }}
              />
            </div>

            {/* 昵称（注册才显示） */}
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 44 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative overflow-hidden"
                >
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="昵称（可选）"
                    className="w-full h-11 px-3 rounded-[12px] text-[14px] text-[#1a1a1a] placeholder:text-[#bbb] outline-none transition-all"
                    style={{
                      background: 'rgba(0,0,0,0.03)',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#07C160';
                      e.currentTarget.style.background = 'white';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                      e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 密码 */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbb]" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                className="w-full h-11 pl-10 pr-10 rounded-[12px] text-[14px] text-[#1a1a1a] placeholder:text-[#bbb] outline-none transition-all"
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#07C160';
                  e.currentTarget.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#888]"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[13px] text-[#e03e3e] text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-11 rounded-[12px] text-white text-[15px] font-medium mt-2 transition-all disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #07C160, #1AB36A)',
                boxShadow: '0 4px 12px rgba(7,193,96,0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : mode === 'login' ? (
                '登录'
              ) : (
                '注册'
              )}
            </button>
          </form>

          {/* 底部提示 */}
          <div className="mt-5 text-center text-[12px] text-[#999]">
            {mode === 'login' ? (
              <>
                还没有账号？
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  className="text-[#07C160] font-medium ml-1 hover:underline"
                >
                  去注册
                </button>
              </>
            ) : (
              <>
                已有账号？
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-[#07C160] font-medium ml-1 hover:underline"
                >
                  去登录
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <p className="mt-6 text-[12px] text-[#aaa] z-10">
        账号仅保存在本服务，用于识别你的聊天记录
      </p>
    </div>
  );
}
