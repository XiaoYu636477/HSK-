import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── 豆包 API 配置 ─────────────────────────────────────────────────────────────
const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_TEXT_MODEL  = "doubao-1-5-pro-32k-250115";
const DOUBAO_VISION_MODEL = "doubao-1-5-vision-pro-32k-250115";

// ─── 保底分配置 ────────────────────────────────────────────────────────────────
const MIN_SCORE_MAP: Record<string, number> = {
  "HSK3-4":   65,  // HSK3-4 作文保底 65
  "HSK5-6":   70,  // HSK5-6 作文保底 70
  "HSKK中级": 60,  // HSKK中级保底 60
  "HSKK高级": 70,  // HSKK高级保底 70
};

// ─── 各模块专业系统提示词 ──────────────────────────────────────────────────────

const HSK_EXPERT_ROLE = `你是一位拥有10年以上对外汉语教学经验的 HSK/HSKK 专家级教师。
教学理念：严格遵循 HSK3.0（2021版）标准，精准识别知识漏洞，批改严谨耐心、以鼓励为主、专业准确。
评分原则：公正客观，有理有据，按学生所选级别的标准打分——不虚高、不压分。
铁律：每条错误必须引用原文原句 + 修改版 + 语法规则解释；优点必须具体指出好在哪里；建议必须给出具体方法。
必须严格返回纯 JSON，禁止包含任何 Markdown 标记或额外文字。`;

