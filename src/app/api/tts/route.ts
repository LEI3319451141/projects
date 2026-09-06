import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// 角色声音样本文件映射
const VOICE_FILES: Record<string, string> = {
  chuying: "chuying.mp3",
  wuming: "wuming.mp3",
  yedan: "yedan.mp3",
  honglang: "honglang.mp3",
};

// 模块级别读取并缓存 base64 编码的声音样本（避免每次请求都读文件）
const VOICE_REFERENCES: Record<string, string> = {};

try {
  const voicesDir = join(process.cwd(), "public", "voices");
  for (const [characterId, filename] of Object.entries(VOICE_FILES)) {
    const filePath = join(voicesDir, filename);
    const audioBuffer = readFileSync(filePath);
    const base64 = audioBuffer.toString("base64");
    VOICE_REFERENCES[characterId] = `data:audio/mpeg;base64,${base64}`;
  }
  console.log(`[TTS] Loaded ${Object.keys(VOICE_REFERENCES).length} voice samples`);
} catch (err) {
  console.error("[TTS] Failed to load voice samples:", err);
}

export async function POST(request: NextRequest) {
  try {
    const { text, characterId } = (await request.json()) as {
      text: string;
      characterId: string;
    };

    if (!text || !characterId) {
      return NextResponse.json(
        { error: "Missing text or characterId" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.OPENROUTER_TTS_MODEL || "fish-audio/s2.1-pro-free:free";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    // 清理文本：移除括号中的动作/神态描述（TTS 不朗读这些内容）
    // 支持中文括号（）、英文括号()、方括号[]、星号*
    const cleanText = text
      .replace(/（[^）]*）/g, "")  // 中文括号
      .replace(/\([^)]*\)/g, "")   // 英文括号
      .replace(/\[[^\]]*\]/g, "")  // 方括号
      .replace(/\*[^*]*\*/g, "")   // 星号包裹
      .replace(/\s+/g, " ")        // 合并多余空格
      .trim();

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model,
      input: cleanText,
      response_format: "mp3",
    };

    // 如果有该角色的声音样本，加入 input_references 实现声音克隆
    const voiceRef = VOICE_REFERENCES[characterId];
    if (voiceRef) {
      requestBody.input_references = [
        {
          type: "input_audio",
          input_audio: {
            data: voiceRef,
          },
        },
      ];
    }

    // 调用 OpenRouter Fish Audio TTS（带声音克隆）
    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter TTS error:", response.status, errText);
      return NextResponse.json(
        { error: `TTS failed: ${response.status}` },
        { status: response.status }
      );
    }

    // 读取音频二进制
    const audioBuffer = await response.arrayBuffer();
    const audioBytes = Buffer.from(audioBuffer);
    const audioSize = audioBytes.length;

    // 转成 base64 data URL（前端可直接播放，无需文件存储）
    const base64 = audioBytes.toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64}`;

    return NextResponse.json({
      audioUrl,
      audioSize,
      voiceCloned: !!voiceRef,
    });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
