'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCharacterById, type Character } from '@/lib/characters';
import { getChatTheme, type ChatTheme } from '@/lib/chat-themes';

interface ChatMessage {
  id: string;
  dbId?: string; // 数据库中的消息 ID，用于 PATCH 更新媒体
  role: 'user' | 'assistant';
  type: 'text' | 'image' | 'voice';
  content: string;
  audioUrl?: string;
  imageUrl?: string;
  timestamp: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * 获取或创建游客 ID（UUID），持久化到 localStorage
 */
async function getGuestId(): Promise<string> {
  if (typeof window === 'undefined') return '';
  const guestId = localStorage.getItem('guest_id');
  if (guestId) {
    // 验证 guest 仍有效
    try {
      const res = await fetch(`/api/guest?id=${guestId}`);
      if (res.ok) return guestId;
    } catch {
      // 网络错误则继续用旧 ID
      return guestId;
    }
  }
  // 创建新游客
  try {
    const res = await fetch('/api/guest', { method: 'POST' });
    const data = (await res.json()) as { guestId: string };
    if (data.guestId) {
      localStorage.setItem('guest_id', data.guestId);
      return data.guestId;
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * 从数据库加载历史消息
 */
async function loadMessages(guestId: string, characterId: string): Promise<ChatMessage[]> {
  if (!guestId) return [];
  try {
    const res = await fetch(
      `/api/messages?guestId=${guestId}&characterId=${characterId}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      messages: {
        id: string;
        role: string;
        content: string;
        photoUrl: string | null;
        audioUrl: string | null;
        createdAt: string;
      }[];
    };
    const result: ChatMessage[] = [];
    for (const m of data.messages) {
      // 兼容旧数据：如果 content 含 PHOTO 标记，拆分为文本+图片消息
      const photoMatches = [...m.content.matchAll(/\[SEND_PHOTO:\s*([^\]]+)\]/g)];
      if (photoMatches.length > 0 && m.photoUrl === null) {
        const cleanText = m.content.replace(/\[SEND_PHOTO:\s*[^\]]+\]/g, '').trim();
        // 文本部分
        if (cleanText) {
          result.push({
            id: m.id,
            dbId: m.id,
            role: m.role as 'user' | 'assistant',
            type: 'text',
            content: cleanText,
            audioUrl: m.audioUrl || undefined,
            timestamp: new Date(m.createdAt).getTime(),
          });
        }
        // 图片部分
        photoMatches.forEach((match, idx) => {
          result.push({
            id: `${m.id}_img_${idx}`,
            role: m.role as 'user' | 'assistant',
            type: 'image',
            content: match[1].trim(),
            timestamp: new Date(m.createdAt).getTime() + idx + 1,
          });
        });
      } else {
        // 正常消息
        result.push({
          id: m.id,
          dbId: m.id,
          role: m.role as 'user' | 'assistant',
          // photoUrl 不为 null 即为图片消息（空字符串表示生成中）
          type: m.photoUrl !== null ? 'image' : 'text',
          content: m.content,
          audioUrl: m.audioUrl || undefined,
          imageUrl: m.photoUrl || undefined,
          timestamp: new Date(m.createdAt).getTime(),
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * 更新数据库中消息的媒体 URL
 */
async function patchMessageMedia(
  dbId: string,
  fields: { photoUrl?: string; audioUrl?: string },
): Promise<void> {
  try {
    await fetch(`/api/messages/${dbId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
  } catch {
    // ignore
  }
}

const PHOTO_REGEX = /\[SEND_PHOTO:\s*([^\]]+)\]/g;

// Keywords that suggest the user is asking about real-time or factual information
const SEARCH_KEYWORDS = [
  '天气', '新闻', '今天', '最近', '最新', '现在', '目前', '当前',
  '什么时候', '多少钱', '怎么去', '在哪里', '哪家', '好不好',
  '推荐', '排行', '热门', '流行', '上映', '播出', '发布',
  '比赛', '比分', '赢了', '输了', '冠军', '赛季',
  '疫情', '政策', '放假', '调休', '节日', '节气',
];

function needsSearch(text: string): boolean {
  return SEARCH_KEYWORDS.some((kw) => text.includes(kw));
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.id as string;
  const [character, setCharacter] = useState<Character | null>(null);
  const [theme, setTheme] = useState<ChatTheme | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [mounted, setMounted] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const guestIdRef = useRef<string>('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initialize
  useEffect(() => {
    async function init() {
      const char = getCharacterById(characterId);
      if (!char) {
        router.push('/');
        return;
      }
      setCharacter(char);
      setTheme(getChatTheme(characterId));

      // 获取/创建游客 ID 并缓存
      const guestId = await getGuestId();
      guestIdRef.current = guestId;

      // 从数据库加载历史消息
      const saved = guestId
        ? await loadMessages(guestId, characterId)
        : [];

      if (saved.length === 0) {
        // 首次对话，显示欢迎消息（仅前端展示，不入库）
        const welcomeMessages: ChatMessage[] = [
          {
            id: generateId(),
            role: 'assistant',
            type: 'text',
            content: getWelcomeMessage(char.name),
            timestamp: Date.now(),
          },
        ];
        setMessages(welcomeMessages);
      } else {
        setMessages(saved);
      }
      setMounted(true);
    }
    init();
  }, [characterId, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  function getWelcomeMessage(name: string): string {
    switch (name) {
      case '褚嬴':
        return '你好呀~我是褚嬴，很高兴认识你。今天想聊些什么呢？我刚从棋馆回来，可以陪你聊聊天~';
      case '无名':
        return '...你好。我是无名。没什么好说的，但如果你愿意，我可以听你说话。';
      case '液氮':
        return '你好，我是加布里埃尔·默里尔，代号液氮。不过你可以叫我的名字...有什么想聊的吗？';
      case '红狼':
        return '嘿！你好呀！我是红狼，不过你可以叫我凯~ 很高兴见到你！今天过得怎么样？';
      default:
        return '你好~ 很高兴认识你！';
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isLoading || !character) return;

    setInputText('');
    setIsLoading(true);
    setStreamingText('');

    // 获取 guestId（优先用缓存）
    const guestId = guestIdRef.current || (await getGuestId());
    guestIdRef.current = guestId;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      type: 'text',
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const chatMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const shouldSearch = needsSearch(text);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          messages: chatMessages,
          ...(guestId ? { guestId } : {}),
          ...(shouldSearch ? { searchQuery: text } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API error');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullText = '';
      let savedAssistantId: string | null = null;
      let savedImageMsgIds: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                // 捕获后端保存的消息 ID
                if (data.assistantMsgId) savedAssistantId = data.assistantMsgId;
                if (data.imageMsgIds) savedImageMsgIds = data.imageMsgIds;
                continue;
              }
              if (data.error) {
                fullText += ' [回复出错，请重试]';
                continue;
              }
              if (data.content) {
                fullText += data.content;
                setStreamingText(fullText);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Parse photo markers
      const photoDescriptions: string[] = [];
      const cleanText = fullText.replace(PHOTO_REGEX, (_match, desc) => {
        photoDescriptions.push(desc.trim());
        return '';
      }).trim();

      setStreamingText('');

      const assistantMsg: ChatMessage = {
        id: generateId(),
        dbId: savedAssistantId || undefined,
        role: 'assistant',
        type: 'text',
        content: cleanText,
        timestamp: Date.now(),
      };

      let allNewMessages = [...updatedMessages, assistantMsg];

      // Generate TTS for the text (async, don't block)
      generateTTS(cleanText, characterId, assistantMsg.id).then((audioUrl) => {
        if (audioUrl) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, audioUrl } : m,
            ),
          );
          // 同步更新数据库
          if (assistantMsg.dbId) {
            patchMessageMedia(assistantMsg.dbId, { audioUrl });
          }
        }
      });

      // Generate images if any
      for (let i = 0; i < photoDescriptions.length; i++) {
        const desc = photoDescriptions[i];
        const imageMsgDbId = savedImageMsgIds[i]; // 后端返回的对应图片消息 DB ID
        const imageMsg: ChatMessage = {
          id: generateId(),
          dbId: imageMsgDbId || undefined,
          role: 'assistant',
          type: 'image',
          content: desc,
          timestamp: Date.now() + 1,
        };
        allNewMessages = [...allNewMessages, imageMsg];
        setMessages(allNewMessages);

        generateImage(desc, characterId).then((imageUrl) => {
          if (imageUrl) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === imageMsg.id ? { ...m, imageUrl } : m,
              ),
            );
            // 保存图片 URL 到数据库，确保退出后仍能显示
            if (imageMsg.dbId) {
              patchMessageMedia(imageMsg.dbId, { photoUrl: imageUrl });
            }
          }
        });
      }

      setMessages(allNewMessages);
    } catch (error) {
      console.error('Send message error:', error);
      setStreamingText('');
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        type: 'text',
        content: '抱歉，我暂时无法回复，请稍后再试~',
        timestamp: Date.now(),
      };
      const withError = [...updatedMessages, errorMsg];
      setMessages(withError);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateTTS(
    text: string,
    charId: string,
    _msgId: string
  ): Promise<string | null> {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, characterId: charId }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { audioUrl?: string };
      return data.audioUrl || null;
    } catch {
      return null;
    }
  }