function buildSystemPrompt(mod: string, hskLevel?: string): string {
  // 智能判断级别分组
  const isLowEssay = !hskLevel || hskLevel.startsWith("HSK3") || hskLevel === "HSK3-4";
  const isLowOral  = !hskLevel || hskLevel.includes("中级") || hskLevel.includes("初级");
  // ── 作文批改 ───────────────────────────────────────────────────────────
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
    const excellentLine = isLowEssay ? "85～100" : "88～100";
    const goodLine      = isLowEssay ? "75～84"  : "78～87";

    return `${HSK_EXPERT_ROLE}

【学生级别】学生已选择 ${levelName}。你必须严格按此级别的评分标准批改，不得跨级评判。

【${levelName} 作文评分标准（满分100分，保底合格分${minScore}分）】
${isLowEssay ? "适用文体：短句作文、简单记叙文、书信、话题小短文。" : "适用文体：议论文、记叙文、应用文、长篇话题作文。"}

五大评分维度：
1. 内容（35分）：${dimContent}
2. 结构（20分）：${dimStruct}
3. 词汇（20分）：${dimVocab}
4. 语法（20分）：${dimGrammar}
5. 标点书写（5分）：标点使用规范，字迹工整，无明显错字、漏字。

分数档位：
- 优秀：${excellentLine}分
- 良好：${goodLine}分
- 合格（保底）：${minScore}～${minScore === 65 ? 74 : 77}分（只要作文写完、主题不跑偏、无大量严重病句，最低给到${minScore}分）
- 不合格：＜${minScore}分（仅空白/完全跑题/通篇病句才低于保底分）

【评分执行规则（严格执行）】
1. 严格按${levelName}的五大维度打分，保底分${minScore}是硬性底线——认真完成即不低于保底分。
2. 所有维度打分为0-100整数，加权总分取整。
3. 作文优点：至少3条，每条引用原文，说明具体好在哪里，温暖鼓励。
4. 错误订正：按"错别字&用词错误"、"语法&句式错误"、"标点&语序问题"三类分别列出。每条：原文→修正+错误类型+语法规则。
5. 优化参考范文：保留原文观点，修正所有错误，适当优化表达，150-300字。
6. 写作提分指导：3-5条具体建议，每条给出练习方法和示例，禁止"多练习"这类空话。

【输出 JSON 结构（严格按此格式）】
{
  "radar_data": { "词汇": 0-100, "语法": 0-100, "结构": 0-100, "表达": 0-100, "逻辑": 0-100, "书写": 0-100 },
  "score_info": {
    "total": 加权总分（逻辑*0.18+表达*0.17+结构*0.20+词汇*0.20+语法*0.20+书写*0.05，取整数）,
    "level": "优秀/良好/合格/不合格",
    "passed": total>=60,
    "detected_level": "${levelName}",
    "dimension_scores": { "词汇": 同radar_data, "语法": 同, "结构": 同, "表达": 同, "逻辑": 同, "书写": 同 }
  },
  "strengths": ["具体优点…", "具体优点…", "具体优点…"],
  "corrections": [
    { "original": "原句", "corrected": "修正句", "dimension": "词汇/语法/结构/表达/逻辑/书写", "explanation": "①错误类型 ②正确语法规则 ③修改依据" }
  ],
  "improvement_tips": [
    { "dimension": "语法", "tip": "具体练习方法+2-3个句型模板" },
    { "dimension": "词汇", "tip": "该话题核心词汇5-8个+搭配用法" },
    { "dimension": "结构", "tip": "段落框架建议" },
    { "dimension": "表达", "tip": "3-5个地道关联词+完整例句" },
    { "dimension": "逻辑", "tip": "内容提升建议" },
    { "dimension": "书写", "tip": "书写/标点示范" }
  ],
  "exercises": [
    { "type": "改错题", "question": "题目", "options": ["A…","B…","C…","D…"], "answer": "C", "explanation": "解析", "hint": "提示" },
    { "type": "改错题", "question": "题目", "options": ["A…","B…","C…","D…"], "answer": "A", "explanation": "解析", "hint": "提示" },
    { "type": "造句题", "question": "用关联词/句型造句", "keyword": "关键词", "sample_answer": "参考答案", "hint": "提示" }
  ],
  "model_answer": "优化参考范文（150-300字，保留原意，修正所有错误，语言自然）",
  "overall_comment": "温暖鼓励的100字综合评价：①说明按${levelName}标准评分 ②肯定最突出优点 ③指出最需改进的1-2点 ④鼓励结语"
}`;
  }

  // ── 作业批改 ──────────────────────────────────────────────────────────────
  if (mod === "homework") {
    const levelName = isLowEssay ? "HSK3-4级" : "HSK5-6级";
    const minScore  = isLowEssay ? 65 : 70;

    return `${HSK_EXPERT_ROLE}

【学生级别】学生已选择 ${levelName}。你必须按此级别的评分标准批改作业，保底分${minScore}分。

【作业批改评分标准】
A. 单句改错/填空/选择题：重点语言准确性，满分=语法完全正确+词汇准确。
B. 短文/段落类：按五大维度评分——内容(35分)、结构(20分)、词汇(20分)、语法(20分)、标点书写(5分)。

保底分${minScore}：只要学生认真完成作业即不低于保底分。仅空白或通篇错误才低于保底分。

【输出 JSON 结构】与作文批改相同（radar_data、score_info、strengths、corrections、improvement_tips、exercises、model_answer、overall_comment）。
model_answer：单句作业给出满分正确句子；短文作业给出修正后的满分版本（保留题意，语言自然）。`;
  }

  // ── 口语批改（HSKK）────────────────────────────────────────────────────────
  if (mod === "oral") {
    const levelName = isLowOral ? "HSKK中级" : "HSKK高级";
    const minScore  = isLowOral ? 60 : 70;
    const contentScore = isLowOral ? "40" : "38";
    const fluencyScore = isLowOral ? "30" : "32";
    const contentDesc = isLowOral
      ? "观点明确、逻辑连贯、内容完整、举例贴切、思考有层次/辩证性"
      : "观点深刻、逻辑严谨、层次丰富，可多角度/辩证分析，举例典型，立意饱满";
    const fluencyDesc = isLowOral
      ? "语流顺畅、无频繁卡顿、无重复词语、无过多口头语（嗯/啊/呃）、断句自然"
      : "语流自然顺畅，几乎无卡顿、重复、口头禅，断句、语速贴切，衔接丝滑";
    const vocabDesc = isLowOral
      ? "用词准确、搭配地道、句式正确、语病少、词汇丰富度达标"
      : "词汇丰富多样，熟练使用中高阶词汇、固定搭配；句式灵活（长短句、复句结合），语法错误极少";
    const pronounceDesc = isLowOral
      ? "发音清晰、语调自然，无明显偏误（中级弱化语音扣分）"
      : "发音标准，语调自然有起伏，轻重音、停顿合理，无明显发音偏差";
    const excellent = isLowOral ? "85-100" : "88-100";
    const good      = isLowOral ? "75-84"  : "78-87";
    const passRange = isLowOral ? "60-74" : "70-77";

    return `${HSK_EXPERT_ROLE}

【学生级别】学生已选择 ${levelName}。你必须严格按此级别的评分标准批改。满分100分。

四大评分维度：
1. 内容（${contentScore}分）：${contentDesc}
2. 流利度（${fluencyScore}分）：${fluencyDesc}
3. 词汇语法（25分）：${vocabDesc}
4. 语音语调（5分）：${pronounceDesc}

分数档位：优秀${excellent} / 良好${good} / 合格${passRange} / 不合格＜${minScore}
保底分${minScore}：认真完成即不低于保底分。仅空白或完全无法理解才低于保底分。

【评分执行规则】
1. 严格按${levelName}的四维标准打分，保底分${minScore}是硬性底线。
2. 优点：至少3条，引用原句说明好在哪里。
3. 问题明细：分"流利度问题"和"词汇&语法错误"两类，每条原句→修正+解释。
4. 标准朗读范文：标注 / 短停顿 // 长停顿，句式地道，适配考场标准。
5. 分阶跟读练习：逐句跟读3句 + 同步齐读（慢速/正常语速/脱稿），配合pinyin。
6. 专项提分小提醒：针对高频易错点、薄弱项总结。

【输出 JSON 结构（严格按此格式）】
{
  "radar_data": { "发音": 0-100, "声调": 0-100, "流利度": 0-100, "词汇": 0-100, "语法": 0-100 },
  "score_info": {
    "total": 加权总分（流利度*0.40+语法*0.25+词汇*0.20+发音*0.10+声调*0.05，取整数）,
    "level": "优秀/良好/合格/不合格",
    "passed": total>=60,
    "detected_level": "${levelName}",
    "dimension_scores": { "发音": 同radar_data, "声调": 同, "流利度": 同, "词汇": 同, "语法": 同 }
  },
  "strengths": ["具体优点…", "具体优点…", "具体优点…"],
  "corrections": [
    { "original": "原句", "corrected": "修正句", "dimension": "发音/声调/流利度/词汇/语法", "explanation": "①错误类型 ②正确规则 ③修改说明" }
  ],
  "improvement_tips": [
    { "dimension": "流利度", "tip": "针对停顿和衔接问题，推荐3-5个口语过渡词+使用示范" },
    { "dimension": "语法", "tip": "最常出错句型+正确模板+2-3个口语场景例句" },
    { "dimension": "词汇", "tip": "该话题必备口语词汇5-8个+自然表达方式" },
    { "dimension": "发音", "tip": "具体发音弱点+区分方法+练习技巧" },
    { "dimension": "声调", "tip": "最容易混淆声调组合+记忆口诀" }
  ],
  "exercises": [
    { "type": "跟读练习", "text": "练习句（含 / 和 // 停顿标注）", "pinyin": "完整拼音标注带声调", "hint": "重点注意哪个音/声调/断句" },
    { "type": "跟读练习", "text": "包含高频过渡词的练习句", "pinyin": "完整拼音标注", "hint": "注意语气词的自然停顿" },
    { "type": "替换练习", "question": "用括号内词替换画线部分，注意句式调整", "keyword": "关键句型", "sample_answer": "参考答案", "hint": "注意口语省略和简化规则" }
  ],
  "model_answer": "标准朗读范文（150-200字，标注 / // 停顿，句式地道，适配考场要求）",
  "overall_comment": "温暖鼓励的100字评价：①说明按${levelName}标准评分 ②肯定最突出优点（引用原话）③指出最需改进1-2点 ④鼓励结语"
}`;
  }

