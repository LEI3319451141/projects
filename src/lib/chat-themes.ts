/**
 * 角色对话页面专属主题配置 - Apple 级设计
 * 每个角色的视觉风格与人物特点匹配，配色精致、低饱和、高级感
 */
export interface ChatTheme {
  /** 页面整体背景色 */
  pageBg: string;
  /** 顶部导航栏背景色（半透明，配合 frosted glass） */
  headerBg: string;
  /** 用户气泡背景色 */
  userBubble: string;
  /** 用户气泡文字颜色 */
  userBubbleText: string;
  /** AI 气泡背景色 */
  assistantBubble: string;
  /** AI 气泡边框色（点缀） */
  assistantBorder: string;
  /** 发送按钮背景色 */
  sendButton: string;
  /** 输入框聚焦边框色 */
  inputFocus: string;
  /** 输入框容器背景色（半透明） */
  inputBarBg: string;
  /** 装饰性背景渐变（CSS） */
  decorativeGradient: string;
  /** 语音播放按钮颜色 */
  voiceBtn: string;
  /** 打字指示器颜色 */
  typingDot: string;
  /** 流光标签（角色气质关键词） */
  vibeLabel: string;
  /** 暗色主题 */
  isDark: boolean;
}

export const chatThemes: Record<string, ChatTheme> = {
  chuying: {
    // 褚嬴 - 千年棋魂，温润象牙，水墨意境
    pageBg: '#F5F0E8',
    headerBg: 'rgba(245, 240, 232, 0.85)',
    userBubble: '#8B7355',
    userBubbleText: '#FFFFFF',
    assistantBubble: 'rgba(255, 253, 247, 0.92)',
    assistantBorder: 'rgba(212, 197, 160, 0.6)',
    sendButton: '#8B7355',
    inputFocus: '#8B7355',
    inputBarBg: 'rgba(237, 230, 216, 0.85)',
    decorativeGradient:
      'radial-gradient(circle at 20% 25%, rgba(139,115,85,0.07) 0%, transparent 50%), radial-gradient(circle at 80% 75%, rgba(180,160,120,0.05) 0%, transparent 50%)',
    voiceBtn: '#8B7355',
    typingDot: '#B8A88A',
    vibeLabel: '千年棋魂 · 温润如玉',
    isDark: false,
  },
  wuming: {
    // 无名 - 沉默猎手，深邃暗灰，T7 面罩暖橙
    pageBg: '#1C1C1E',
    headerBg: 'rgba(28, 28, 30, 0.85)',
    userBubble: '#E87830',
    userBubbleText: '#FFFFFF',
    assistantBubble: 'rgba(44, 44, 46, 0.92)',
    assistantBorder: 'rgba(232, 120, 48, 0.3)',
    sendButton: '#E87830',
    inputFocus: '#E87830',
    inputBarBg: 'rgba(34, 34, 36, 0.85)',
    decorativeGradient:
      'radial-gradient(circle at 15% 20%, rgba(232,120,48,0.08) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(100,100,100,0.06) 0%, transparent 50%)',
    voiceBtn: '#E87830',
    typingDot: '#636366',
    vibeLabel: '沉默猎手 · 暗夜独行',
    isDark: true,
  },
  yedan: {
    // 液氮 - 极寒之心，冰蓝通透，技术理性
    pageBg: '#EDF2F7',
    headerBg: 'rgba(237, 242, 247, 0.85)',
    userBubble: '#5B8FB0',
    userBubbleText: '#FFFFFF',
    assistantBubble: 'rgba(247, 251, 255, 0.92)',
    assistantBorder: 'rgba(184, 212, 227, 0.6)',
    sendButton: '#5B8FB0',
    inputFocus: '#5B8FB0',
    inputBarBg: 'rgba(220, 232, 240, 0.85)',
    decorativeGradient:
      'radial-gradient(circle at 25% 20%, rgba(91,143,176,0.09) 0%, transparent 45%), radial-gradient(circle at 75% 80%, rgba(184,212,227,0.07) 0%, transparent 50%)',
    voiceBtn: '#5B8FB0',
    typingDot: '#8FB5CC',
    vibeLabel: '极寒之心 · 沉稳克制',
    isDark: false,
  },
  honglang: {
    // 红狼 - 铁血孤狼，暖暗砖红，军事质感
    pageBg: '#2A1815',
    headerBg: 'rgba(42, 24, 21, 0.85)',
    userBubble: '#C8402A',
    userBubbleText: '#FFFFFF',
    assistantBubble: 'rgba(61, 34, 24, 0.92)',
    assistantBorder: 'rgba(200, 64, 42, 0.3)',
    sendButton: '#C8402A',
    inputFocus: '#C8402A',
    inputBarBg: 'rgba(42, 24, 21, 0.85)',
    decorativeGradient:
      'radial-gradient(circle at 20% 25%, rgba(200,64,42,0.1) 0%, transparent 45%), radial-gradient(circle at 80% 75%, rgba(139,37,0,0.06) 0%, transparent 50%)',
    voiceBtn: '#C8402A',
    typingDot: '#8B5A4A',
    vibeLabel: '铁血孤狼 · 温柔守护',
    isDark: true,
  },
};

/** 默认主题（无匹配角色时使用） */
export const defaultChatTheme: ChatTheme = {
  pageBg: '#EDEDED',
  headerBg: 'rgba(237, 237, 237, 0.85)',
  userBubble: '#07C160',
  userBubbleText: '#FFFFFF',
  assistantBubble: 'rgba(255, 255, 255, 0.92)',
  assistantBorder: 'rgba(229, 229, 229, 0.6)',
  sendButton: '#07C160',
  inputFocus: '#07C160',
  inputBarBg: 'rgba(247, 247, 247, 0.85)',
  decorativeGradient: 'none',
  voiceBtn: '#07C160',
  typingDot: '#999999',
  vibeLabel: '',
  isDark: false,
};

export function getChatTheme(characterId: string): ChatTheme {
  return chatThemes[characterId] || defaultChatTheme;
}
