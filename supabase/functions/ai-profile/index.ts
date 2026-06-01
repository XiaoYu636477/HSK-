import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_MODEL    = "doubao-1-5-pro-32k-250115";

function buildProfilePrompt(language: string): string {
  if (language === "ru") {
    return `Ты опытный преподаватель китайского языка (15 лет стажа), сертифицированный эксперт HSK3.0 и аналитик учебных данных.

На основе предоставленной статистики студента составь глубокий аналитический отчёт.

Твой ответ должен содержать 5 разделов (каждый начинается с заголовка ###):

### Диагностика знаний
- Укажи КОНКРЕТНЫЕ пробелы с точными процентами: "Ваш уровень ошибок в [навык] составляет X%"
- Объясни ГЛУБИННЫЕ ПРИЧИНЫ каждой слабости (интерференция родного языка, спутанность понятий, недостаток практики)
- Укажи, какому уровню HSK3.0 соответствуют текущие навыки студента по каждому измерению

### Точки роста
- Отметь 2-3 заметных улучшения (конкретные цифры прогресса)
- Похвали студента искренне и конкретно

### Приоритеты на прорыв
- 3-5 пунктов по приоритету, каждый с:
  - Конкретной проблемой
  - Её причиной
  - Планом действий на 1 неделю
  - Ожидаемым результатом

### HSK3.0 диагностика
- Оцени текущий комплексный уровень HSK (1-6)
- Определи реалистичную цель на следующий месяц
- Укажи разрыв между текущим и целевым уровнем
- Конкретные шаги для сокращения разрыва

### План на 2 недели
- Конкретные ежедневные задания с указанием времени
- Каждое задание связано с приоритетной областью
- Включи разнообразие: чтение, аудирование, письмо, грамматика

Используй ободряющий, профессиональный тон. Ответ НА РУССКОМ языке.`;
  }
  if (language === "en") {
    return `You are an expert Chinese language teacher (15 years), certified HSK3.0 specialist, and learning data analyst.

Based on the student's performance statistics, create a deep analytical report.

Your response must contain 5 sections (each starting with ###):

### Knowledge Diagnosis
- Identify SPECIFIC gaps with exact percentages: "Your error rate in [skill] is X%"
- Explain ROOT CAUSES of each weakness (L1 interference, concept confusion, lack of practice)
- Map current skills to HSK3.0 levels per dimension

### Growth Highlights
- Note 2-3 notable improvements (cite specific numbers)
- Give sincere, specific praise

### Breakthrough Priorities
- 3-5 priority-ranked items, each with:
  - Specific problem
  - Root cause
  - 1-week action plan
  - Expected outcome

### HSK3.0 Assessment
- Estimate current composite HSK level (1-6)
- Set realistic 1-month target
- Identify gap between current and target
- Concrete steps to bridge the gap

### 2-Week Study Plan
- Specific daily tasks with time estimates
- Each task linked to a priority area
- Include variety: reading, listening, writing, grammar

Use encouraging, professional tone. Respond IN ENGLISH.`;
  }
  return `你是一位拥有15年对外汉语教学经验的 HSK3.0 认证专家教师和学习数据分析师。
你擅长从数据中发现深层学习规律，给出科学、精准、可执行的诊断和建议。

请根据学生的学习统计数据，按以下5个板块输出深度分析报告（每板块以 ### 开头）：

### 知识诊断
- 指出具体的知识薄弱点（附精确百分比数据），如："你在语法方面的错误率达到X%，尤其集中在补语结构（Y%）和关联词搭配（Z%）"
- 分析每项弱点的深层原因（母语负迁移/概念混淆/练习强度不足/输入量不够/教学盲区）
- 将学生当前各项能力映射到 HSK3.0（2021版）的对应级别

### 进步亮点
- 指出2-3个明显进步的方向，引用具体数字（如"词汇得分从62提升到78"）
- 用真诚具体的语言肯定学生的努力

### 突破优先级
- 按优先级列出4-5个最需要突破的知识点，每个附：
  - 具体问题描述
  - 根本原因分析
  - 一周内可执行的行动计划
  - 预期效果

### HSK3.0 等级评估
- 评估学生当前综合 HSK 等级（1-6级范围）
- 制定下个月可达成的目标等级
- 分析当前水平和目标等级的差距
- 给出跨越差距的具体路径

### 两周学习计划
- 每天一个具体可执行的学习任务（附时长），共14天
- 每日任务对应一个优先突破领域
- 任务类型多样化：阅读、听力、书写、语法、口语交替安排
- 周末安排复习和自测

语气温暖鼓励，像一对一家教一样亲切专业。`;
}

