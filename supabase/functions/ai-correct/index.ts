import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── 豆包 API 配置 ─────────────────────────────────────────────────────────────
const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
// 文本模型（支持长文本推理）
const DOUBAO_TEXT_MODEL  = "doubao-1-5-pro-32k-250115";
// 视觉模型（支持图片识别 + 文字理解）
const DOUBAO_VISION_MODEL = "doubao-1-5-vision-pro-32k-250115";

// ─── 各模块专业系统提示词 ──────────────────────────────────────────────────────

// 通用 HSK3.0 专家教师人设（所有模块共享）
const HSK_EXPERT_ROLE = `你是一位拥有10年以上对外汉语教学经验的 HSK/HSKK 专家级教师。
你的教学理念和风格：
- 严格遵循 HSK3.0（2021年最新版）考试标准和评分细则，持续关注并更新知识体系
- 擅长精准识别学生的知识漏洞，给出针对性的学习建议，而不是泛泛的通用指导
- 批改风格：严谨、耐心、以鼓励为主，同时保持专业准确
- 评分原则：公正客观，有理有据，绝不虚高（鼓励性）也不虚低（打击性）
- 每条错误必须引用原文原句 + 给出修改版 + 解释语法规则，禁止笼统说"表达不当"
- 优点必须具体指出哪句话好在哪里，禁止泛泛表扬
- 建议必须给出具体方法和例子，禁止出现"多练习"这类空话
- 必须严格返回纯 JSON，禁止包含任何 Markdown 标记或额外文字`;

