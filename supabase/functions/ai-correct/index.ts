import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Doubao API config
const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_TEXT_MODEL  = "doubao-1-5-pro-32k-250115";
const DOUBAO_VISION_MODEL = "doubao-1-5-vision-pro-32k-250115";

// Min score enforcement (backend hard protection)
const MIN_SCORE_MAP: Record<string, number> = {
  "HSK3-4":   65,
  "HSK5-6":   70,
  "HSKK中级": 60,
  "HSKK高级": 70,
};

// Shared expert role
const HSK_EXPERT_ROLE = `你是一位拥有10年以上对外汉语教学经验的 HSK/HSKK 专家级教师。
教学理念：严格遵循 HSK3.0（2021版）标准，精准识别知识漏洞，批改严谨耐心、以鼓励为主、专业准确。
评分原则：公正客观，有理有据，按学生所选级别的标准打分——不虚高、不压分。
铁律：每条错误必须引用原文原句 + 修改版 + 语法规则解释；优点必须具体指出好在哪里；建议必须给出具体方法。
必须严格返回纯 JSON，禁止包含任何 Markdown 标记或额外文字。`;

function buildSystemPrompt(mod: string, hskLevel?: string): string {
  const isLowEssay = !hskLevel || hskLevel.startsWith("HSK3") || hskLevel === "HSK3-4";
  const isLowOral  = !hskLevel || hskLevel.includes("中级") || hskLevel.includes("初级");

  // Essay
  if (mod === "essay") {
    const levelName = isLowEssay ? "HSK3-4级" : "HSK5-6级";
    const minScore  = isLowEssay ? 65 : 70;
    const dimContent = isLowEssay
      ? "主题是否明确，内容是否贴合题目，语句表意是否完整"
      : "立意明确，内容充实，选材恰当，可拓展观点，议论文需论点清晰、论据合理";
    const dimVocab = isLowEssay
      ? "词汇使用是否准确，是否掌握本级核心词汇，有无生造词、用词错误"
      : "词汇运用准确、丰富，可使用近义词、成语/俗语，用词多样，极少搭配失误";
    const dimGrammar = isLowEssay
      ? "基础句型是否正确，有无语序错误、成分残缺、搭配错误"
      : "长短句结合，复句、关联词运用熟练，语法错误极少，复杂句式使用自然";
    const dimStruct = isLowEssay
      ? "段落划分是否合理，开头、主体、结尾是否完整，语句衔接是否自然"
      : "篇章结构严谨，段落划分合理，段落间衔接自然，开头、主体、结尾呼应，逻辑连贯";
    const excellentLine = isLowEssay ? "85~100" : "88~100";
    const goodLine      = isLowEssay ? "75~84"  : "78~87";

    return `${HSK_EXPERT_ROLE}

Student level: ${levelName}. You must grade strictly by this level's standards.

Scoring dimensions (${levelName}, full score 100, minimum passing score ${minScore}):
1. Content (35 pts): ${dimContent}
2. Structure (20 pts): ${dimStruct}
3. Vocabulary (20 pts): ${dimVocab}
4. Grammar (20 pts): ${dimGrammar}
5. Punctuation & handwriting (5 pts): Standard punctuation, neat writing, no obvious errors.

Score tiers: Excellent ${excellentLine} / Good ${goodLine} / Pass ${minScore}~${minScore === 65 ? 74 : 77} / Fail <${minScore}
Min score ${minScore} is a hard floor — students who complete the essay earn at least ${minScore}.

Rules:
1. Grade strictly by ${levelName} dimensions. ${minScore} is a hard minimum.
2. All dimension scores must be 0-100 integers; weighted total rounds to integer.
3. Strengths: at least 3, quote original text, explain what's good, warm and encouraging.
4. Errors: group as "typo & word usage" / "grammar & sentence structure" / "punctuation & word order". Each: original -> correction + error type + grammar rule.
5. Model essay: keep original views, fix all errors, polish expression, 150-300 chars.
6. Writing tips: 3-5 specific suggestions, each with practice methods and examples. No generic "practice more".

Output JSON:
{
  "radar_data": { "词汇": 0-100, "语法": 0-100, "结构": 0-100, "表达": 0-100, "逻辑": 0-100, "书写": 0-100 },
  "score_info": {
    "total": weighted (logic*0.18 + expression*0.17 + structure*0.20 + vocab*0.20 + grammar*0.20 + writing*0.05),
    "level": "Excellent/Good/Pass/Fail",
    "passed": total>=60,
    "detected_level": "${levelName}",
    "dimension_scores": { same as radar_data }
  },
  "strengths": ["..."],
  "corrections": [{ "original": "...", "corrected": "...", "dimension": "...", "explanation": "..." }],
  "improvement_tips": [{ "dimension": "...", "tip": "..." }],
  "exercises": [{ "type": "改错题", "question": "...", "options": ["A","B","C","D"], "answer": "C", "explanation": "...", "hint": "..." }],
  "model_answer": "优化参考范文（150-300字）",
  "overall_comment": "综合评价（100字左右）：按${levelName}标准评分，肯定优点，指出1-2点改进，鼓励结尾"
}`;
  }

  // Homework
  if (mod === "homework") {
    const levelName = isLowEssay ? "HSK3-4级" : "HSK5-6级";
    const minScore  = isLowEssay ? 65 : 70;

    return `${HSK_EXPERT_ROLE}

Student level: ${levelName}. Grade homework by this level's standards. Min score ${minScore}.

Homework grading:
A. Fill-in-the-blank / multiple choice / single-error correction: focus on accuracy. Full score = perfect grammar + accurate vocabulary.
B. Short essay / paragraph: grade by five dimensions: Content(35) + Structure(20) + Vocabulary(20) + Grammar(20) + Punctuation(5).

Min score ${minScore}: students who complete the homework get at least ${minScore}. Only blank or completely wrong answers go below.

Output JSON format: same as essay correction (radar_data, score_info, strengths, corrections, improvement_tips, exercises, model_answer, overall_comment).
model_answer: for single-sentence exercises, provide the fully correct sentence; for paragraphs, rewrite as the ideal version (keep original intent, natural language).`;
  }

  // Oral / HSKK
  if (mod === "oral") {
    const levelName = isLowOral ? "HSKK中级" : "HSKK高级";
    const minScore  = isLowOral ? 60 : 70;
    const contentScore = isLowOral ? "40" : "38";
    const fluencyScore = isLowOral ? "30" : "32";
    const contentDesc = isLowOral
      ? "Clear opinion, logical & coherent, complete content, concrete examples, layered/balanced thinking"
      : "Deep insight, rigorous logic, rich layers, multi-angle/dialectical analysis, typical examples, substantial ideas";
    const fluencyDesc = isLowOral
      ? "Smooth flow, no frequent pauses, no word repetition, minimal filler words (um/ah), natural breaks"
      : "Natural & smooth flow, almost no pauses/repetition/filler words, appropriate pace & pauses, seamless transitions";
    const vocabDesc = isLowOral
      ? "Accurate word usage, idiomatic collocations, correct sentence structures, few errors, adequate vocabulary range"
      : "Rich vocabulary variety, skilled use of advanced words & fixed expressions; flexible sentence patterns, minimal grammar errors";
    const pronounceDesc = isLowOral
      ? "Clear pronunciation, natural intonation, no obvious errors (voice penalties reduced for mid-level)"
      : "Standard pronunciation, natural intonation with variation, appropriate stress & pauses, no noticeable deviation";
    const excellent = isLowOral ? "85-100" : "88-100";
    const good      = isLowOral ? "75-84"  : "78-87";
    const passRange = isLowOral ? "60-74" : "70-77";

    return `${HSK_EXPERT_ROLE}

Student level: ${levelName}. You must grade by this level's standards. Full score 100.

Four scoring dimensions:
1. Content (${contentScore} pts): ${contentDesc}
2. Fluency (${fluencyScore} pts): ${fluencyDesc}
3. Vocabulary & Grammar (25 pts): ${vocabDesc}
4. Voice & Intonation (5 pts): ${pronounceDesc}

Score tiers: Excellent ${excellent} / Good ${good} / Pass ${passRange} / Fail <${minScore}
Min score ${minScore}: students who make a genuine effort get at least ${minScore}. Only blank or completely incomprehensible goes below.

Rules:
1. Grade by ${levelName} dimensions. ${minScore} is the hard minimum.
2. Strengths: at least 3, quote the student's exact words.
3. Issues: group as "fluency issues" and "vocabulary & grammar errors". Each: original -> correction + explanation.
4. Model reading text: mark / for short pause, // for long pause. Natural idioms, exam-appropriate.
5. Shadow reading exercises: 3 sentences for word-by-word practice + full-passage reading (slow/normal/recite), with pinyin.
6. Targeted tips: summarize high-frequency mistakes and weak points.

Output JSON:
{
  "radar_data": { "发音": 0-100, "声调": 0-100, "流利度": 0-100, "词汇": 0-100, "语法": 0-100 },
  "score_info": {
    "total": weighted (fluency*0.40 + grammar*0.25 + vocab*0.20 + pronunciation*0.10 + tone*0.05),
    "level": "Excellent/Good/Pass/Fail",
    "passed": total>=60,
    "detected_level": "${levelName}",
    "dimension_scores": { same as radar_data }
  },
  "strengths": ["..."],
  "corrections": [{ "original": "...", "corrected": "...", "dimension": "...", "explanation": "..." }],
  "improvement_tips": [{ "dimension": "...", "tip": "..." }],
  "exercises": [{ "type": "跟读练习", "text": "...", "pinyin": "...", "hint": "..." }],
  "model_answer": "标准朗读范文（150-200字，标注 / // 停顿）",
  "overall_comment": "综合评价（100字）：按${levelName}标准评分，肯定优点，指出1-2点改进，鼓励结尾"
}`;
  }

  // Score analysis
  if (mod === "score") {
    return `${HSK_EXPERT_ROLE}

Analyze the student's HSK score data. Identify knowledge gaps, create a personalized improvement plan.
Return pure JSON:
{
  "radar_data": { "听力": 0-100, "阅读": 0-100, "写作": 0-100, "口语": 0-100, "语法": 0-100, "词汇": 0-100 },
  "trend_data": [{ "date": "YYYY-MM", "score": 0-100 }],
  "corrections": [{ "original": "weakness description", "corrected": "improvement direction", "dimension": "...", "explanation": "root cause + specific plan" }],
  "exercises": [{ "type": "专项练习", "question": "...", "options": ["A","B","C","D"], "answer": "A", "explanation": "..." }],
  "suggestions": "Personalized study plan: (1) current level diagnosis (2) 2-3 priority breakthroughs (3) weekly study schedule (4) expected progress timeline",
  "overall_comment": "Score trend analysis + current level assessment + gap to target level + most important exam prep advice"
}`;
  }

  return `${HSK_EXPERT_ROLE}. Analyze the following Chinese content and return a pure JSON with radar_data, corrections, exercises, overall_comment.`;
}