  async function generateImage(
    prompt: string,
    charId: string
  ): Promise<string | null> {
    try {
      const character = getCharacterById(charId);
      const basePrompt = character?.imagePrompt || '';
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: basePrompt ? `${basePrompt}，${prompt}` : prompt,
          characterId: charId,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { imageUrl?: string };
      return data.imageUrl || null;
    } catch {
      return null;
    }
  }

  function playAudio(audioUrl: string, msgId: string) {
    // Stop any currently playing audio
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    const audio = new Audio(audioUrl);
    audioRefs.current.set(msgId, audio);

    setPlayingAudioId(msgId);
    audio.play().catch(console.error);
    audio.onended = () => {
      setPlayingAudioId(null);
    };
    audio.onerror = () => {
      setPlayingAudioId(null);
    };
  }

  function stopAudio() {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    setPlayingAudioId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  if (!mounted || !character || !theme) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#EDEDED' }}>
        <div className="text-[#888888]">加载中...</div>
      </div>
    );
  }

  // 使用主题中的 isDark 属性
  const isDarkTheme = theme.isDark;
  const textPrimary = isDarkTheme ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDarkTheme ? '#A1A1A6' : '#86868B';
  const textTertiary = isDarkTheme ? '#636366' : '#AEAEB2';
  const avatarBg = isDarkTheme ? '#3A3A3C' : '#07C160';

  return (
    <div
      className="h-screen flex flex-col max-w-[480px] mx-auto relative"
      style={{ backgroundColor: theme.pageBg }}
    >
      {/* 角色专属装饰背景 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: theme.decorativeGradient }}
      />

      {/* Top Nav - Apple frosted glass */}
      <div
        className="apple-frost flex items-center px-4 py-3 border-b shrink-0 relative z-20"
        style={{
          backgroundColor: theme.headerBg,
          borderColor: isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}
      >
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: textPrimary }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <img
              src={character.avatar}
              alt={character.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-base font-medium" style={{ color: textPrimary }}>
              {character.name}
            </span>
          </div>
          {theme.vibeLabel && (
            <span
              className="text-[10px] mt-0.5 tracking-wider"
              style={{ color: textSecondary }}
            >
              {theme.vibeLabel}
            </span>
          )}
        </div>
        <div className="w-8" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-messages px-4 py-5 space-y-4 relative z-10">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-slide-up">
            {msg.role === 'user' ? (
              /* User message - right side, theme-colored bubble */
              <div className="flex items-start justify-end gap-2">
                <div className="max-w-[70%]">
                  <div
                    className="px-4 py-2.5 text-[15px] break-words whitespace-pre-wrap apple-shadow-sm"
                    style={{
                      backgroundColor: theme.userBubble,
                      color: theme.userBubbleText,
                      borderRadius: '20px 6px 20px 20px',
                    }}
                  >
                    {msg.content}
                  </div>
                  <div className="text-[10px] text-right mt-0.5" style={{ color: textTertiary }}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: avatarBg, color: '#FFFFFF' }}
                >
                  我
                </div>
              </div>
            ) : (
              /* Assistant message - left side, theme-colored bubble */
              <div className="flex items-start gap-2">
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
                <div className="max-w-[70%]">
                  {msg.type === 'image' ? (
                    /* Image message */
                    <div>
                      {msg.imageUrl ? (
                        <img
                          src={msg.imageUrl}
                          alt="照片"
                          className="msg-image"
                          loading="lazy"
                          onClick={() => setPreviewImage(msg.imageUrl!)}
                        />
                      ) : (
                        <div className="w-[140px] h-[140px] rounded-lg flex items-center justify-center" style={{ backgroundColor: isDarkTheme ? '#2C2C2C' : '#F0F0F0' }}>
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className="w-6 h-6 border-2 rounded-full animate-spin"
                              style={{ borderColor: isDarkTheme ? '#555' : '#CCCCCC', borderTopColor: theme.userBubble }}
                            />
                            <div className="text-xs" style={{ color: textTertiary }}>
                              照片生成中...
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Text message */
                    <div>
                      <div
                        className="px-4 py-2.5 text-[15px] break-words whitespace-pre-wrap border apple-shadow-sm"
                        style={{
                          backgroundColor: theme.assistantBubble,
                          color: textPrimary,
                          borderColor: theme.assistantBorder,
                          borderRadius: '6px 20px 20px 20px',
                        }}
                      >
                        {msg.content}
                      </div>
                      {/* Voice play button */}
                      {msg.audioUrl && (
                        <button
                          onClick={() => {
                            if (playingAudioId === msg.id) {
                              stopAudio();
                            } else {
                              playAudio(msg.audioUrl!, msg.id);
                            }
                          }}
                          className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors"
                          style={{
                            color: playingAudioId === msg.id ? '#FFFFFF' : theme.voiceBtn,
                            backgroundColor:
                              playingAudioId === msg.id
                                ? theme.voiceBtn
                                : `${theme.voiceBtn}20`,
                          }}
                        >
                          {playingAudioId === msg.id ? (
                            <>
                              {/* Pause icon */}
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                              </svg>
                              <span>停止播放</span>
                              {/* Sound wave animation */}
                              <span className="flex items-center gap-0.5 ml-1">
                                <span className="voice-bar w-0.5 bg-white rounded-full" style={{ height: '6px', animationDelay: '0s' }} />
                                <span className="voice-bar w-0.5 bg-white rounded-full" style={{ height: '10px', animationDelay: '0.15s' }} />
                                <span className="voice-bar w-0.5 bg-white rounded-full" style={{ height: '8px', animationDelay: '0.3s' }} />
                              </span>
                            </>
                          ) : (
                            <>
                              {/* Play icon */}
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                              <span>播放语音</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="text-[10px] mt-0.5" style={{ color: textTertiary }}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming text */}
        {streamingText && (
          <div className="flex items-start gap-2 animate-fade-in">
            <img
              src={character.avatar}
              alt={character.name}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div
              className="px-4 py-2.5 text-[15px] max-w-[70%] break-words whitespace-pre-wrap border apple-shadow-sm"
              style={{
                backgroundColor: theme.assistantBubble,
                color: textPrimary,
                borderColor: theme.assistantBorder,
                borderRadius: '6px 20px 20px 20px',
              }}
            >
              {streamingText}
              <span
                className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
                style={{ backgroundColor: textPrimary }}
              />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && !streamingText && (
          <div className="flex items-start gap-2 animate-fade-in">
            <img
              src={character.avatar}
              alt={character.name}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div
              className="px-4 py-3 flex items-center gap-1 border apple-shadow-sm"
              style={{
                backgroundColor: theme.assistantBubble,
                borderColor: theme.assistantBorder,
                borderRadius: '6px 20px 20px 20px',
              }}
            >
              <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: theme.typingDot }} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: theme.typingDot }} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: theme.typingDot }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar - Apple frosted glass */}
      <div
        className="apple-frost shrink-0 border-t px-4 py-2.5 flex items-end gap-2 relative z-20"
        style={{
          backgroundColor: theme.inputBarBg,
          borderColor: isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-[20px] text-[15px] outline-none border transition-all duration-200 disabled:opacity-50"
          style={{
            backgroundColor: isDarkTheme ? '#2C2C2C' : '#FFFFFF',
            color: textPrimary,
            borderColor: isDarkTheme ? '#444' : '#E5E5E5',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = theme.inputFocus;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = isDarkTheme ? '#444' : '#E5E5E5';
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 apple-shadow-md"
          style={{
            backgroundColor:
              isLoading || !inputText.trim() ? '#CCCCCC' : theme.sendButton,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="预览"
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
