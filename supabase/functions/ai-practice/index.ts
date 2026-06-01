// ─── CORS ────────────────────────────────────────────────────────────────────
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_MODEL    = "doubao-1-5-pro-32k-250115";

// ─── 系统提示词 ───────────────────────────────────────────────────────────────
function buildSystemPrompt(language: string): string {
  const langNote = language === "ru"
    ? "题干和选项用俄语，解析用俄语，但汉字例子保留中文。"
    : language === "en"
    ? "Write questions and options in English, explanations in English, but keep Chinese characters/examples in Chinese."
    : "题干、选项、解析均用中文。";

  return `你是一位 HSK/HSKK 专家级出题老师，拥有10年以上对外汉语教学经验。
${langNote}

你的任务是根据学生的薄弱维度和 HSK 级别，生成针对性练习题。

【输出格式要求】
- 严格返回纯 JSON，不要任何 Markdown 标记或代码块
- 根结构：{ "questions": [...], "summary": {...} }
- 每道题结构：
  {
    "id": 1,
    "dimension": "词汇",
    "knowledge_point": "形近字辨析",
    "question": "题目文本",
    "type": "choice",  // choice(单选) | judge(判断对错) | fill(填空)
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],  // 判断题: ["A. 正确", "B. 错误"]；填空题: null
    "answer": "A",   // 选择/判断填选项字母；填空填正确内容
    "explanation": "详细解析，说明正确答案的语言学依据"
  }
- summary 结构：{ "level": "HSK5", "focus": ["词汇","语法"], "total": 10 }

【出题原则】
- 紧扣薄弱维度，每个薄弱维度至少出2题
- 题目由易到难，覆盖记忆层、理解层、应用层
- 单选题为主（占70%），判断题（20%），填空题（10%）
- 所有题目难度与指定 HSK 级别严格对应
- 解析要有教学价值：解释为什么对、为什么错`;
}

// ─── Mock 题目 ────────────────────────────────────────────────────────────────
function buildMockData(hskLevel: string, count: number) {
  return {
    questions: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      dimension: i % 2 === 0 ? "词汇" : "语法",
      knowledge_point: i % 2 === 0 ? "形近字辨析" : "补语用法",
      question: `【${hskLevel}】示例题 ${i + 1}：下列哪个词语使用正确？`,
      type: "choice",
      options: ["A. 他很高兴地说", "B. 他很高兴的说", "C. 他很高兴了说", "D. 他很高兴着说"],
      answer: "A",
      explanation: "副词修饰动词时用\"地\"，\"高兴地说\"是正确搭配。\"地\"字结构：形容词/副词 + 地 + 动词。",
    })),
    summary: { level: hskLevel, focus: ["词汇", "语法"], total: count },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const {
      hskLevel    = "HSK4",
      dimensions  = ["词汇", "语法"],
      questionCount = 10,
      language    = "zh",
    } = await req.json() as {
      hskLevel?: string;
      dimensions?: string[];
      questionCount?: number;
      language?: string;
    };

    const safeCount = Math.min(Math.max(Number(questionCount) || 10, 5), 15);
    const apiKey    = Deno.env.get("DOUBAO_API_KEY");

    // ── Mock 模式 ────────────────────────────────────────────────────────────
    if (!apiKey) {
      console.warn("未找到 DOUBAO_API_KEY，返回 Mock 题目");
      return new Response(JSON.stringify(buildMockData(hskLevel, safeCount)), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── 构建用户消息 ──────────────────────────────────────────────────────────
    const userMsg = [
      `学生信息：`,
      `- HSK 目标级别：${hskLevel}`,
      `- 薄弱维度：${dimensions.join("、")}`,
      `- 需要生成题目数量：${safeCount} 道`,
      ``,
      `请严格按照薄弱维度出题，帮助学生有针对性地强化。`,
    ].join("\n");

    // ── 调用豆包 ──────────────────────────────────────────────────────────────
    const resp = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       DOUBAO_MODEL,
        temperature: 0.8,
        max_tokens:  4000,
        messages: [
          { role: "system", content: buildSystemPrompt(language) },
          { role: "user",   content: userMsg },
        ],
      }),
    });

    if (!resp.ok) throw new Error(`Doubao API ${resp.status}: ${await resp.text()}`);

    const json     = await resp.json();
    const raw      = json.choices?.[0]?.message?.content ?? "";

    // ── 提取 JSON（容错：去掉可能的 Markdown 代码块包裹）────────────────────
    const jsonStr  = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // 再尝试提取第一个 { ... }
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("无法解析豆包返回的 JSON");
      parsed = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-practice error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
