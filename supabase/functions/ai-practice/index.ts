// ─── CORS ────────────────────────────────────────────────────────────────────
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_MODEL    = "doubao-1-5-pro-32k-250115";

// ─── 每级 HSK 词汇量与语法范围(用于统一输出) ─────────────────────────────────
const HSK_LEVEL_INFO: Record<string, { vocab: number; grammar: string; examples: string }> = {
  HSK1: { vocab: 500, grammar: "基础语序(SVO)、形容词谓语句、'是'字句、'有'字句、疑问词(吗/呢/什么/谁/哪)、量词(个/本/杯)、程度副词(很/太)", examples: "HSK1样例题：他__学生。 A.是 B.很 C.在 D.去 (考查'是'字句)" },
  HSK2: { vocab: 1272, grammar: "'了'(完成态)、'过'(经历态)、'着'(持续态)、能愿动词(会/能/可以/要/想)、比较句('比'字句)、'的'字结构、时量补语、'因为…所以…'", examples: "HSK2样例题：我昨天__了一个电影。 A.看 B.看了 C.看着 D.看过 (考查'了'的完成态用法)" },
  HSK3: { vocab: 2245, grammar: "结果补语(完/到/好/错)、趋向补语(来/去/上来/下去)、可能补语(V得/V不)、'把'字句(基础)、'被'字句(基础)、'虽然…但是…'、'不但…而且…'、'越…越…'", examples: "HSK3样例题：请把书__桌子上。 A.放 B.放在 C.放到 D.放着 (考查'把'字句+结果补语'在')" },
  HSK4: { vocab: 3245, grammar: "复杂'把'字句、'被'字句(带补语)、'连…都/也…'、'即使…也…'、'既然…就…'、'无论…都…'、'除了…以外'、'对…来说'、'在…方面'、'由于…'", examples: "HSK4样例题：__天气不好，我们__要去。 A.虽然…但是… B.即使…也… C.因为…所以… D.如果…就… (考查让步复句，HSK4级别语法点)" },
  HSK5: { vocab: 4316, grammar: "'令'/'使'/'叫'字兼语句、'以'字结构(以…为…)、'于'字结构(对于/关于/至于)、'所'字结构、双重否定、'与其…不如…'、'宁可…也不…'、'难免'/'不免'/'未免'、成语(固定搭配)", examples: "HSK5样例题：政府出台了新的政策，__改善民生__核心目标。 A.以…为… B.为了…的… C.关于…的… D.按照…来…" },
  HSK6: { vocab: 5456, grammar: "文言虚词(之/其/以/而/则/者/所)、典故成语、多重复句(三层以上)、修辞手法(比喻/排比/对偶)、学术书面语、专业领域词汇、古诗词引用", examples: "HSK6样例题：面对突如其来的灾难，他__不惊，沉着应对。 A.处之 B.安之 C.泰然 D.坦然 (考查文言固定搭配'泰然自若'的变体)" },
};