// Exam module system prompt (separate function)
function buildExamSystemPrompt(hskLevel: string, moduleType: string): string {
  const moduleInfo: Record<string, { count: number; focus: string }> = {
    "听力": { count: 30, focus: "语境理解、推断意图、信息提取，重视语调和语气线索" },
    "阅读": { count: 30, focus: "长文本理解、推断作者观点、细节定位，HSK3.0 新增长文本阅读" },
    "书写": { count: 4,  focus: "内容完整连贯、逻辑清晰、词汇语法准确，HSK3.0 新增内容型写作题" },
  };
  const mInfo = moduleInfo[moduleType] ?? { count: 0, focus: "Comprehensive language application" };

  return `${HSK_EXPERT_ROLE}

You are an HSK3.0【${hskLevel}】【${moduleType}】exam analysis expert.

Background:
- Standard question count for ${moduleType}: ${mInfo.count}
- HSK3.0 changes & focus for this module: ${mInfo.focus}

Analysis steps:
1. Identify question type (Listening/Reading/Writing).
2. Extract passage (if any): full passage + 100-char summary.
3. Vocabulary list: 8-12 key words, each with word, pinyin, meaning, example, hsk_level, new_in_hsk3.
4. Exam points: 3-6 key points, each with type, description, is_new_hsk3, strategy.
5. Per-question analysis: question_no, question_text, options[], answer, explanation (why correct + why others wrong + grammar/vocab), key_point.
6. HSK3.0 changes: 2-4 entries with aspect, change, impact.
7. Strategies: 5-7 actionable tips for this module.
8. Overall tip: 100 chars, warm and encouraging, 1-2 most important prep suggestions.

Output pure JSON:
{
  "module_type": "${moduleType}",
  "hsk_level": "${hskLevel}",
  "total_questions": ${mInfo.count},
  "passage": "full passage text (if applicable)",
  "passage_summary": "100-char summary",
  "vocab_list": [{ "word": "...", "pinyin": "...", "meaning": "...", "example": "...", "hsk_level": "...", "new_in_hsk3": false }],
  "exam_points": [{ "type": "...", "description": "...", "is_new_hsk3": false, "strategy": "..." }],
  "questions": [{ "question_no": 1, "question_text": "...", "options": ["A","B","C","D"], "answer": "A", "explanation": "...", "key_point": "..." }],
  "hsk3_changes": [{ "aspect": "...", "change": "...", "impact": "..." }],
  "strategies": ["..."],
  "overall_tip": "..."
}`;
}

