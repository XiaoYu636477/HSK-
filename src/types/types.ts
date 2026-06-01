export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  native_language: string;
  created_at: string;
  // 小Yu码 & 权限系统
  invitation_code: string | null;
  membership: 'pending' | 'trial' | 'basic' | 'pro' | 'disabled';
  daily_limit: number;
  calls_today: number;
  total_calls: number;
  last_call_date: string | null;
  expires_at: string | null;
  admin_note: string | null;
}

export interface InvitationCode {
  id: number;
  code: string;
  status: 'unused' | 'used' | 'disabled';
  bound_user_id: string | null;
  note: string | null;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
}

export interface RadarData {
  [dimension: string]: number;
}

export interface Correction {
  original: string;
  corrected: string;
  dimension: string;
  explanation: string;
}

export interface Exercise {
  type: string;
  question: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  hint?: string;
  keyword?: string;
  sample_answer?: string;
  text?: string;
  pinyin?: string;
}

/** 评分结果（新模板专用） */
export interface ScoreInfo {
  total: number;           // 百分制总分
  level: string;           // 等级：优秀/良好/合格/不合格
  passed: boolean;         // 是否合格（≥60）
  dimension_scores: RadarData; // 各维度分数（与 radar_data 对应）
  detected_level?: string; // AI 自动识别的学生级别，如 "HSKK中级"、"HSK3-4级"
}

/** 提升建议（每个维度一条） */
export interface ImprovementTip {
  dimension: string;
  tip: string;
}

/** 完整批改结果（扩展版） */
export interface CorrectionResultData {
  radar_data: RadarData;
  score_info?: ScoreInfo;
  strengths?: string[];
  corrections: Correction[];
  improvement_tips?: ImprovementTip[];
  exercises: Exercise[];
  model_answer?: string;
  overall_comment?: string;
  suggestions?: string;
  trend_data?: { date: string; score: number }[];
}

export interface CorrectionRecord {
  id: string;
  user_id: string;
  module: 'essay' | 'homework' | 'oral' | 'score' | 'exam' | 'practice';
  input_text: string | null;
  input_image_url: string | null;
  input_audio_url: string | null;
  radar_data: RadarData | null;
  corrections_data: Correction[] | null;
  exercises_data: Exercise[] | null;
  score_data: { date: string; score: number }[] | null;
  suggestions: string | null;
  hsk_level: string | null;
  module_type: string | null;
  exam_data: ExamAnalysisData | null;
  practice_data: PracticeSession | null;
  created_at: string;
}

export interface LearningPlan {
  id: string;
  user_id: string;
  weak_dimensions: { dimension: string; avgScore: number }[];
  plan_content: {
    title: string;
    description: string;
    daily_tasks: { task: string; duration: string; priority?: string }[];
  };
  exercises: Exercise[];
  created_at: string;
}

export type Language = 'zh' | 'en' | 'ru';

// ─── HSK 考题解析 ──────────────────────────────────────────────────────────────

/** 单个词汇解析 */
export interface VocabItem {
  word: string;        // 词语
  pinyin: string;      // 拼音
  meaning: string;     // 释义（对应学习者母语）
  example: string;     // 例句
  hsk_level?: string;  // 所属 HSK 级别（如 "HSK5"）
  new_in_hsk3?: boolean; // 是否为 HSK3.0 新增词汇
}

/** 单个考点 */
export interface ExamPoint {
  type: string;        // 考点类型（如"语法点"、"词汇辨析"）
  description: string; // 考点描述
  is_new_hsk3?: boolean; // 是否为 HSK3.0 新增/变化考点
  strategy?: string;   // 应对策略
}

/** 单道题目解析 */
export interface QuestionAnalysis {
  question_no: number | string; // 题号
  question_text: string;        // 题目原文
  options?: string[];           // 选项（A/B/C/D）
  answer: string;               // 正确答案
  explanation: string;          // 解析
  key_point?: string;           // 核心考点
}

/** HSK3.0 新变化说明 */
export interface Hsk3Change {
  aspect: string;    // 方面（如"阅读"、"书写"）
  change: string;    // 变化描述
  impact?: string;   // 对备考的影响
}

/** 完整考题解析结果 */
export interface ExamAnalysisData {
  module_type: string;       // 题型：听力 | 阅读 | 书写
  hsk_level: string;         // 适用级别：如 "HSK5"
  total_questions?: number;  // 本模块题目总数（HSK3.0 标准）
  passage?: string;          // 阅读/听力原文
  passage_summary?: string;  // 原文要点摘要
  vocab_list: VocabItem[];        // 词汇解析列表
  exam_points: ExamPoint[];       // 考点列表
  questions: QuestionAnalysis[];  // 题目解析列表
  hsk3_changes: Hsk3Change[];     // HSK3.0 新变化
  strategies: string[];           // 答题策略要点
  overall_tip: string;            // 综合备考建议
}

// ─── 练习题相关类型 ───────────────────────────────────────────────────────────
export interface PracticeQuestion {
  id: number;
  dimension: string;           // 对应薄弱维度，如 "词汇"
  knowledge_point: string;     // 具体知识点，如 "形近字辨析"
  question: string;            // 题目文本
  type: 'choice' | 'judge' | 'fill';
  options: string[] | null;    // 选择/判断题选项；填空题为 null
  answer: string;              // 正确答案
  explanation: string;         // 解析
}

export interface PracticeSummary {
  level: string;               // 如 "HSK5"
  focus: string[];             // 练习的维度
  total: number;               // 总题数
}

export interface PracticeSession {
  summary: PracticeSummary;
  questions: PracticeQuestion[];
  userAnswers: Record<number, string>;   // questionId → 用户答案
  score: number;                         // 最终得分（0-100）
  correct: number;                       // 答对题数
  completedAt: string;                   // ISO 时间戳
}