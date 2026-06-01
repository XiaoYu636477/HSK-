import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_MODEL    = "doubao-1-5-pro-32k-250115";

function buildSystemPrompt(language: string): string {
  if (language === "ru") {
    return `Ты опытный преподаватель китайского с 15-летним стажем и методист HSK3.0.
На основе истории обучения студента (радарные оценки, записи исправлений) составь персонализированный план.

Ответь СТРОГО в формате JSON:
{
  "diagnosis": {
    "weak_points": [{"dimension": "...", "score": 0-100, "root_cause": "конкретная причина слабости"}],
    "strengths": [{"dimension": "...", "score": 0-100, "evidence": "в чём проявляется сила"}]
  },
  "learning_plan": {
    "title": "название на русском",
    "description": "краткое описание плана",
    "daily_tasks": [{"task": "конкретное задание", "duration": "15 минут", "priority": "высокая/средняя"}],
    "weekly_goals": ["цель 1", "цель 2"]
  },
  "exercises": [{"type": "тип", "question": "вопрос", "options": ["A...","B...","C...","D..."], "answer": "правильный", "explanation": "разбор"}],
  "estimated_hsk_level": "определённый уровень HSK",
  "progress_advice": "совет по прогрессу"
}`;
  }
  if (language === "en") {
    return `You are a veteran Chinese teacher with 15 years of experience and an HSK3.0 curriculum expert.
Based on the student's learning history (radar scores, correction records), create a personalized learning plan.

Reply STRICTLY in JSON format:
{
  "diagnosis": {
    "weak_points": [{"dimension": "...", "score": 0-100, "root_cause": "specific cause of weakness"}],
    "strengths": [{"dimension": "...", "score": 0-100, "evidence": "what shows strength"}]
  },
  "learning_plan": {
    "title": "plan title in English",
    "description": "brief plan description",
    "daily_tasks": [{"task": "specific task", "duration": "15 minutes", "priority": "high/medium"}],
    "weekly_goals": ["goal 1", "goal 2"]
  },
  "exercises": [{"type": "type", "question": "question", "options": ["A...","B...","C...","D..."], "answer": "correct", "explanation": "analysis"}],
  "estimated_hsk_level": "detected HSK level",
  "progress_advice": "progress encouragement"
}`;
  }
  return `你是一位拥有15年以上对外汉语教学经验的 HSK3.0 专家级教师和课程规划师。
你擅长根据学生的学习数据精准诊断问题，制定科学、可执行的学习计划。

请严格按以下 JSON 结构返回分析结果：
{
  "diagnosis": {
    "weak_points": [{"dimension": "维度名称", "score": 0-100整数, "root_cause": "根据学生错误模式分析的根本原因，如：母语负迁移/概念混淆/练习不足/输入量不够"}],
    "strengths": [{"dimension": "维度名称", "score": 0-100整数, "evidence": "学生做得好的具体表现"}]
  },
  "learning_plan": {
    "title": "有激励性的计划标题",
    "description": "100字以内的计划描述，温暖鼓励的语气",
    "daily_tasks": [{"task": "具体可执行的任务（不要写'多练习'这类空话）", "duration": "建议时长", "priority": "高/中"}],
    "weekly_goals": ["本周要达成的具体目标1", "目标2"]
  },
  "exercises": [
    {"type": "改错题/造句题/填空题", "question": "题目文本", "options": ["A. ...","B. ...","C. ...","D. ..."], "answer": "正确答案", "explanation": "详细解析（考点+依据+陷阱）"}
  ],
  "estimated_hsk_level": "根据学生表现推断的当前 HSK 级别（HSK1-HSK6）",
  "progress_advice": "一段温暖鼓励的总结语，点出进步方向和信心"
}

【分析原则】
- 诊断必须引用具体数据（百分比、错误模式）而非泛泛而谈
- 学习计划必须可执行、有时长、有优先级
- 练习题必须针对最薄弱的2个维度设计，对标学生当前HSK级别
- 语气如一对一家教般温暖`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "未登录" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "未登录" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const language = (body.language as string) || "zh";

    // 获取最近20条历史记录
    const { data: corrections } = await supabase
      .from("corrections")
      .select("radar_data, module, created_at, corrections_data, suggestions")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!corrections || corrections.length === 0) {
      return new Response(JSON.stringify({
        weak_dimensions: [],
        plan_content: {
          title: language === "zh" ? "欢迎开始学习" : language === "ru" ? "Начните обучение" : "Start Learning",
          description: language === "zh" ? "请先完成一些批改或分析任务，AI 将为你生成个性化学习计划。" : language === "ru" ? "Сначала выполните несколько заданий для анализа." : "Complete some tasks first for personalized analysis.",
        },
        exercises: [],
        diagnosis: null,
        estimated_hsk_level: null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("DOUBAO_API_KEY");

    // 统计基础数据
    const dimensionScores: Record<string, number[]> = {};
    const errorPatterns: string[] = [];
    corrections.forEach((c: any) => {
      if (c.radar_data) {
        Object.entries(c.radar_data).forEach(([dim, score]) => {
          if (!dimensionScores[dim]) dimensionScores[dim] = [];
          dimensionScores[dim].push(score as number);
        });
      }
      if (c.corrections_data && Array.isArray(c.corrections_data)) {
        c.corrections_data.forEach((corr: any) => {
          if (corr.dimension) errorPatterns.push(corr.dimension);
        });
      }
    });

    const weakDimensions = Object.entries(dimensionScores)
      .map(([dim, scores]) => ({
        dimension: dim,
        avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        count: scores.length,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const weakDims = weakDimensions.filter(d => d.avgScore < 75);
    const strongDims = weakDimensions.filter(d => d.avgScore >= 75);

    // 统计错误类型频率
    const errorFreq: Record<string, number> = {};
    errorPatterns.forEach(d => { errorFreq[d] = (errorFreq[d] || 0) + 1; });
    const topErrors = Object.entries(errorFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dim, cnt]) => ({ dimension: dim, count: cnt }));

    if (!apiKey) {
      // 无API时返回基础统计分析
      return new Response(JSON.stringify({
        weak_dimensions: weakDims,
        plan_content: {
          title: language === "zh" ? "个性化学习计划" : language === "ru" ? "План обучения" : "Learning Plan",
          description: weakDims.length > 0
            ? (language === "zh" ? `你在${weakDims.map(d=>d.dimension).join("、")}方面需要重点加强。` : language === "ru" ? `Вам нужно улучшить: ${weakDims.map(d=>d.dimension).join(", ")}.` : `Focus on: ${weakDims.map(d=>d.dimension).join(", ")}.`)
            : (language === "zh" ? "各项能力均衡，继续保持！" : language === "ru" ? "Все показатели сбалансированы!" : "All dimensions are balanced!"),
          daily_tasks: weakDims.slice(0, 3).map(d => ({
            task: getTaskForDim(d.dimension, language),
            duration: "20分钟",
            priority: "高",
          })),
        },
        exercises: [],
        diagnosis: { weak_points: weakDims, strengths: strongDims, top_errors: topErrors },
        estimated_hsk_level: estimateLevel(weakDimensions),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 构建给AI的上下文
    const contextLines = [
      `学生的学习数据分析：`,
      ``,
      `【各维度平均分（最近${corrections.length}条记录）】`,
      ...weakDimensions.map(d => `  ${d.dimension}: ${d.avgScore}分（共${d.count}次）`),
      ``,
      `【薄弱维度（低于75分）】`,
      ...(weakDims.length > 0 ? weakDims.map(d => `  - ${d.dimension}: ${d.avgScore}分`) : ["  无"]),
      ``,
      `【高频错误维度 Top5】`,
      ...topErrors.map((e, i) => `  ${i + 1}. ${e.dimension}（${e.count}次）`),
      ``,
      `请根据以上数据，按 JSON 格式输出诊断、学习计划、练习题和学习建议。`,
    ].join("\n");

    const resp = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DOUBAO_MODEL,
        temperature: 0.7,
        max_tokens: 3000,
        messages: [
          { role: "system", content: buildSystemPrompt(language) },
          { role: "user", content: contextLines },
        ],
      }),
    });

    if (!resp.ok) {
      throw new Error(`Doubao API ${resp.status}: ${await resp.text()}`);
    }

    const json = await resp.json();
    const raw = json.choices?.[0]?.message?.content ?? "";

    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("无法解析 AI 返回的 JSON");
      parsed = JSON.parse(match[0]);
    }

    // 保存学习计划
    await supabase.from("learning_plans").insert({
      user_id: user.id,
      weak_dimensions: weakDims,
      plan_content: parsed.learning_plan || parsed,
      exercises: parsed.exercises || [],
    });

    return new Response(JSON.stringify({
      weak_dimensions: weakDims,
      plan_content: parsed.learning_plan || {},
      exercises: parsed.exercises || [],
      diagnosis: parsed.diagnosis || null,
      estimated_hsk_level: parsed.estimated_hsk_level || estimateLevel(weakDimensions),
      progress_advice: parsed.progress_advice || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("ai-learning error:", error);
    return new Response(JSON.stringify({ error: "AI 分析失败，请稍后重试" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

function getTaskForDim(dim: string, lang: string): string {
  const tasks: Record<string, string[]> = {
    "词汇": ["每天学习10个HSK级别对应词汇，用每个词造一个完整的句子", "Learn 10 HSK-level words daily, use each in a complete sentence", "Учите 10 слов уровня HSK, используйте каждое в предложении"],
    "语法": ["完成3道语法改错题，对照解析理解规则", "Do 3 grammar correction exercises with explanations", "Выполните 3 упражнения по грамматике с разбором"],
    "结构": ["分析一篇短文的段落结构，画出思维导图", "Analyze paragraph structure of a short text, draw a mind map", "Проанализируйте структуру абзаца, нарисуйте mind-map"],
    "表达": ["写一段100字的短文，关注自然流畅的表达", "Write a 100-char passage, focus on natural fluency", "Напишите текст из 100 иероглифов"],
    "逻辑": ["练习用3组关联词造句（因果、转折、递进各一组）", "Practice 3 pairs of connectors (cause, contrast, progression)", "Практикуйте 3 типа союзов"],
    "书写": ["临摹10个汉字，注意笔顺和结构", "Practice writing 10 characters with correct stroke order", "Тренируйте написание 10 иероглифов"],
    "发音": ["跟读标准普通话录音5分钟，录音对比", "Shadow standard Mandarin audio for 5 min, record and compare", "Повторяйте за диктором 5 мин, записывайте и сравнивайте"],
    "声调": ["练习四声调对比：一-二声、二-三声、三-四声，每组5组词", "Practice tone pairs: 1-2, 2-3, 3-4, 5 word pairs each", "Тренируйте тоновые пары"],
    "流利度": ["朗读一段短文3遍，逐步加快语速", "Read a passage aloud 3 times, increasing speed each time", "Читайте текст вслух 3 раза, ускоряя темп"],
    "听力": ["听一段中文对话并做3道理解题", "Listen to a Chinese dialogue and answer 3 comprehension questions", "Прослушайте диалог и ответьте на 3 вопроса"],
    "阅读": ["阅读一篇中文短文并概括主要内容", "Read a Chinese passage and summarize the main idea", "Прочитайте текст и изложите основную мысль"],
    "写作": ["围绕一个主题写一段200字的短文", "Write a 200-character passage on a given topic", "Напишите текст из 200 иероглифов по теме"],
    "口语": ["进行5分钟即兴口语练习，描述今天发生的事", "Do 5 minutes of impromptu speaking about today's events", "5 минут спонтанной речи о событиях дня"],
  };
  const task = tasks[dim];
  if (!task) {
    if (lang === "ru") return `Целенаправленно тренируйте "${dim}"`;
    if (lang === "en") return `Targeted practice for ${dim}`;
    return `针对${dim}进行专项训练`;
  }
  if (lang === "ru") return task[2];
  if (lang === "en") return task[1];
  return task[0];
}

function estimateLevel(dims: { dimension: string; avgScore: number }[]): string {
  if (dims.length === 0) return "HSK4";
  const avg = dims.reduce((s, d) => s + d.avgScore, 0) / dims.length;
  if (avg >= 85) return "HSK5-6";
  if (avg >= 70) return "HSK4";
  if (avg >= 55) return "HSK3";
  return "HSK1-2";
}
