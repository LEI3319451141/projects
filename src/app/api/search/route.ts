import { NextRequest, NextResponse } from "next/server";

// 搜索功能暂未接入（OpenRouter 不提供搜索 API）
// 如需搜索，可接入 Tavily / SerpAPI / Bing Search 等服务
export async function POST(request: NextRequest) {
  try {
    const { query } = (await request.json()) as { query: string };

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // 返回空搜索结果，不阻断聊天流程
    return NextResponse.json({
      summary: "",
      results: [],
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
