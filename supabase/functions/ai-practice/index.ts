// ─── CORS ────────────────────────────────────────────────────────────────────
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_MODEL    = "doubao-1-5-pro-32k-250115";

function buildSystemPrompt(language: string): string {
  const langNote = language === "ru"
    ? "题干用俄语，解析用俄语，但汉字/拼音例子保留中文。HSK等级名保留英文格式（HSK1-HSK6）。"
    : language === "en"
    ? "Write questions and options in English, explanations in English, but keep Chinese characters/pinyin in Chinese. Keep HSK level names as HSK1-HSK6."
    : "题干、选项、解析均用中文。HSK等级用HSK1-HSK6格式。";

  return `你是一位拥有15年以上对外汉语教学经验的 HSK/HSKK 专家级出题老师，深度掌握 HSK3.0（2021年最新版）考试大纲和题型改革。

${langNote}

你的任务是根据学生的薄弱维度和 HSK 目标级别，严格按照 HSK3.0 标准生成高质量、有教学价值的练习题。

【HSK3.0（2021版）关键变化】
- 等级从原来的6级调整为"三等九级"：初等(1-3级)、中等(4-6级)、高等(7-9级)
- 但传统HSK1-6级仍广泛使用，以下用传统1-6级编号
- 新增题型重点：语段排序题、图文匹配题、听后复述题、任务型写作
- 强调"语言交际能力"而非单纯语法知识
- 词汇量标准更新：HSK1=500词, HSK2=1272词, HSK3=2245词, HSK4=3245词, HSK5=4316词, HSK6=5456词
- 语法点重新分级，更注重实际使用频率

【HSK各级别出题标准】
- HSK1-2级（初等）：基础词汇、简单句型、日常场景。题型以选择+判断为主
- HSK3-4级（中等）：复句结构、段落理解、话题表达。加入语段排序和简短写作
- HSK5-6级（高等）：学术词汇、长文阅读、观点表达。加入任务型写作和听后复述

【输出格式要求】
- 严格返回纯 JSON，不要任何 Markdown 标记或代码块
- 根结构：{ "questions": [...], "summary": {...} }
- 每道题结构：
  {
    "id": 1,
    "dimension": "词汇",           // 所属维度
    "knowledge_point": "形近字辨析", // 具体考点
    "hsk_level": "HSK4",          // 题目对标等级
    "question": "题目文本",
    "type": "choice",             // choice|judge|fill|sort|writing
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],  // sort题为排序项，writing题为null
    "answer": "A",                // 正确答案
    "explanation": "详细解析：①考点分析 ②正确选项的语言学依据 ③常见错误选项的陷阱分析 ④拓展知识点",
    "difficulty": "easy"          // easy|medium|hard
  }
- summary 结构：{ "level": "HSK5", "focus": ["词汇","语法"], "total": 10, "hsk30_note": "本题组对标HSK3.0标准" }

【科学出题原则（严格遵循）】
1. 知识点分层：每道题标注 difficulty（easy/medium/hard），题目由易到难递进
2. 薄弱维度聚焦：每个薄弱维度至少出2题，且题目要覆盖不同考点
3. 题型多样化：70%单选题, 15%判断题, 10%填空题, 5%语段排序/写作题
4. 解析三步法：每条解析必须包含 ①考点定位 ②正确依据 ③常见陷阱
5. HSK3.0词汇表对标：出题用词严格控制在目标级别的词汇范围内
6. 语境真实化：题目素材取自真实生活/学术场景，避免生造例句
7. 干扰项科学设计：每个错误选项都对应一个典型的学习者偏误

【语言要求】
${language === "ru" ? "- 题目题干和选项翻译为俄语，但例句和汉字保留中文\n- 解析用俄语撰写" : language === "en" ? "- 题目题干和选项翻译为英语，但例句和汉字保留中文\n- 解析用英语撰写" : "- 所有内容用中文撰写"}`;
}

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

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "AI service not configured",
        questions: [],
        summary: { level: hskLevel, focus: dimensions, total: 0 }
      }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const userMsg = [
      `请严格按照以下要求生成 ${safeCount} 道 HSK 练习题：`,
      ``,
      `【学生画像】`,
      `- 目标 HSK 级别：${hskLevel}`,
      `- 需要强化的薄弱维度：${dimensions.join("、")}`,
      ``,
      `【出题要求】`,
      `- 严格对标 HSK3.0（2021版）${hskLevel} 级别的词汇量和语法标准`,
      `- 每个薄弱维度至少分配 2 题`,
      `- 题型分配：70%单选题 + 15%判断题 + 10%填空题 + 5%语段排序/写作题`,
      `- 难度递进：前30% easy，中间40% medium，后30% hard`,
      `- 所有题目必须紧密围绕薄弱维度，帮助学生精准提升`,
      `- 每题解析必须包含：考点定位 + 正确依据 + 常见陷阱分析`,
    ].join("\n");

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

    const jsonStr  = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
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