function buildSystemPrompt(language: string): string {
  const langNote = language === "ru"
    ? "题干用俄语呈现，解析用俄语，但汉字/拼音示例保留中文。HSK等级名保留HSK1-HSK6格式。"
    : language === "en"
    ? "Questions and options in English, explanations in English, but keep Chinese characters/pinyin in examples. HSK level format: HSK1-HSK6."
    : "所有内容用中文呈现。HSK等级用HSK1-HSK6格式。";

  return `你是具有15年HSK一线教学经验的出题专家，深度掌握 HSK3.0（2021版）大纲的每一级词表、语法点和题型要求。

${langNote}

【你的核心任务】
根据学生的目标 HSK 级别和薄弱维度，生成与该级别严格匹配的高质量练习题。
**最重要的原则：题目必须准确对标目标级别的难度，太简单和太难都是严重错误。**

【HSK 各级别试题应有的难度基准】
以下是各 HSK 级别典型试题的特征。你出的题必须达到这个基准，否则学生无法通过你的练习提升：

├─ HSK1级 (入门,500词)：
│  └─ 单句填空/选择题。考查：'是'/'有'/'在'、数量表达、基本形容词、时间词。
│     正确示例："桌子上有三__书。A.个 B.本 C.张 D.条" — 考查量词搭配，1级难度。
│     错误示例(太简单)："你好"是什么意思 — 这不是试题。
│
├─ HSK2级 (初级,1272词)：
│  └─ 对话补全/语序排列/选词填空。考查：'了'/'过'/'着'、能愿动词、比较句、'的'字结构。
│     正确示例："我昨天没__电影院。A.去 B.去了 C.去过 D.去着" — 考查否定句中'了'省略规则。
│
├─ HSK3级 (进阶,2245词)：
│  └─ 语段填空/改错/阅读判断。考查：补语系统(结果/趋向/可能)、'把'字句、'被'字句、关联词搭配。
│     正确示例："他把杯子___了。A.打破 B.放完 C.看见 D.听到" — 考查'把'字句+结果补语。
│
├─ HSK4级 (中级,3245词)：
│  └─ 复句关联词选择/篇章阅读/段落排序。考查：让步/条件/因果复句的多层嵌套、'连…都…'、'对…来说'。
│     正确示例："__学习方法不对，__花再多时间也是白费。A.既然…就… B.如果…就… C.即使…也… D.虽然…但是…" — 考查'即使…也…'让步复句。
│
├─ HSK5级 (高级,4316词)：
│  └─ 近义词辨析/成语填空/长文阅读推断/观点作文。考查：兼语句、'以'字结构、双重否定、典故成语、学术词汇。
│     正确示例："他的行为__引起了公愤。A.难免 B.未免 C.不免 D.避免" — 考查'不免'与'未免''难免'的微妙区别，5级常考点。
│
├─ HSK6级 (母语级,5456词)：
│  └─ 文言虚词、典故运用、多重复句分析、学术论文式阅读。要求对汉语语言文化有深层理解。
│     正确示例：给一段300字社论，出3道推断题，考查"之""其""以"等文言虚词在正式文体中的用法。

【题目生成规范 - 必须严格遵循】
1. 不要编造简单句充数。HSK4+ 的题干应当来自真实语境(新闻/散文/学术/商务对话)。
2. 每题标注 knowledge_point(具体考点，如'补语可能式的否定形式')，不能只写维度大类(如'语法')。
3. 干扰项必须设计得合理可行——每个错误选项对应一个典型的学习者偏误，不能是显然不对的凑数选项。
4. 如果生成的题目全是简单题(easy)，本次生成视为失败，必须重做。
5. 难度分布：前20% easy、中间50% medium、后30% hard。

【输出格式 - 纯JSON，不要Markdown标记】
{ "questions": [...], "summary": {...} }

Each question:
{
  "id": 1,
  "dimension": "词汇",
  "knowledge_point": "具体语法/词汇点名称",
  "hsk_level": "HSK4",
  "question": "题干文本",
  "type": "choice",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A",
  "explanation": "①考点定位(这个题考什么、在HSK几级的哪个语法点) ②正确依据(为什么A对) ③陷阱分析(为什么BCD错，每个对应什么偏误)",
  "difficulty": "medium"
}
summary: { "level": "HSK4", "focus": ["词汇","语法"], "total": 10, "hsk30_note": "本题组对标HSK3.0标准" }`;
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

    const levelInfo = HSK_LEVEL_INFO[hskLevel];
    const vocabRequirement = levelInfo
      ? `\n- 该级别要求词汇量约${levelInfo.vocab}词\n- 核心语法覆盖：${levelInfo.grammar}\n- ${levelInfo.examples}`
      : "";

    const userMsg = [
      `请严格按照以下要求生成 ${safeCount} 道 HSK 练习题：`,
      ``,
      `【学生画像】`,
      `- 目标 HSK 级别：${hskLevel}`,
      `- 需要强化的薄弱维度：${dimensions.join("、")}`,
      `- 需要生成题目总数：${safeCount} 道`,
      ``,
      `【级别基准 - 必须达到以下标准】${vocabRequirement}`,
      ``,
      `【出题底线 - 违反任何一条视为失败】`,
      `1. 所有题目必须达到 ${hskLevel} 级别应有的难度。如果你给一个 ${hskLevel} 学生出了一道 HSK2 水平的题，这是不可接受的。`,
      `2. 题干用词：${hskLevel === "HSK5" || hskLevel === "HSK6" ? "必须使用高级词汇和复杂复句，避免简单直白的表达。" : hskLevel === "HSK3" || hskLevel === "HSK4" ? "使用该级别核心词汇，包含一定复句结构，避免纯简单句。" : "使用该级别基础词汇和句型。"}`,
      `3. 干扰项必须精心设计——每个错误选项都要像一个真实的学生会选的错误答案。如果某个错误选项明显不可能有人选，它就是无效选项。`,
      `4. 所有题目必须紧密围绕薄弱维度：${dimensions.join("、")}。每个薄弱维度至少出${Math.max(2, Math.floor(safeCount / dimensions.length))} 题。`,
      `5. 难度阶梯：easy ${Math.max(0, Math.floor(safeCount * 0.2))} 题（基础巩固）、medium ${Math.floor(safeCount * 0.5)} 题（核心提升）、hard ${Math.ceil(safeCount * 0.3)} 题（拔高挑战）。`,
      ``,
      `【题型分配】`,
      `- 单选题(choice) 约占${Math.round(safeCount * 0.7)}题`,
      `- 判断题(judge) 约占${Math.round(safeCount * 0.15)}题`,
      `- 填空题(fill) 约占${Math.round(safeCount * 0.1)}题`,
      `- 语段排序/写作题约占${Math.ceil(safeCount * 0.05)}题`,
      ``,
      `【解析要求 - 每题必含】`,
      `① 考点定位：这个题考查的是 HSK3.0 中 ${hskLevel} 的哪个具体语法/词汇点`,
      `② 正确依据：为什么正确答案是对的，引用语法规则或词汇用法`,
      `③ 陷阱分析：每个错误选项分别对应了哪种典型的学习者偏误`,
    ].join("\n");

    const resp = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       DOUBAO_MODEL,
        temperature: 0.7,
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