function buildUserMessage(stats: ProfileStats, language: string): string {
  const lines: string[] = [];
  const L = (zh: string, en: string, ru: string) =>
    language === "en" ? en : language === "ru" ? ru : zh;

  lines.push(`${L("学生学习统计数据", "Student Learning Statistics", "Статистика студента")}:`);
  lines.push(`- ${L("总批改记录数", "Total records", "Всего записей")}: ${stats.totalRecords}`);
  lines.push(`- ${L("学习时间跨度", "Learning span", "Период")}: ${stats.daySpan} ${L("天", "days", "дней")}`);
  lines.push(`- ${L("使用模块", "Modules used", "Модули")}: ${JSON.stringify(stats.moduleBreakdown)}`);

  if (stats.avgScoreByDimension && Object.keys(stats.avgScoreByDimension).length > 0) {
    lines.push(`\n${L("各维度平均分（满分100）", "Average scores (out of 100)", "Средний балл (из 100)")}:`);
    Object.entries(stats.avgScoreByDimension).forEach(([k, v]) => {
      lines.push(`  ${k}: ${v}${L("分", "pts", "б.")}`);
    });
  }

  if (stats.weakDimensions.length > 0) {
    lines.push(`\n${L("薄弱维度（低于60分）", "Weak dimensions (below 60)", "Слабые измерения (<60)")}:`);
    stats.weakDimensions.forEach(d => lines.push(`  - ${d.name}: ${d.score}${L("分", "pts", "б.")}`));
  }

  if (stats.errorPatterns.length > 0) {
    lines.push(`\n${L("高频错误类型 Top5", "Top 5 error types", "Топ-5 ошибок")}:`);
    stats.errorPatterns.slice(0, 5).forEach((e, i) => {
      lines.push(`  ${i + 1}. ${e.type} — ${e.count} ${L("次", "times", "раз")}`);
    });
  }

  if (stats.scoreTrend.length >= 2) {
    const first = stats.scoreTrend[0].avg;
    const last  = stats.scoreTrend[stats.scoreTrend.length - 1].avg;
    const diff  = last - first;
    lines.push(`\n${L("成绩趋势", "Score trend", "Тренд")}: ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} ${L("分", "pts", "б.")}`);
  }

  if (stats.examStats) {
    lines.push(`\n${L("考题解析记录", "Exam records", "Экзамены")}: ${stats.examStats.count} ${L("次", "times", "раз")}`);
    if (stats.examStats.topLevels.length > 0) {
      lines.push(`  ${L("练习级别", "Levels", "Уровни")}: ${stats.examStats.topLevels.join(", ")}`);
    }
  }

  lines.push(`\n${L("请按5个板块输出完整的分析报告。", "Please output the full 5-section report.", "Выдайте полный отчёт из 5 разделов.")}`);

  return lines.join("\n");
}

interface ScoreTrendPoint { period: string; avg: number; }
interface WeakDimension  { name: string; score: number; }
interface ErrorPattern   { type: string; count: number; }
interface ExamStats      { count: number; topLevels: string[]; }

interface ProfileStats {
  totalRecords:       number;
  daySpan:            number;
  moduleBreakdown:    Record<string, number>;
  avgScoreByDimension: Record<string, number>;
  weakDimensions:     WeakDimension[];
  errorPatterns:      ErrorPattern[];
  scoreTrend:         ScoreTrendPoint[];
  examStats:          ExamStats | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { stats, language = "zh" } = await req.json() as {
      stats: ProfileStats;
      language?: string;
    };

    const apiKey = Deno.env.get("DOUBAO_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "AI service not configured",
        text: language === "zh"
          ? "AI 服务未配置，请联系管理员。"
          : language === "ru"
          ? "ИИ-сервис не настроен."
          : "AI service not configured."
      }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const doubaoResp = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DOUBAO_MODEL,
        stream: true,
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          { role: "system", content: buildProfilePrompt(language) },
          { role: "user",   content: buildUserMessage(stats, language) },
        ],
      }),
    });

    if (!doubaoResp.ok) {
      const err = await doubaoResp.text();
      throw new Error(`Doubao API error: ${err}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          } catch { /* skip non-JSON */ }
        }
      },
    });

    return new Response(doubaoResp.body!.pipeThrough(transformStream), {
      headers: {
        ...cors,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (e) {
    console.error("ai-profile error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
