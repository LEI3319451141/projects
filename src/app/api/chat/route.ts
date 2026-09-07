import { NextRequest } from "next/server";
import { getCharacterById } from "@/lib/characters";
import { getOrCreateSession, addMessage, isGuestVerified } from "@/lib/db/queries";

type ChatMessage = { role: string; content: string };

export async function POST(request: NextRequest) {
  try {
    const { messages, characterId, guestId } = (await request.json()) as {
      messages: ChatMessage[];
      characterId: string;
      searchQuery?: string;
      guestId?: string;
    };

    // 人机验证检查：未验证的游客拒绝访问聊天 API
    if (guestId) {
      try {
        const verified = await isGuestVerified(guestId);
        if (!verified) {
          return new Response(
            JSON.stringify({ error: "Human verification required" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch (verifyErr) {
        console.error("Guest verification check error:", verifyErr);
      }
    }

    const character = getCharacterById(characterId);
    if (!character) {
      return new Response(
        JSON.stringify({ error: "Character not found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.OPENROUTER_CHAT_MODEL || "deepseek/deepseek-chat";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 构建消息列表（system prompt + 对话历史）
    const fullMessages = [
      { role: "system", content: character.systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    // 预获取会话并保存用户消息
    let sessionId: string | null = null;
    let savedUserMsgId: string | null = null;
    if (guestId) {
      try {
        const session = await getOrCreateSession(guestId, characterId);
        sessionId = session.id;
        const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
        if (lastUserMsg) {
          const savedUser = await addMessage({
            sessionId,
            role: "user",
            content: lastUserMsg.content,
          });
          savedUserMsgId = savedUser.id;
        }
      } catch (dbErr) {
        console.error("DB save error:", dbErr);
      }
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullAssistantText = "";
        try {
          // 调用 OpenRouter Chat Completions（流式）
          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: fullMessages,
              temperature: 0.85,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            console.error("OpenRouter chat error:", response.status, errText);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "LLM request failed" })}\n\n`
              )
            );
            controller.close();
            return;
          }

          // 解析 SSE 流
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          if (!reader) {
            throw new Error("No response body");
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;

              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullAssistantText += delta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                  );
                }
              } catch {
                // 忽略无法解析的行
              }
            }
          }

          // 流结束后保存 AI 回复到数据库
          let savedAssistantMsgId: string | null = null;
          const savedImageMsgIds: string[] = [];
          if (sessionId && fullAssistantText) {
            try {
              // 解析 PHOTO 标记，分离文本和图片
              const photoDescriptions: string[] = [];
              const cleanText = fullAssistantText
                .replace(/\[SEND_PHOTO:\s*([^\]]+)\]/g, (_match, desc: string) => {
                  photoDescriptions.push(desc.trim());
                  return '';
                })
                .trim();

              // 保存文本消息（如果有内容）
              if (cleanText) {
                const savedAssistant = await addMessage({
                  sessionId,
                  role: "assistant",
                  content: cleanText,
                });
                savedAssistantMsgId = savedAssistant.id;
              }

              // 为每个图片描述创建独立的图片消息（photoUrl 后续由前端补上）
              for (const desc of photoDescriptions) {
                const savedImage = await addMessage({
                  sessionId,
                  role: "assistant",
                  content: desc,
                  photoUrl: "", // 先占位，前端生成图片后更新
                });
                savedImageMsgIds.push(savedImage.id);
              }
            } catch (dbErr) {
              console.error("Save assistant message error:", dbErr);
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                userMsgId: savedUserMsgId,
                assistantMsgId: savedAssistantMsgId,
                imageMsgIds: savedImageMsgIds,
              })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: "Stream interrupted",
                userMsgId: savedUserMsgId,
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