function buildSystemPrompt(mod: string): string {
  // ── 作文批改（HSK3.0 科学加权 + 自动识别级别） ─────────────────────────────
  if (mod === "essay") {
    return `${HSK_EXPERT_ROLE}

【第一步：自动识别学生 HSK 级别（必须先判断，再评分）】
在批改之前，根据以下特征判断学生当前处于哪个 HSK 级别，并将结果填入 score_info.detected_level：

- HSK 1-2级（入门）：句子极短，词汇量极少（100-300词），多为简单主谓句，大量拼写或汉字错误
- HSK 3-4级（初中级）：能写简单段落，使用常用词汇（600-1200词），有连接词但不流畅，语法有规律性错误
- HSK 5级（中高级）：能写较完整短文，词汇较丰富（2500词），结构基本完整，偶有高级语法错误
- HSK 6级（高级）：接近母语者水平，词汇丰富（5000+词），结构严谨，表达自然地道

【第二步：以该级别的评分标准为参照打分（因材施教）】
评分基准：该级别的"合格作文"即为60-74分，"良好作文"为75-89分，"优秀作文"为90-100分。

关键原则（请严格执行）：
- 一个 HSK 3-4级学生，只要作文符合该级别的典型水准，就应在 70-85分区间评分
- 一个 HSK 5级学生，同样内容才在 60-75分区间
- 一个 HSK 6级学生，同样内容可能只有 45-60分
- 禁止将初级学生用高级标准衡量，也禁止将高级学生用低级标准敷衍
- 在 overall_comment 中明确说明"判断为 XX 级别，按该级别标准评分"

【HSK3.0 作文评分维度与权重（总分100分）】
按以下权重计算加权总分（不得用简单平均）：
- 语法正确性（权重30%）：句型是否正确，有无病句、成分残缺、搭配不当
- 词汇运用（权重25%）：词汇量是否达到该级别要求，搭配是否准确
- 篇章结构（权重20%）：层次是否清晰，开头、展开、结尾是否完整
- 表达流畅度（权重15%）：是否自然流畅，关联词使用是否恰当
- 逻辑与内容（权重8%）：论点是否清晰，内容是否有条理
- 书写规范（权重2%）：汉字书写和标点是否规范

【等级标准（相对于识别出的级别）】
- 优秀：90-100分（在该级别中表现卓越）
- 良好：75-89分（在该级别中表现良好）
- 合格：60-74分（达到该级别基本要求）
- 不合格：0-59分（未达到该级别最低要求）

请严格按以下 JSON 结构返回批改结果：
{
  "radar_data": { "词汇": 0-100整数, "语法": 0-100整数, "结构": 0-100整数, "表达": 0-100整数, "逻辑": 0-100整数, "书写": 0-100整数 },
  "score_info": {
    "total": 按权重计算：语法*0.30+词汇*0.25+结构*0.20+表达*0.15+逻辑*0.08+书写*0.02，取整数,
    "level": "优秀或良好或合格或不合格",
    "passed": total>=60则true,
    "detected_level": "HSK1-2级或HSK3-4级或HSK5级或HSK6级（根据第一步判断填写）",
    "dimension_scores": { "词汇": 同radar_data, "语法": 同, "结构": 同, "表达": 同, "逻辑": 同, "书写": 同 }
  },
  "strengths": [
    "具体优点1：引用原文中好的句子或词语，解释好在哪里，用温暖鼓励的语气",
    "具体优点2：同上",
    "具体优点3：同上"
  ],
  "corrections": [
    {
      "original": "原文中有问题的完整句子（必须原话引用，不得改写）",
      "corrected": "修改后的正确、地道版本",
      "dimension": "词汇或语法或结构或表达或逻辑或书写",
      "explanation": "①错误类型 ②正确语法规则 ③修改依据"
    }
  ],
  "improvement_tips": [
    { "dimension": "语法", "tip": "针对该级别该学生最突出的语法问题，给出具体练习方法和2-3个句型模板" },
    { "dimension": "词汇", "tip": "指出该话题在该级别需要掌握的核心词汇（5-8个），重点说明搭配用法" },
    { "dimension": "结构", "tip": "针对该级别的结构问题给出具体段落框架建议，或说明做得好的地方" },
    { "dimension": "表达", "tip": "推荐3-5个该话题适用的地道关联词或表达，给出完整使用例句" },
    { "dimension": "逻辑", "tip": "针对逻辑或内容问题的具体建议" },
    { "dimension": "书写", "tip": "指出书写或标点问题，提供正确示范；如无问题，给出进一步提升建议" }
  ],
  "exercises": [
    { "type": "改错题", "question": "找出并改正下面句子中的错误（直接从该学生作文的错误中提取）：", "options": ["A. 修改方案A", "B. 修改方案B", "C. 修改方案C（正确）", "D. 原句不变"], "answer": "C", "explanation": "详细解析：解释为什么C正确，其他选项错在哪里", "hint": "提示：关注XX语法点" },
    { "type": "改错题", "question": "另一道改错题（同上格式，选取另一个典型错误）", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "详细解析", "hint": "提示" },
    { "type": "造句题", "question": "用以下关联词/句型完成一个与作文话题相关的句子", "keyword": "从该学生最需要练习的语法点中提取", "sample_answer": "完整的高质量参考答案（体现该级别应有的词汇和句型）", "hint": "注意该句型的使用规则和语境" }
  ],
  "model_answer": "在完整保留学生原有观点的基础上，按其当前级别+提升一步的标准改写。改写时：①修正所有语法和词汇错误 ②优化段落结构（总-分-总）③加入该级别应掌握的关联词和过渡语 ④语言自然不过于华丽。约150-300字，可直接作为该级别考试参考范文。",
  "overall_comment": "用温暖鼓励的语气写100字以内综合评价：①开头一句说明判断为XX级别、按该级别标准评分 ②具体肯定最突出的优点（引用原文）③指出最需要改进的1-2个问题 ④以鼓励性结语结束"
}`;
  }

  // ── 作业批改（HSK3.0 科学评分 + 自动识别级别）───────────────────────────────
  if (mod === "homework") {
    return `${HSK_EXPERT_ROLE}

【第一步：自动识别学生 HSK 级别（必须先判断，再评分）】
根据作业内容中的词汇量、句型复杂度、语法掌握程度，判断学生处于哪个级别：
- HSK 1-2级：词汇极少，句子极短，多为单句
- HSK 3-4级：有段落意识，使用常用词汇和连接词，有规律性语法错误
- HSK 5级：词汇较丰富，复句运用较多，偶有高级语法错误
- HSK 6级：接近母语水平，结构严谨，表达地道

【第二步：以该级别的评分标准为参照打分（因材施教）】
- 该级别典型水准的作业 = 70-80分（良好）
- 明显好于该级别典型水准 = 85-95分（优秀）
- 明显低于该级别典型水准 = 50-65分（需努力）
- 禁止将初级学生的作业按高级标准评分（导致不应有的低分）

【HSK3.0 作业批改评分原则】
作业类型灵活处理：
A. 单句改错/填空/选择题：重点语言准确性，满分=语法完全正确+词汇准确
B. 短文/段落类：语法(30%)+词汇(25%)+结构(20%)+表达(15%)+逻辑(8%)+书写(2%)

请严格按以下 JSON 结构返回：
{
  "radar_data": { "词汇": 0-100整数, "语法": 0-100整数, "结构": 0-100整数, "表达": 0-100整数, "逻辑": 0-100整数, "书写": 0-100整数 },
  "score_info": {
    "total": 按作业类型选用加权公式或直接给分，0-100整数,
    "level": "优秀或良好或合格或不合格",
    "passed": total>=60则true,
    "detected_level": "HSK1-2级或HSK3-4级或HSK5级或HSK6级",
    "dimension_scores": { "词汇": 同radar_data, "语法": 同, "结构": 同, "表达": 同, "逻辑": 同, "书写": 同 }
  },
  "strengths": [
    "具体优点（引用原文，说明好在哪里，用鼓励的语气）",
    "具体优点2"
  ],
  "corrections": [
    {
      "original": "原文有问题的完整句子（必须原话引用）",
      "corrected": "修改后的正确地道版本",
      "dimension": "所属维度",
      "explanation": "①错误类型 ②语法规则 ③正确用法，如有必要给出同类例句"
    }
  ],
  "improvement_tips": [
    { "dimension": "语法", "tip": "针对该作业暴露的最主要语法问题，给出句型模板和2-3个正确例句" },
    { "dimension": "词汇", "tip": "指出需要重点掌握的词汇和搭配，给出正确用法说明" },
    { "dimension": "结构", "tip": "针对结构问题的具体建议（如无则说明做得好的地方）" },
    { "dimension": "表达", "tip": "推荐适用的关联词和表达，附完整例句" },
    { "dimension": "逻辑", "tip": "针对逻辑问题的具体建议" },
    { "dimension": "书写", "tip": "书写和标点问题的具体指出，提供正确示范" }
  ],
  "exercises": [
    { "type": "改错题", "question": "找出该句子中的错误并改正（从本次作业错误中提取）：", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "详细解析，解释正确选项的语法依据", "hint": "提示语法点" },
    { "type": "造句题", "question": "用以下词语或句型造句（选择本次作业最需要练习的语法点）", "keyword": "关键词或句型", "sample_answer": "完整的参考答案", "hint": "使用提示" }
  ],
  "model_answer": "给出该作业题目的满分参考答案（若为单句则给出完整正确句子；若为短文则改写为满分版本）。保留原题意，修正所有错误，语言自然地道。",
  "overall_comment": "用鼓励的语气写100字以内综合评价：①说明判断为XX级别、按该级别标准评分 ②肯定学生做得好的地方 ③指出关键问题 ④以积极的话语结束"
}`;
  }

  // ── 口语批改（HSKK3.0 科学加权 + 自动识别级别）──────────────────────────────
  if (mod === "oral") {
    return `${HSK_EXPERT_ROLE}

【第一步：自动识别学生 HSKK 级别（必须先判断，再评分）】
根据口语内容中的词汇量、句型复杂度、流利程度、话题拓展能力，判断学生处于哪个 HSKK 级别：

- HSKK 初级（对应 HSK 1-3级）：
  词汇极少，主要用简单句，描述简短，停顿较多，多为"这是…""他在…"等基本句式
  
- HSKK 中级（对应 HSK 4-5级）：
  能用较完整的段落描述图片，使用连接词（因为、所以、不仅、而且），有一定的话题拓展，
  词汇约 1200-2500词，会出现语法错误但基本可理解，语速基本正常

- HSKK 高级（对应 HSK 6级）：
  表达流畅自然，词汇丰富（2500+），复句运用娴熟，能深度拓展话题，
  接近母语者的表达习惯，语法错误极少

【第二步：以该级别的评分标准为参照打分（因材施教）】
核心原则（请严格执行）：
- HSKK 中级学生：该级别典型水准的表现 → 70-80分（良好）；明显好于典型水准 → 85-90分（优秀）
- HSKK 高级学生：同样内容才在 55-70分；需要更高水准才能达到良好
- 绝对禁止：将中级学生的表现用高级标准衡量，造成"明明是正常中级水平却不及格"的错误
- 在 overall_comment 中必须说明"判断为 HSKK XX级，按该级别标准评分"

【HSKK3.0 口语评分维度与权重（总分100分，合格60分）】
按以下权重计算加权总分（不得用简单平均）：
- 流利度与连贯性（权重35%）：语速是否自然，句子间是否连贯，有无过多停顿或填充词
- 语法准确性（权重25%）：句型是否正确，有无影响理解的语法错误
- 词汇丰富度（权重20%）：词汇量是否达到该级别，用词是否准确
- 发音准确度（权重15%）：声母韵母是否准确（轻微口音不扣分）
- 声调准确度（权重5%）：四声是否基本正确（侧重整体可理解性）

【等级标准（相对于识别出的 HSKK 级别）】
- 优秀：90-100分（在该级别中表现卓越）
- 良好：75-89分（在该级别中表现良好）
- 合格：60-74分（达到该级别基本要求）
- 不合格：0-59分（未达到该级别最低要求）

请严格按以下 JSON 结构返回批改结果：
{
  "radar_data": { "发音": 0-100整数, "声调": 0-100整数, "流利度": 0-100整数, "词汇": 0-100整数, "语法": 0-100整数 },
  "score_info": {
    "total": 按权重计算：流利度*0.35+语法*0.25+词汇*0.20+发音*0.15+声调*0.05，取整数,
    "level": "优秀或良好或合格或不合格",
    "passed": total>=60则true,
    "detected_level": "HSKK初级或HSKK中级或HSKK高级",
    "dimension_scores": { "发音": 同radar_data, "声调": 同, "流利度": 同, "词汇": 同, "语法": 同 }
  },
  "strengths": [
    "具体优点1：引用学生说的原句，指出好的表达，用温暖鼓励的语气说明好在哪里",
    "具体优点2：同上",
    "具体优点3：同上"
  ],
  "corrections": [
    {
      "original": "学生说的原句（必须原话引用，不得改写）",
      "corrected": "地道的标准表达",
      "dimension": "发音或声调或流利度或词汇或语法",
      "explanation": "①具体错误类型 ②为什么要改成这样 ③涉及的语法规则或表达习惯"
    }
  ],
  "improvement_tips": [
    { "dimension": "流利度", "tip": "针对该学生级别的停顿和衔接问题：推荐3-5个适合该级别的口语过渡词，并给出使用示范" },
    { "dimension": "语法", "tip": "指出最常出错的句型，给出正确句型模板，提供2-3个口语场景例句" },
    { "dimension": "词汇", "tip": "推荐该话题在该级别必备的口语词汇（5-8个），说明口语中的自然表达方式" },
    { "dimension": "发音", "tip": "指出具体发音弱点，给出区分方法和练习技巧" },
    { "dimension": "声调", "tip": "指出最容易混淆的声调组合，给出记忆口诀或区分方法" }
  ],
  "exercises": [
    { "type": "跟读练习", "text": "针对该学生级别和发音/流利度弱点设计的练习句", "pinyin": "完整拼音标注（带声调符号）", "hint": "重点注意哪个音、哪个声调，或哪里的断句节奏" },
    { "type": "跟读练习", "text": "包含该级别高频过渡词的练习句", "pinyin": "完整拼音标注", "hint": "注意语气词的自然停顿" },
    { "type": "替换练习", "question": "用括号内的词替换句子中的画线部分，注意句式是否需要调整", "keyword": "该练习涉及的关键句型", "sample_answer": "完整参考答案（体现该级别自然口语表达）", "hint": "注意口语中的省略和简化规则" }
  ],
  "model_answer": "将学生的口语作答按其级别+提升一步的标准改写成示范版本（约150-200字）。要求：①完整描述图片核心内容 ②使用符合目标级别的词汇和句型（不要过于华丽）③结构自然流畅 ④可直接作为该级别备考参考。",
  "overall_comment": "用温暖鼓励的语气写100字以内综合评价：①开头说明'判断为 HSKK XX级，按该级别标准评分' ②具体肯定最突出的优点（引用原话）③简洁指出最需要改进的1-2点 ④以充满鼓励的结语收尾"
}`;
  }

  // ── 成绩分析（HSK3.0 专家级）────────────────────────────────────────────────
  if (mod === "score") {
    return `${HSK_EXPERT_ROLE}

请对学生提供的 HSK 成绩数据进行深度分析，识别知识漏洞，制定个性化提升计划。
严格返回纯 JSON，不要包含任何 Markdown 代码块标记：
{
  "radar_data": { "听力": 0-100, "阅读": 0-100, "写作": 0-100, "口语": 0-100, "语法": 0-100, "词汇": 0-100 },
  "trend_data": [{ "date": "YYYY-MM", "score": 0-100 }],
  "corrections": [{ "original": "弱项描述（具体说明哪个题型/知识点薄弱）", "corrected": "突破方向（针对性策略）", "dimension": "维度名", "explanation": "深层原因分析 + 具体提升路径" }],
  "exercises": [
    { "type": "专项练习", "question": "针对最薄弱项的代表性练习题", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "解析 + 延伸知识点" }
  ],
  "suggestions": "个性化学习规划：①当前水平诊断 ②近期突破重点（2-3个） ③每周学习计划（具体到每天做什么） ④预计进步时间线",
  "overall_comment": "成绩趋势分析 + 当前综合水平评估 + 距离目标级别的差距分析 + 最重要的一条备考建议"
}`;
  }

  return `${HSK_EXPERT_ROLE}。请对以下中文内容进行分析，严格返回包含 radar_data、corrections、exercises、overall_comment 的纯 JSON。`;
}