【输出 JSON 结构（严格按此格式）】
{
  "radar_data": { "发音": 0-100, "声调": 0-100, "流利度": 0-100, "词汇": 0-100, "语法": 0-100 },
  "score_info": {
    "total": 加权总分（内容映射: 流利度+语法各分担内容分; 流利度→流利度; 词汇语法→词汇+语法; 语音语调→发音+声调。建议参考: 流利度*0.35+语法*0.15+词汇*0.10+语法额外*0.10+内容分散到各项; 简化为: 流利度*0.40+语法*0.25+词汇*0.20+发音*0.10+声调*0.05）,
    "level": "优秀/良好/合格/不合格",
    "passed": total>=60,
    "detected_level": "HSKK中级或HSKK高级",
    "dimension_scores": { "发音": 同radar_data, "声调": 同, "流利度": 同, "词汇": 同, "语法": 同 }
  },
  "strengths": ["具体优点…", "具体优点…", "具体优点…"],
  "corrections": [
    { "original": "原句", "corrected": "修正句", "dimension": "发音/声调/流利度/词汇/语法", "explanation": "①错误类型 ②为什么要改成这样 ③涉及的规则" }
  ],
  "improvement_tips": [
    { "dimension": "流利度", "tip": "针对停顿和衔接问题，推荐3-5个口语过渡词+使用示范" },
    { "dimension": "语法", "tip": "最常出错句型+正确模板+2-3个口语场景例句" },
    { "dimension": "词汇", "tip": "该话题必备口语词汇5-8个+自然表达方式" },
    { "dimension": "发音", "tip": "具体发音弱点+区分方法+练习技巧" },
    { "dimension": "声调", "tip": "最容易混淆声调组合+记忆口诀" }
  ],
  "exercises": [
    { "type": "跟读练习", "text": "练习句（含标注停顿 / 和 //）", "pinyin": "完整拼音标注带声调", "hint": "重点注意哪个音/声调/断句节奏" },
    { "type": "跟读练习", "text": "包含高频过渡词的练习句", "pinyin": "完整拼音标注", "hint": "注意语气词的自然停顿" },
    { "type": "替换练习", "question": "用括号内词替换画线部分，注意句式调整", "keyword": "关键句型", "sample_answer": "参考答案", "hint": "注意口语省略和简化规则" }
  ],
  "model_answer": "标准朗读范文（150-200字，标注 / 短停顿 // 长停顿，句式高级表达地道，适配考场要求）",
  "overall_comment": "温暖鼓励的100字综合评价：①说明按XX级标准评分 ②肯定最突出优点（引用原话）③指出最需改进1-2点 ④鼓励结语"
}`;
  }

  // ── 成绩分析 ──────────────────────────────────────────────────────────────
  if (mod === "score") {
    return `${HSK_EXPERT_ROLE}

