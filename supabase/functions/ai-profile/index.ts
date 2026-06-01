import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_MODEL    = "doubao-1-5-pro-32k-250115";

// ─── 系统提示词 ───────────────────────────────────────────────────────────────
function buildProfilePrompt(language: string): string {
  if (language === "ru") {
    return `Ты опытный преподаватель китайского языка и аналитик обучения.
На основе статистики успеваемости студента:
1. Выяви КОНКРЕТНЫЕ пробелы в знаниях (с точными %): «Ваш уровень ошибок в ______ составляет xx%»
2. Объясни ПРИЧИНЫ ошибок (путаница понятий, интерференция родного языка и т.д.)
3. Дай 3-5 КОНКРЕТНЫХ приоритетов для изучения (с примерами)
4. Отметь заметный прогресс и похвали студента
5. Предложи ежедневный план занятий на 2 недели
Используй ободряющий, дружелюбный тон. Ответ НА РУССКОМ языке.`;
  }
  if (language === "en") {
    return `You are an expert Chinese language teacher and learning analyst.
Based on the student's performance statistics:
1. Identify SPECIFIC knowledge gaps (with exact %): "Your error rate in ______ is xx%"
2. Explain the CAUSES of errors (concept confusion, native language interference, etc.)
3. Give 3-5 CONCRETE learning priorities (with examples)
4. Note any notable progress and encourage the student
5. Suggest a 2-week daily study plan
Use an encouraging, friendly tone. Respond IN ENGLISH.`;
  }
  // 中文默认
  return `你是一位拥有10年以上对外汉语教学经验的 HSK 专家级教师和学习数据分析师。
根据学生的学习统计数据，请按以下结构输出分析（直接输出内容，不要标题格式）：

【知识漏洞诊断】
- 指出具体的知识薄弱点（附精确百分比），格式如："你在……方面的错误率达到xx%，特别是……"
- 分析错误的根本原因（概念混淆、母语负迁移等）

【进步亮点】
- 指出学生最近的明显进步，给予具体鼓励

【优先突破点】
- 按优先级列出3-5个最需要强化的知识点，每个附一个典型例子或练习方向

【两周学习计划】
- 给出具体可执行的每日学习建议（每条一行，简洁）

语气温暖鼓励，像一对一家教一样亲切。`;
}

// ─── 构建用户消息 ──────────────────────────────────────────────────────────────
function buildUserMessage(stats: ProfileStats, language: string): string {
  const lines: string[] = [];
  const L = (zh: string, en: string, ru: string) =>
    language === "en" ? en : language === "ru" ? ru : zh;

  lines.push(`${L("学生学习统计数据", "Student Learning Statistics", "Статистика студента")}:`);
  lines.push(`- ${L("总批改记录数", "Total correction records", "Всего записей")}: ${stats.totalRecords}`);
  lines.push(`- ${L("学习时间跨度", "Learning span", "Период обучения")}: ${stats.daySpan} ${L("天", "days", "дней")}`);
  lines.push(`- ${L("模块分布", "Module breakdown", "По модулям")}: ${JSON.stringify(stats.moduleBreakdown)}`);

  if (stats.avgScoreByDimension && Object.keys(stats.avgScoreByDimension).length > 0) {
    lines.push(`\n${L("各维度平均分（满分100）", "Average score by dimension (out of 100)", "Средний балл по измерениям (из 100)")}:`);
    Object.entries(stats.avgScoreByDimension).forEach(([k, v]) => {
      lines.push(`  ${k}: ${v}${L("分", "pts", "б.")}`);
    });
  }

  if (stats.weakDimensions.length > 0) {
    lines.push(`\n${L("薄弱维度（低于60分）", "Weak dimensions (below 60)", "Слабые измерения (ниже 60)")}:`);
    stats.weakDimensions.forEach(d => lines.push(`  - ${d.name}: ${d.score}${L("分", "pts", "б.")}`));
  }

  if (stats.errorPatterns.length > 0) {
    lines.push(`\n${L("高频错误类型（Top5）", "Top 5 error patterns", "Топ-5 типов ошибок")}:`);
    stats.errorPatterns.slice(0, 5).forEach((e, i) => {
      lines.push(`  ${i + 1}. ${e.type} (${L("出现", "occurred", "встретилось")} ${e.count} ${L("次", "times", "раз")})`);
    });
  }

  if (stats.scoreTrend.length >= 2) {
    const first = stats.scoreTrend[0].avg;
    const last  = stats.scoreTrend[stats.scoreTrend.length - 1].avg;
    const diff  = last - first;
    lines.push(`\n${L("成绩趋势", "Score trend", "Тренд оценок")}: ${diff >= 0 ? "+" : ""}${diff.toFixed(1)}${L("分（近期对比初始）", "pts (recent vs initial)", "б. (последнее vs начало)")}`);
  }

  if (stats.examStats) {
    lines.push(`\n${L("考题解析记录", "Exam analysis records", "Записи анализа экзамена")}: ${stats.examStats.count} ${L("次", "times", "раз")}`);
    if (stats.examStats.topLevels.length > 0) {
      lines.push(`  ${L("主要练习级别", "Main levels practiced", "Основные уровни")}: ${stats.examStats.topLevels.join(", ")}`);
    }
  }

  return lines.join("\n");
}

// ─── 统计数据类型 ─────────────────────────────────────────────────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { stats, language = "zh" } = await req.json() as {
      stats: ProfileStats;
      language?: string;
    };

    const apiKey = Deno.env.get("DOUBAO_API_KEY");

    // ── 无 API Key：返回 mock 流 ──────────────────────────────────────────────
    if (!apiKey) {
      const mockText = language === "ru"
        ? "⚠️ API ключ не настроен. Это демо-ответ.\n\n【Пробелы в знаниях】\nНа основе ваших данных рекомендуем уделить особое внимание грамматике и лексике."
        : language === "en"
        ? "⚠️ API key not configured. This is a mock response.\n\n【Knowledge Gaps】\nBased on your data, we recommend focusing on grammar and vocabulary."
        : "⚠️ API Key 未配置，以下为示例内容。\n\n【知识漏洞诊断】\n根据您的学习数据，建议重点强化语法和词汇积累。\n\n【进步亮点】\n您坚持学习的态度值得表扬！\n\n【优先突破点】\n1. 语法结构\n2. 词汇扩展\n3. 书写规范";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const char of mockText) {
            controller.enqueue(encoder.encode(char));
          }
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { ...cors, "Content-Type": "text/event-stream; charset=utf-8" },
      });
    }

    // ── 调用豆包流式 API ──────────────────────────────────────────────────────
    const doubaoResp = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DOUBAO_MODEL,
        stream: true,
        max_tokens: 1500,
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

    // ── 透传 SSE 流，只提取 content delta ────────────────────────────────────
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
          } catch { /* 跳过非JSON行 */ }
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