// Error type for classified error handling
interface DoubaoError {
  type: "network" | "auth" | "server" | "timeout" | "parse" | "unknown";
  message: string;
}

// Call Doubao API
async function callDoubao(params: {
  apiKey: string;
  systemPrompt: string;
  userText: string;
  imageBase64?: string;
  imageUrl?: string;
}): Promise<string> {
  const { apiKey, systemPrompt, userText, imageBase64, imageUrl } = params;
  const hasImage = imageBase64 || imageUrl;
  const model = hasImage ? DOUBAO_VISION_MODEL : DOUBAO_TEXT_MODEL;

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const userContent: ContentPart[] = [];

  if (hasImage) {
    const url = imageBase64 ?? imageUrl!;
    userContent.push({ type: "image_url", image_url: { url } });
    userContent.push({
      type: "text",
      text: userText
        ? `Please first recognize the text in the image, then ${userText}`
        : "Please recognize and analyze all text content in the image.",
    });
  } else {
    userContent.push({ type: "text", text: userText });
  }

  const body = {
    model,
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: hasImage ? userContent : userText },
    ],
  };

  let resp: Response;
  try {
    resp = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("timeout")) {
      throw { type: "timeout", message: "AI response timeout, please retry" } as DoubaoError;
    }
    throw { type: "network", message: "Network error, please check your connection" } as DoubaoError;
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    if (resp.status === 401 || resp.status === 403) {
      throw { type: "auth", message: "AI service configuration error, please contact admin" } as DoubaoError;
    }
    if (resp.status >= 500) {
      throw { type: "server", message: "AI service temporarily unavailable, please retry later" } as DoubaoError;
    }
    throw { type: "server", message: `AI request error(${resp.status}), please retry` } as DoubaoError;
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// Parse AI JSON response
function parseAiJson(content: string): Record<string, unknown> | null {
  const cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Mock fallback data
function generateMockData(mod: string, dimensions: string[], errorMsg: string) {
  const radarData: Record<string, number> = {};
  dimensions.forEach((d) => { radarData[d] = Math.floor(Math.random() * 20) + 60; });

  const totalScore = Math.round(
    Object.values(radarData).reduce((a, b) => a + b, 0) / dimensions.length
  );
  const level = totalScore >= 85 ? "Excellent" : totalScore >= 75 ? "Good" : totalScore >= 60 ? "Pass" : "Fail";

  const isNewModule = mod === "essay" || mod === "homework" || mod === "oral";

  return {
    radar_data: radarData,
    score_info: isNewModule ? {
      total: totalScore,
      level,
      passed: totalScore >= 60,
      dimension_scores: { ...radarData },
    } : undefined,
    strengths: isNewModule
      ? [`${errorMsg}. The above score is an estimate. Please retry for detailed analysis.`]
      : undefined,
    corrections: [],
    improvement_tips: isNewModule ? [] : undefined,
    exercises: [],
    model_answer: isNewModule ? errorMsg : undefined,
    overall_comment: errorMsg,
  };
}

// Min score enforcement
function applyMinScore(aiResult: Record<string, unknown>, hskLevel?: string) {
  if (!hskLevel) return;
  const minScore = MIN_SCORE_MAP[hskLevel];
  if (!minScore) return;

  const scoreInfo = aiResult.score_info as Record<string, unknown> | undefined;
  if (!scoreInfo) return;

  const total = scoreInfo.total as number;
  if (typeof total !== "number" || total <= 0) return;
  if (total >= minScore) return;

  scoreInfo.total = minScore;
  scoreInfo.level = minScore >= 85 ? "Excellent" : minScore >= 75 ? "Good" : minScore >= 60 ? "Pass" : "Fail";
  scoreInfo.passed = minScore >= 60;
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      text = "",
      module: mod,
      language = "zh",
      imageBase64,
      imageUrl,
      hskLevel,
      moduleType = "阅读",
    } = await req.json();

    if (!mod) {
      return new Response(
        JSON.stringify({ error: "Missing module parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const doubaoApiKey = Deno.env.get("DOUBAO_API_KEY");
    const supabase     = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    }

    // Exam module - separate path
    if (mod === "exam") {
      const systemPrompt = buildExamSystemPrompt(hskLevel || "HSK5", moduleType);

      const langNote = language === "en"
        ? "\n\nWrite all meaning/explanation/description/strategy/change/impact/strategies/overall_tip fields in English."
        : language === "ru"
        ? "\n\nWrite meaning/explanation/description/strategy/change/impact/strategies/overall_tip fields in Russian."
        : "";

      const userInput = text
        ? `Student submitted HSK ${hskLevel || "HSK5"} ${moduleType} exam questions. Output a standardized analysis report:\n\n${text}${langNote}`
        : `This is an image of HSK ${hskLevel || "HSK5"} ${moduleType} exam questions. Recognize the content and output a standardized analysis report.${langNote}`;

      let examResult: Record<string, unknown> | null = null;

      if (doubaoApiKey) {
        try {
          const content = await callDoubao({
            apiKey: doubaoApiKey,
            systemPrompt,
            userText: userInput,
            imageBase64,
            imageUrl,
          });
          examResult = parseAiJson(content);
          if (!examResult) console.error("Exam JSON parse failed");
        } catch (e) {
          console.error("Doubao exam API call failed:", e);
        }
      }

      if (!examResult) {
        examResult = {
          module_type: moduleType,
          hsk_level: hskLevel || "HSK5",
          total_questions: moduleType === "书写" ? 4 : 30,
          vocab_list: [],
          exam_points: [],
          questions: [],
          hsk3_changes: [],
          strategies: [],
          overall_tip: "AI service temporarily unavailable. This is an estimated result. Please retry later.",
        };
      }

      return new Response(
        JSON.stringify(examResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Correction modules
    const dimensionsMap: Record<string, string[]> = {
      essay:    ["词汇", "语法", "结构", "表达", "逻辑", "书写"],
      homework: ["词汇", "语法", "结构", "表达", "逻辑", "书写"],
      oral:     ["发音", "声调", "流利度", "词汇", "语法"],
      score:    ["听力", "阅读", "写作", "口语", "语法", "词汇"],
    };
    const dimensions = dimensionsMap[mod] ?? ["词汇", "语法", "表达"];

    const systemPrompt = buildSystemPrompt(mod, hskLevel);

    const langNote = language === "en"
      ? "\n\nWrite overall_comment and suggestions fields in English."
      : language === "ru"
      ? "\n\nWrite overall_comment and suggestions fields in Russian."
      : "";

    const userInput = text
      ? `${text}${langNote}`
      : `(Image content)${langNote}`;

    let aiResult: Record<string, unknown> | null = null;
    let errorMsg = "AI service temporarily unavailable. Estimated result shown. Please retry later.";

    if (doubaoApiKey) {
      try {
        const content = await callDoubao({
          apiKey: doubaoApiKey,
          systemPrompt,
          userText: userInput,
          imageBase64,
          imageUrl,
        });
        aiResult = parseAiJson(content);
        if (!aiResult) {
          console.error("JSON parse failed, raw:", content.slice(0, 500));
          errorMsg = "AI returned invalid data, please retry";
        } else {
          applyMinScore(aiResult, hskLevel);
        }
      } catch (e: unknown) {
        console.error("Doubao API call failed:", e);
        const err = e as DoubaoError;
        if (err.type && err.message) {
          errorMsg = err.message;
        } else if (e instanceof Error) {
          errorMsg = e.message.includes("timeout")
            ? "AI response timeout, please retry"
            : e.message.includes("network")
            ? "Network error, please check your connection"
            : "AI service temporarily unavailable, please retry";
        }
      }
    }

    if (!aiResult) {
      aiResult = generateMockData(mod, dimensions, errorMsg);
    }

    if (userId) {
      await supabase.from("corrections").insert({
        user_id:          userId,
        module:           mod,
        input_text:       text || "[Image recognition]",
        radar_data:       aiResult.radar_data,
        corrections_data: aiResult.corrections,
        exercises_data:   aiResult.exercises,
        score_data:       aiResult.trend_data ?? null,
        suggestions:      aiResult.suggestions ?? aiResult.overall_comment ?? null,
      });
    }

    return new Response(
      JSON.stringify(aiResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Request processing failed:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error, please retry later" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
