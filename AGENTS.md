# 男友模拟器 - 项目文档

## 项目概览
虚拟男友聊天模拟器，提供沉浸式恋爱聊天体验。用户从四个男友角色中选择一个，进入微信风格聊天界面，支持文字、语音、图片互动。

## 版本技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: 微信风格自定义组件 + Tailwind CSS 4
- **AI SDK**: coze-coding-dev-sdk (LLM + TTS + Image Generation + Web Search)
- **持久化**: localStorage (游客ID + 聊天记录)

## 目录结构
```
├── public/
│   └── avatars/              # 四个角色头像
│       ├── chuying.jpeg
│       ├── wuming.jpeg
│       ├── yedan.jpeg
│       └── honglang.jpeg
├── src/
│   ├── app/
│   │   ├── page.tsx          # 角色选择页（2x2卡片网格）
│   │   ├── layout.tsx        # 全局布局
│   │   ├── globals.css       # 全局样式 + 动画
│   │   ├── chat/[id]/page.tsx # 聊天页面（微信风格）
│   │   └── api/
│   │       ├── chat/route.ts     # 流式LLM对话（含角色人设+搜索）
│   │       ├── tts/route.ts      # 语音合成（角色专属声线）
│   │       ├── generate-image/route.ts  # 图片生成
│   │       └── search/route.ts   # 联网搜索
│   └── lib/
│       ├── characters.ts     # 角色配置（人设、声线、图片prompt）
│       └── utils.ts          # 工具函数
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 构建与测试命令
- 开发：`pnpm dev`
- 构建：`pnpm build`
- 类型检查：`pnpm ts-check`
- Lint：`pnpm lint --quiet`
- 启动生产：`pnpm start`

## 核心架构

### 角色系统
- 四个男友角色：褚嬴、无名、液氮、红狼
- 每个角色有独立的 systemPrompt、voiceId、imagePrompt、themeColor
- 角色配置在 `src/lib/characters.ts`

### 聊天流程
1. 用户发消息 → `/api/chat`（流式SSE返回）
2. LLM回复中包含 `[SEND_PHOTO: 描述]` 标记时，前端解析并调用 `/api/generate-image`
3. 每条文字回复异步调用 `/api/tts` 生成语音
4. 搜索功能：当需要实时信息时，`/api/chat` 内部先调用 `/api/search` 获取上下文

### 持久化
- 游客ID：首次访问自动生成，存于 `localStorage.guest_id`
- 聊天记录：`localStorage.chat_{guestId}_{characterId}`
- 刷新不丢失，换设备则重新开始

## API 接口

### POST /api/chat
- 请求：`{ characterId, messages: [{role, content}], searchQuery? }`
- 响应：SSE流 `data: {content: "文字"}\n\n`

### POST /api/tts
- 请求：`{ text, characterId }`
- 响应：`{ audioUrl, audioSize }`

### POST /api/generate-image
- 请求：`{ prompt, characterId }`
- 响应：`{ imageUrl }`

### POST /api/search
- 请求：`{ query }`
- 响应：`{ summary, results: [{title, url, snippet}] }`

## 开发规范

### 编码规范
- TypeScript strict 模式，禁止隐式 any
- 函数参数必须有类型标注
- 优先使用已有变量和导入，不引用未声明标识符

### Hydration 防范
- 使用 'use client' + useEffect + useState 处理客户端状态
- 禁止在 JSX 中直接使用 typeof window / Date.now() / Math.random()
- 禁止使用 head 标签，使用 metadata

### next.config 规范
- 路径使用 path.resolve(__dirname, ...) 动态拼接

## UI 设计规范
- 微信聊天风格：用户绿气泡(右)，男友白气泡(左)
- 主色 #07C160，背景 #EDEDED，文字 #333333/#888888
- 圆角气泡12px，卡片16px，头像圆形
- 动画：slideUp 0.2s, fadeIn 0.3s, 打字指示器脉冲
