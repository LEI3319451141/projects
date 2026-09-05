import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = (await request.json()) as {
      prompt: string;
      characterId: string;
    };

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.OPENROUTER_IMAGE_MODEL || "bytedance-seed/seedream-5-0-lite";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    // 调用 OpenRouter 图片生成
    const response = await fetch(`${baseUrl}/images`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://boyfriend-simulator.local",
        "X-Title": "Boyfriend Simulator",
      },
      body: JSON.stringify({
        model,
        prompt,
        aspect_ratio: "1:1",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter image error:", response.status, errText);
      return NextResponse.json(
        { error: `Image generation failed: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    const imageData = result.data?.[0];

    if (imageData?.b64_json) {
      const mediaType = imageData.media_type || "image/png";
      return NextResponse.json({
        imageUrl: `data:${mediaType};base64,${imageData.b64_json}`,
      });
    } else if (imageData?.url) {
      return NextResponse.json({ imageUrl: imageData.url });
    } else {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Image generation API error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