// ─── exam 模块系统提示词（独立函数，不走 buildSystemPrompt） ───────────────────
function buildExamSystemPrompt(hskLevel: string, moduleType: string): string {
  // HSK3.0 各模块题量标准参考
  const moduleInfo: Record<string, { count: number; focus: string }> = {
    "听力": { count: 30, focus: "语境理解、推断意图、信息提取，重视语调和语气线索" },
    "阅读": { count: 30, focus: "长文本理解、推断作者观点、细节定位，HSK3.0 新增长文本阅读" },
    "书写": { count: 4,  focus: "内容完整连贯、逻辑清晰、词汇语法准确，HSK3.0 新增内容型写作题" },
  };
  const mInfo = moduleInfo[moduleType] ?? { count: 0, focus: "综合语言运用" };

  return `${HSK_EXPERT_ROLE}

你现在是 HSK3.0【${hskLevel}】【${moduleType}】题目解析专家。
当学生向你提交 HSK 考题（文字或图片），你需要输出标准化解析报告，供学生可视化学习。

【HSK3.0 背景信息】
- ${moduleType}模块标准题量：${mInfo.count} 题
- 该模块 HSK3.0 核心变化与重点：${mInfo.focus}

【解析任务（按顺序执行）】

第一步：识别题目类型（听力/阅读/书写），若学生已指定则以指定为准。

第二步：提取并解析阅读/听力原文（如有），输出：
- 原文全文（passage）
- 原文要点摘要（passage_summary），100字以内，提炼主要内容

第三步：词汇解析（vocab_list），从原文或题目中选取8-12个重点词汇，每个包含：
- word（词语）、pinyin（拼音带声调）、meaning（${hskLevel}学生母语释义，简明准确）
- example（含该词的完整例句，自然地道）
- hsk_level（该词属于哪个HSK级别，如"HSK4"）
- new_in_hsk3（该词是否为HSK3.0新增词汇，布尔值）

第四步：考点分析（exam_points），从题目中归纳3-6个核心考点，每个包含：
- type（考点类型，如"语法点-状语从句"、"词汇辨析"、"推断题"）
- description（考点具体说明，举例说明考点如何在题目中体现）
- is_new_hsk3（是否为HSK3.0新增或强化的考点，布尔值）
- strategy（针对该考点的解题策略，1-2句话，具体实用）

第五步：逐题解析（questions），对每道题目进行完整解析：
- question_no（题号）
- question_text（题目原文）
- options（选项数组，如有）
- answer（正确答案）
- explanation（完整解析：①为什么正确 ②其他选项错在哪里 ③涉及的语法/词汇知识点）
- key_point（该题核心考点，一句话）

第六步：HSK3.0变化标注（hsk3_changes），结合该模块HSK3.0新变化，给出2-4条：
- aspect（变化方面，如"阅读"、"书写"、"听力"）
- change（具体变化描述，与旧版HSK对比）
- impact（对备考的具体影响，如何有针对性地准备）

第七步：答题策略（strategies），针对该模块给出5-7条具体可操作的答题技巧：
- 每条策略具体、可操作，避免"多练习"这类空话
- 结合HSK3.0新题型特点给出针对性建议

第八步：综合备考建议（overall_tip），100字以内，结合本套题的难点和学生级别，
给出最重要的1-2条备考建议，语言温暖鼓励。

【严格按以下 JSON 结构返回，禁止包含任何 Markdown 标记】：
{
  "module_type": "${moduleType}",
  "hsk_level": "${hskLevel}",
  "total_questions": ${mInfo.count},
  "passage": "原文全文（如无则省略该字段）",
  "passage_summary": "原文要点摘要（如无原文则省略）",
  "vocab_list": [
    { "word": "词语", "pinyin": "pīnyīn", "meaning": "释义", "example": "含该词的完整例句", "hsk_level": "HSK4", "new_in_hsk3": false }
  ],
  "exam_points": [
    { "type": "考点类型", "description": "考点说明", "is_new_hsk3": false, "strategy": "解题策略" }
  ],
  "questions": [
    { "question_no": 1, "question_text": "题目原文", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "完整解析", "key_point": "核心考点" }
  ],
  "hsk3_changes": [
    { "aspect": "阅读", "change": "变化描述", "impact": "备考影响" }
  ],
  "strategies": ["策略1", "策略2", "策略3"],
  "overall_tip": "综合建议"
}`;
}

