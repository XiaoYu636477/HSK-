import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
      return new Response(
        JSON.stringify({ error: "未登录" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(
        JSON.stringify({ error: "未登录" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 获取用户历史批改记录
    const { data: corrections } = await supabase
      .from("corrections")
      .select("radar_data, module, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!corrections || corrections.length === 0) {
      return new Response(
        JSON.stringify({
          weak_dimensions: [],
          plan_content: "暂无学习数据，请先完成一些批改或分析任务。",
          exercises: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 统计薄弱维度
    const dimensionScores: Record<string, number[]> = {};
    corrections.forEach((c: any) => {
      if (c.radar_data) {
        Object.entries(c.radar_data).forEach(([dim, score]) => {
          if (!dimensionScores[dim]) dimensionScores[dim] = [];
          dimensionScores[dim].push(score as number);
        });
      }
    });

    const weakDimensions = Object.entries(dimensionScores)
      .map(([dim, scores]) => ({
        dimension: dim,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .filter((d) => d.avgScore < 75)
      .sort((a, b) => a.avgScore - b.avgScore);

    // 生成学习计划
    const planContent = generateLearningPlan(weakDimensions);
    const exercises = generateExercises(weakDimensions);

    // 保存学习计划
    await supabase.from("learning_plans").insert({
      user_id: user.id,
      weak_dimensions: weakDimensions,
      plan_content: planContent,
      exercises: exercises,
    });

    return new Response(
      JSON.stringify({
        weak_dimensions: weakDimensions,
        plan_content: planContent,
        exercises: exercises,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("处理请求失败:", error);
    return new Response(
      JSON.stringify({ error: "服务器内部错误" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateLearningPlan(weakDimensions: any[]) {
  if (weakDimensions.length === 0) {
    return {
      title: "学习计划",
      description: "你的各项能力都很均衡，继续保持！",
      daily_tasks: [
        { task: "每天阅读一篇中文短文", duration: "15分钟" },
        { task: "练习写一段中文日记", duration: "10分钟" },
      ],
    };
  }

  const dimNames = weakDimensions.map((d) => d.dimension).join("、");
  return {
    title: "个性化学习计划",
    description: `根据你的历史学习数据，你在${dimNames}方面需要加强。以下是为你定制的每日学习计划：`,
    daily_tasks: weakDimensions.slice(0, 3).map((d, i) => ({
      task: getTaskForDimension(d.dimension),
      duration: "20分钟",
      priority: i === 0 ? "高" : "中",
    })),
  };
}

function getTaskForDimension(dim: string): string {
  const tasks: Record<string, string> = {
    "词汇": "每天学习10个新词汇，并用每个词造一个句子",
    "语法": "完成3道语法改错题，复习相关语法规则",
    "结构": "阅读一篇范文，分析其段落结构",
    "表达": "用中文写一段100字左右的短文",
    "逻辑": "练习用关联词（因为…所以、虽然…但是）造句",
    "书写": "每天练习书写10个汉字",
    "发音": "跟读标准普通话录音，注意声调变化",
    "声调": "练习四声调对比训练",
    "流利度": "朗读一段中文短文，注意语速和停顿",
    "听力": "每天听一段中文对话并做听力练习",
    "阅读": "阅读一篇中文文章并回答问题",
    "写作": "每周写一篇中文短文",
    "口语": "每天进行5分钟口语练习",
  };
  return tasks[dim] || `针对${dim}进行专项练习`;
}

function generateExercises(weakDimensions: any[]) {
  const exercises = [];
  if (weakDimensions.length > 0) {
    exercises.push({
      type: "改错题",
      question: "找出下面句子中的错误：虽然天气很冷，但是我穿了厚衣服。",
      options: ["A. "虽然"用错了", "B. "但是"用错了", "C. 句子没有错误", "D. "很"用错了"],
      answer: "C",
      explanation: "这个句子语法正确，"虽然……但是……"搭配使用没有问题。",
    });
    exercises.push({
      type: "造句题",
      question: "请用"越来越"造一个句子",
      keyword: "越来越",
      sample_answer: "我的中文水平越来越高了。",
    });
  }
  if (weakDimensions.length > 1) {
    exercises.push({
      type: "填空题",
      question: "他每天早上___六点起床。",
      options: ["A. 在", "B. 是", "C. 有", "D. 到"],
      answer: "A",
      explanation: "表示在某个时间点做某事，用"在"。",
    });
  }
  return exercises;
}