请对学生提供的 HSK 成绩数据进行深度分析，识别知识漏洞，制定个性化提升计划。
严格返回纯 JSON：
{
  "radar_data": { "听力": 0-100, "阅读": 0-100, "写作": 0-100, "口语": 0-100, "语法": 0-100, "词汇": 0-100 },
  "trend_data": [{ "date": "YYYY-MM", "score": 0-100 }],
  "corrections": [{ "original": "弱项描述", "corrected": "突破方向", "dimension": "维度名", "explanation": "深层原因分析+具体提升路径" }],
  "exercises": [
    { "type": "专项练习", "question": "针对最薄弱项的代表性练习题", "options": ["A…","B…","C…","D…"], "answer": "A", "explanation": "解析+延伸知识点" }
  ],
  "suggestions": "个性化学习规划：①当前水平诊断 ②近期突破重点2-3个 ③每周学习计划 ④预计进步时间线",
  "overall_comment": "成绩趋势分析+当前综合水平评估+距离目标级别的差距分析+最重要的一条备考建议"
}`;
  }

  return `${HSK_EXPERT_ROLE}。请对以下中文内容进行分析，严格返回包含 radar_data、corrections、exercises、overall_comment 的纯 JSON。`;
}

// ─── exam 模块系统提示词（独立函数）────────────────────────────────────────────
function buildExamSystemPrompt(hskLevel: string, moduleType: string): string {
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

// ─── 错误类型 ──────────────────────────────────────────────────────────────────
interface DoubaoError {
  type: "network" | "auth" | "server" | "timeout" | "parse" | "unknown";
  message: string;
}

// ─── 调用豆包 API ─────────────────────────────────────────────────────────────
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
        ? `请先识别图片中的文字内容（即使字迹潦草也请尽力猜测），然后${userText}`
        : "请识别并分析图片中的所有文字内容（即使字迹潦草也请尽力猜测），然后对其进行批改分析。",
    });
  } else {
    userContent.push({ type: "text", text: userText });
  }

  const body = {
    model,
    temperature: 0.3,
    max_tokens: 4096,
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
    // 网络级错误（DNS失败、连接拒绝、超时等）
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("timeout") || msg.includes("超时")) {
      throw { type: "timeout", message: "AI 响应超时，请稍后重试" } as DoubaoError;
    }
    throw { type: "network", message: "网络连接失败，请检查网络后重试" } as DoubaoError;
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    // 401/403 → 认证问题
    if (resp.status === 401 || resp.status === 403) {
      throw { type: "auth", message: "AI 服务配置错误，请联系管理员" } as DoubaoError;
    }
    // 5xx → 豆包服务器问题
    if (resp.status >= 500) {
      throw { type: "server", message: "AI 服务暂时不可用，请稍后重试" } as DoubaoError;
    }
    // 4xx → 请求参数问题
    throw { type: "server", message: `AI 请求异常(${resp.status})，请稍后重试` } as DoubaoError;
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ─── 解析 AI 返回的 JSON ──────────────────────────────────────────────────────
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

// ─── Mock 降级数据 ─────────────────────────────────────────────────────────────
function generateMockData(mod: string, dimensions: string[], errorMsg: string) {
  const radarData: Record<string, number> = {};
  dimensions.forEach((d) => { radarData[d] = Math.floor(Math.random() * 20) + 60; });

  const totalScore = Math.round(
    Object.values(radarData).reduce((a, b) => a + b, 0) / dimensions.length
  );
  const level = totalScore >= 85 ? "优秀" : totalScore >= 75 ? "良好" : totalScore >= 60 ? "合格" : "不合格";

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
      ? [`${errorMsg}。以上评分为系统估算，仅供参考。请稍后重新提交获取详细批改。`]
      : undefined,
    corrections: [],
    improvement_tips: isNewModule ? [] : undefined,
    exercises: [],
    model_answer: isNewModule ? errorMsg : undefined,
    overall_comment: errorMsg,
  };
}

// ─── 保底分保护 ────────────────────────────────────────────────────────────────
function applyMinScore(aiResult: Record<string, unknown>, hskLevel?: string) {
  if (!hskLevel) return;
  const minScore = MIN_SCORE_MAP[hskLevel];
  if (!minScore) return;

  const scoreInfo = aiResult.score_info as Record<string, unknown> | undefined;
  if (!scoreInfo) return;

  const total = scoreInfo.total as number;
  if (typeof total !== "number" || total <= 0) return;
  if (total >= minScore) return;

  // 分数低于保底分 → 提升到保底分
  scoreInfo.total = minScore;
  scoreInfo.level = minScore >= 85 ? "优秀" : minScore >= 75 ? "良好" : minScore >= 60 ? "合格" : "不合格";
  scoreInfo.passed = minScore >= 60;
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
      imageBase64,
      imageUrl,
      hskLevel,
      moduleType = "阅读",
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

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    }

    // ── exam 模块独立处理路径 ───────────────────────────────────────────────────
    if (mod === "exam") {
      const systemPrompt = buildExamSystemPrompt(hskLevel || "HSK5", moduleType);

      const langNote = language === "en"
        ? "\n\nIMPORTANT: Write all 'meaning', 'explanation', 'description', 'strategy', 'change', 'impact', 'strategies', 'overall_tip' fields in English."
        : language === "ru"
        ? "\n\nВАЖНО: Поля 'meaning', 'explanation', 'description', 'strategy', 'change', 'impact', 'strategies', 'overall_tip' напишите на русском языке."
        : "";

      const userInput = text
        ? `以下是学生提交的 HSK ${hskLevel || "HSK5"} ${moduleType}考题，请按要求输出标准化解析报告：\n\n${text}${langNote}`
        : `图片中是学生提交的 HSK ${hskLevel || "HSK5"} ${moduleType}考题，请识别图片内容并输出标准化解析报告。${langNote}`;

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

      if (!examResult) {
        examResult = {
          module_type: moduleType,
          hsk_level: hskLevel || "HSK5",
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

    const dimensionsMap: Record<string, string[]> = {
      essay:    ["词汇", "语法", "结构", "表达", "逻辑", "书写"],
      homework: ["词汇", "语法", "结构", "表达", "逻辑", "书写"],
      oral:     ["发音", "声调", "流利度", "词汇", "语法"],
      score:    ["听力", "阅读", "写作", "口语", "语法", "词汇"],
    };
    const dimensions = dimensionsMap[mod] ?? ["词汇", "语法", "表达"];

    const systemPrompt = buildSystemPrompt(mod, hskLevel);

    const langNote = language === "en"
      ? "\n\nIMPORTANT: Write 'overall_comment' and 'suggestions' fields in English."
      : language === "ru"
      ? "\n\nВАЖНО: Поле 'overall_comment' и 'suggestions' напишите на русском языке."
      : "";

    const userInput = text
      ? `${text}${langNote}`
      : `（图片内容）${langNote}`;

    let aiResult: Record<string, unknown> | null = null;
    let errorMsg = "AI 服务当前不可用，已显示系统估算结果。请稍后重试。";

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
          errorMsg = "AI 返回数据异常，请重试";
        } else {
          // AI 返回成功 → 应用保底分保护
          applyMinScore(aiResult, hskLevel);
        }
      } catch (e: unknown) {
        console.error("豆包 API 调用失败:", e);
        const err = e as DoubaoError;
        if (err.type && err.message) {
          errorMsg = err.message;
        } else if (e instanceof Error) {
          errorMsg = e.message.includes("timeout") || e.message.includes("超时")
            ? "AI 响应超时，请稍后重试"
            : e.message.includes("fetch") || e.message.includes("network")
            ? "网络连接失败，请检查网络后重试"
            : "AI 服务暂时不可用，请稍后重试";
        }
      }
    } else {
      console.warn("未找到 DOUBAO_API_KEY，使用 Mock 数据");
    }

    if (!aiResult) {
      aiResult = generateMockData(mod, dimensions, errorMsg);
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