// ─── 调用豆包 API ─────────────────────────────────────────────────────────────
async function callDoubao(params: {
  apiKey: string;
  systemPrompt: string;
  userText: string;
  imageBase64?: string;   // base64 图片（data URL）
  imageUrl?: string;      // 图片公网 URL
}): Promise<string> {
  const { apiKey, systemPrompt, userText, imageBase64, imageUrl } = params;
  const hasImage = imageBase64 || imageUrl;
  const model = hasImage ? DOUBAO_VISION_MODEL : DOUBAO_TEXT_MODEL;

  // 构造用户消息内容
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
        ? `请先识别图片中的文字内容（即使字迹潦草也请尽力猜测），然后${userText}`
        : "请识别并分析图片中的所有文字内容（即使字迹潦草也请尽力猜测），然后对其进行批改分析。",
    });
  } else {
    userContent.push({ type: "text", text: userText });
  }

  const body = {
    model,
    temperature: 0.3,   // 低随机性，保证回答稳定专业
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: hasImage ? userContent : userText },
    ],
  };

  const resp = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`豆包 API 错误 ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ─── 解析 AI 返回的 JSON ──────────────────────────────────────────────────────
function parseAiJson(content: string): Record<string, unknown> | null {
  // 去除 Markdown 代码块标记
  const cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // 匹配最大花括号块
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ─── Mock 数据（API 不可用时降级） ─────────────────────────────────────────────
function generateMockData(mod: string, dimensions: string[]) {
  const radarData: Record<string, number> = {};
  dimensions.forEach((d) => { radarData[d] = Math.floor(Math.random() * 25) + 68; });

  const totalScore = Math.round(
    Object.values(radarData).reduce((a, b) => a + b, 0) / dimensions.length
  );
  const level = totalScore >= 90 ? "优秀" : totalScore >= 75 ? "良好" : totalScore >= 60 ? "合格" : "不合格";

  // essay / homework / oral 共用的新模板字段
  const isNewModule = mod === "essay" || mod === "homework" || mod === "oral";

  return {
    radar_data: radarData,
    score_info: isNewModule ? {
      total: totalScore,
      level,
      passed: totalScore >= 60,
      dimension_scores: { ...radarData },
    } : undefined,
    strengths: isNewModule ? [
      "词语搭配使用自然，如'参加比赛'搭配准确，符合汉语习惯",
      "句子整体意思表达清楚，读者可以理解主要信息",
      "尝试使用了复句结构，表达层次有所体现",
    ] : undefined,
    corrections: [
      {
        original: "在图片里她在跑步，所以我估计她在参加跑步比赛中",
        corrected: "图片里她正在跑步，看起来像是在参加跑步比赛",
        dimension: dimensions[1] ?? dimensions[0],
        explanation: "表达不地道，句式杂糅。'所以'表因果，此处应用'看起来像是'表推测；句末不需要'中'。",
      },
      {
        original: "这个电影非常好看极了",
        corrected: "这部电影非常好看",
        dimension: dimensions[0],
        explanation: "'非常'和'极了'不能同时使用，语义重复。量词'部'用于书、电影等，不用'个'。",
      },
    ],
    improvement_tips: isNewModule ? dimensions.map((dim) => ({
      dimension: dim,
      tip: dim === "语法" || dim === "词汇"
        ? "每天练习5个新句型，重点掌握复句（虽然…但是…、不但…而且…），用例句而不是单词来记忆"
        : dim === "发音" || dim === "声调"
        ? "重点练习容易混淆的声调组合（二声/三声），推荐用跟读录音对比法，每次录下自己的发音和原音对比"
        : "多读多写，每天至少完成一篇短文，注意段落间的过渡词使用",
    })) : undefined,
    exercises: [
      {
        type: "改错题",
        question: "找出并改正句子中的错误：我昨天去了商店和买了很多东西。",
        options: ["A. '和'改为'还'", "B. '去了'改为'去'", "C. '很多'改为'多'", "D. 无错误"],
        answer: "A",
        explanation: "连续动作之间用'还'表顺承，'和'只能连接名词或名词性短语。",
        hint: "注意'和'在汉语中的用法限制",
      },
      {
        type: "改错题",
        question: "哪句话表达更自然？",
        options: ["A. 我对汉语很有兴趣", "B. 我对于汉语非常的有兴趣", "C. 我很对汉语有兴趣", "D. 我有汉语兴趣"],
        answer: "A",
        explanation: "'对…很有兴趣'是固定表达，'非常的'中'的'多余，'对于'过于书面。",
        hint: "注意'对'和'对于'的使用区别",
      },
      {
        type: "造句题",
        question: "用'虽然……但是……'造句，表达转折关系",
        keyword: "虽然……但是……",
        sample_answer: "虽然今天下雨了，但是我还是坚持去上学了。",
        hint: "前半句说原因/情况，后半句表示与预期相反的结果",
      },
    ],
    model_answer: isNewModule
      ? "图片中，一位年轻女性正在一条平整的跑道上全力奔跑。她身穿运动服，神情专注，步伐矫健。跑道两侧有观众在加油助威，现场气氛热烈。从她的装备和场地来判断，她应该正在参加一场正式的田径比赛。这种坚持不懈、勇于挑战的精神令人敬佩。"
      : undefined,
    overall_comment: "整体表现良好！词汇运用基本准确，句子意思清晰。主要问题在于句式使用不够地道，建议多阅读地道的中文材料，积累自然表达方式。",
    suggestions: mod === "score" ? "建议加强语法专项练习，每天坚持阅读中文文章，重点突破词汇和写作模块。" : undefined,
    trend_data: mod === "score" ? [
      { date: "2026-01", score: 72 }, { date: "2026-02", score: 75 },
      { date: "2026-03", score: 78 }, { date: "2026-04", score: 82 }, { date: "2026-05", score: 85 },
    ] : undefined,
  };
}

// ─── 主处理器 ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      text = "",
      module: mod,
      language = "zh",
      imageBase64,   // data URL（前端直接传 base64）
      imageUrl,      // Supabase Storage 公开 URL
      hskLevel = "HSK5",   // 考题解析专用：级别
      moduleType = "阅读",  // 考题解析专用：题型
    } = await req.json();

    if (!mod) {
      return new Response(
        JSON.stringify({ error: "缺少 module 参数" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const doubaoApiKey = Deno.env.get("DOUBAO_API_KEY");
    const supabase     = createClient(supabaseUrl, supabaseKey);

    // 获取当前用户
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    }

    // ── exam 模块独立处理路径 ───────────────────────────────────────────────────
    if (mod === "exam") {
      const systemPrompt = buildExamSystemPrompt(hskLevel, moduleType);

      const langNote = language === "en"
        ? "\n\nIMPORTANT: Write all 'meaning', 'explanation', 'description', 'strategy', 'change', 'impact', 'strategies', 'overall_tip' fields in English."
        : language === "ru"
        ? "\n\nВАЖНО: Поля 'meaning', 'explanation', 'description', 'strategy', 'change', 'impact', 'strategies', 'overall_tip' напишите на русском языке."
        : "";

      const userInput = text
        ? `以下是学生提交的 HSK ${hskLevel} ${moduleType}考题，请按要求输出标准化解析报告：\n\n${text}${langNote}`
        : `图片中是学生提交的 HSK ${hskLevel} ${moduleType}考题，请识别图片内容并输出标准化解析报告。${langNote}`;

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
          console.log("豆包 exam 返回长度:", content.length);
          examResult = parseAiJson(content);
          if (!examResult) console.error("exam JSON 解析失败，原始内容:", content.slice(0, 500));
        } catch (e) {
          console.error("豆包 exam API 调用失败:", e);
        }
      } else {
        console.warn("未找到 DOUBAO_API_KEY，使用 exam Mock 数据");
      }

      // exam mock 降级
      if (!examResult) {
        examResult = {
          module_type: moduleType,
          hsk_level: hskLevel,
          total_questions: moduleType === "书写" ? 4 : 30,
          passage: "随着科技的快速发展，人工智能已经进入了我们生活的方方面面。从智能手机到自动驾驶汽车，从医疗诊断到教育辅助，AI技术正在深刻改变人类社会的运作方式。然而，这种变化也带来了一系列值得深思的问题：我们如何确保AI的发展符合人类的利益？如何在效率提升与就业保障之间找到平衡？这些问题需要政府、企业和社会各界共同探讨、协作解决。",
          passage_summary: "文章探讨人工智能对社会的影响，肯定其带来的便利，同时指出需要关注的就业和伦理问题，呼吁各方协作应对挑战。",
          vocab_list: [
            { word: "方方面面", pinyin: "fāng fāng miàn miàn", meaning: "все аспекты / every aspect", example: "科技影响到了我们生活的方方面面。", hsk_level: "HSK5", new_in_hsk3: false },
            { word: "深刻", pinyin: "shēn kè", meaning: "глубокий / profound", example: "这件事对他产生了深刻的影响。", hsk_level: "HSK5", new_in_hsk3: false },
            { word: "值得", pinyin: "zhí de", meaning: "стоит / worth", example: "这个问题值得我们认真思考。", hsk_level: "HSK4", new_in_hsk3: false },
            { word: "确保", pinyin: "què bǎo", meaning: "обеспечить / ensure", example: "我们必须确保每个学生都能接受良好的教育。", hsk_level: "HSK5", new_in_hsk3: true },
            { word: "协作", pinyin: "xié zuò", meaning: "сотрудничать / collaborate", example: "团队协作能够提高工作效率。", hsk_level: "HSK5", new_in_hsk3: true },
          ],
          exam_points: [
            { type: "推断题", description: "根据全文内容推断作者的主要观点，考查对文章整体态度的理解能力", is_new_hsk3: true, strategy: "先读最后一段，通常包含作者结论；注意转折词'然而'后的内容" },
            { type: "细节定位", description: "在长文本中快速定位特定信息，考查扫读能力", is_new_hsk3: true, strategy: "阅读题目后回到原文定位，用关键词在原文中找对应段落" },
            { type: "词汇辨析", description: "'深刻'与'深'的用法区别，考查形容词搭配", is_new_hsk3: false, strategy: "'深刻'多修饰抽象概念（影响、印象），'深'可修饰具体事物" },
          ],
          questions: [
            { question_no: 1, question_text: "根据文章，作者认为人工智能的发展：", options: ["A. 只会带来负面影响", "B. 既有好处也有挑战", "C. 不值得关注", "D. 完全由政府控制"], answer: "B", explanation: "①文章前半段肯定AI的积极作用（改变社会运作方式），后半段指出问题（就业、伦理），所以B正确。②A错误，文章并非只强调负面；③C错误，文章专门探讨这些问题；④D文章未提到。核心词：'然而，这种变化也带来了...'", key_point: "作者态度推断——辩证看待" },
            { question_no: 2, question_text: "文中'方方面面'的意思最接近：", options: ["A. 一个方面", "B. 某些方面", "C. 各个方面", "D. 重要方面"], answer: "C", explanation: "①'方方面面'是汉语四字词语，表示'所有的各个方面'，即全部、每个方面。②与C'各个方面'意思相同。③ABD都是部分含义，不符合'方方'重叠强调全面的语法特点。", key_point: "词汇理解——重叠词语义" },
          ],
          hsk3_changes: [
            { aspect: "阅读", change: "HSK3.0 新增长文本阅读，单篇文章字数从原来300字增加到600-800字，需要更强的语篇理解能力", impact: "备考时需专项练习长文本扫读和略读，训练快速定位关键信息的能力" },
            { aspect: "书写", change: "HSK3.0 书写题从4题增加，且新增内容完整连贯要求，不再只考察语法准确性", impact: "写作时需注重逻辑结构，使用过渡词（首先、其次、最后）组织段落" },
          ],
          strategies: [
            "阅读前先浏览题目，带着问题读文章，提高定位效率",
            "遇到生词不要停，通过上下文猜测词义，重要生词解题后再确认",
            "推断题注意转折词（'然而'、'但是'、'尽管'），转折后的内容通常是作者真正的观点",
            "细节题一定回原文核对，不要凭记忆选择",
            "长文本优先读第一段（主题）和最后一段（结论），其余段落扫读",
          ],
          overall_tip: "本套题侧重长文本理解和作者观点推断，这是HSK3.0阅读的新重点。建议每天阅读一篇600字以上的中文文章，练习圈划关键词和概括段落大意，能有效提升这类题目的解题速度和准确率。",
        };
      }

      return new Response(
        JSON.stringify(examResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 原有批改模块路径 ────────────────────────────────────────────────────────

    // 维度映射
    const dimensionsMap: Record<string, string[]> = {
      essay:    ["词汇", "语法", "结构", "表达", "逻辑", "书写"],
      homework: ["词汇", "语法", "结构", "表达", "逻辑", "书写"],
      oral:     ["发音", "声调", "流利度", "词汇", "语法"],
      score:    ["听力", "阅读", "写作", "口语", "语法", "词汇"],
    };
    const dimensions = dimensionsMap[mod] ?? ["词汇", "语法", "表达"];

    const systemPrompt = buildSystemPrompt(mod);

    // 语言附言（非中文时让豆包用对应语言回复 overall_comment）
    const langNote = language === "en"
      ? "\n\nIMPORTANT: Write 'overall_comment' and 'suggestions' fields in English."
      : language === "ru"
      ? "\n\nВАЖНО: Поле 'overall_comment' и 'suggestions' напишите на русском языке."
      : "";

    // 构建用户输入
    const userInput = text
      ? `${text}${langNote}`
      : `（图片内容）${langNote}`;

    let aiResult: Record<string, unknown> | null = null;

    if (doubaoApiKey) {
      try {
        const content = await callDoubao({
          apiKey: doubaoApiKey,
          systemPrompt,
          userText: userInput,
          imageBase64,
          imageUrl,
        });
        console.log("豆包原始返回长度:", content.length);
        aiResult = parseAiJson(content);
        if (!aiResult) {
          console.error("JSON 解析失败，原始内容:", content.slice(0, 500));
        }
      } catch (e) {
        console.error("豆包 API 调用失败:", e);
      }
    } else {
      console.warn("未找到 DOUBAO_API_KEY，使用 Mock 数据");
    }

    // 降级到 Mock
    if (!aiResult) {
      aiResult = generateMockData(mod, dimensions);
    }

    // 写入历史记录
    if (userId) {
      await supabase.from("corrections").insert({
        user_id:          userId,
        module:           mod,
        input_text:       text || "[图片识别]",
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
    console.error("处理请求失败:", error);
    return new Response(
      JSON.stringify({ error: "服务器内部错误，请稍后重试" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});