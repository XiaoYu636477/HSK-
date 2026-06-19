import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useYuCode } from '@/contexts/YuCodeContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import AiLoading from '@/components/common/AiLoading';
import ExamAnalysisResult from '@/components/common/ExamAnalysisResult';
import type { ExamAnalysisData } from '@/types/types';
import type { ProgressStage } from '@/hooks/useAiCorrect';
import {
  BookOpenCheck, Image, X, RotateCcw, Sparkles, ChevronDown,
} from 'lucide-react';

// ── 选项配置 ────────────────────────────────────────────────────────────────────
const HSK_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];
const MODULE_TYPES_ZH = ['听力', '阅读', '书写'];
const MODULE_TYPES_EN = ['Listening', 'Reading', 'Writing'];
const MODULE_TYPES_RU = ['Аудирование', 'Чтение', 'Письмо'];

function getModuleTypes(lang: string) {
  if (lang === 'en') return MODULE_TYPES_EN;
  if (lang === 'ru') return MODULE_TYPES_RU;
  return MODULE_TYPES_ZH;
}
// 始终传给后端中文 moduleType
function toZhModuleType(val: string) {
  const map: Record<string, string> = {
    Listening: '听力', Reading: '阅读', Writing: '书写',
    'Аудирование': '听力', 'Чтение': '阅读', 'Письмо': '书写',
  };
  return map[val] ?? val;
}

// ── 进度阶段（复用 useAiCorrect 风格，但专用于解析） ────────────────────────────
interface Stage { label: string; percent: number }
const EXAM_STAGES: Record<string, Stage[]> = {
  zh: [
    { label: '正在识别题目内容…', percent: 15 },
    { label: 'AI 深度解析中…',    percent: 40 },
    { label: '生成词汇与考点…',   percent: 72 },
    { label: '整理解析报告…',     percent: 92 },
  ],
  en: [
    { label: 'Recognizing content…', percent: 15 },
    { label: 'AI deep analysis…',    percent: 40 },
    { label: 'Generating vocab & points…', percent: 72 },
    { label: 'Compiling report…',    percent: 92 },
  ],
  ru: [
    { label: 'Распознавание содержания…', percent: 15 },
    { label: 'Глубокий анализ ИИ…',       percent: 40 },
    { label: 'Словарь и ключевые темы…',  percent: 72 },
    { label: 'Формирование отчёта…',       percent: 92 },
  ],
};

export default function ExamPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { isActivated, openModal, trackApiCall } = useYuCode();
  const L = (zh: string, en: string, ru: string) =>
    language === 'en' ? en : language === 'ru' ? ru : zh;

  const moduleOptions = getModuleTypes(language);
  const [hskLevel,    setHskLevel]    = useState('HSK5');
  const [moduleType,  setModuleType]  = useState(moduleOptions[1]); // 默认阅读
  const [inputText,   setInputText]   = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl,    setImageUrl]    = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [progress,    setProgress]    = useState<ProgressStage | null>(null);
  const [result,      setResult]      = useState<ExamAnalysisData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── 图片上传 ──────────────────────────────────────────────────────────────────
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(L('请上传图片文件', 'Please upload an image', 'Загрузите изображение'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(L('图片大小不超过 5MB', 'Image must be ≤ 5MB', 'Изображение ≤ 5 МБ'));
      return;
    }
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    setUploadingImg(true);
    try {
      if (!user) throw new Error('Please login before uploading');
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/exam/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success(L('图片上传成功', 'Image uploaded', 'Изображение загружено'));
    } catch {
      // 降级：转 base64 直传
      const reader = new FileReader();
      reader.onload = (e) => setImageUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } finally {
      setUploadingImg(false);
    }
  };

  // ── 进度动画 ──────────────────────────────────────────────────────────────────
  const startProgress = () => {
    const stages = EXAM_STAGES[language] ?? EXAM_STAGES.zh;
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    setProgress({ step: 1, ...stages[0] });
    const delays = [2500, 5500, 9000];
    delays.forEach((d, i) => {
      timerRefs.current.push(setTimeout(() => setProgress({ step: i + 2, ...stages[i + 1] }), d));
    });
  };
  const clearTimers = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };

  // ── 提交解析 ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (loading) { toast.info(L('上一次解析正在进行中，请稍候查看结果', 'Processing…', 'Идёт обработка, дождитесь результата')); return; }
    if (!isActivated) { openModal(); return; }
    if (!inputText.trim() && !imageUrl) {
      toast.error(L('请输入题目内容或上传图片', 'Please input question or upload image', 'Введите вопрос или загрузите изображение'));
      return;
    }
    const callCheck = await trackApiCall();
    if (!callCheck.ok) {
      if (callCheck.reason === 'limit_reached') toast.error(L('今日解析次数已用完，明天再来', 'Daily limit reached', 'Дневной лимит исчерпан'));
      else if (callCheck.reason === 'expired')  toast.error(L('小Yu码已到期，请联系老师续期', 'Yu Code expired', 'Код истёк'));
      else if (callCheck.reason === 'disabled') toast.error(L('小Yu码已被禁用，请联系老师', 'Yu Code disabled', 'Код заблокирован'));
      return;
    }
    setResult(null);  // 清除旧结果
    setLoading(true);
    startProgress();
    try {
      const body: Record<string, string> = {
        module: 'exam',
        language,
        hskLevel,
        moduleType: toZhModuleType(moduleType),
      };
      if (inputText.trim()) body.text = inputText.trim();
      if (imageUrl) {
        if (imageUrl.startsWith('data:')) body.imageBase64 = imageUrl;
        else body.imageUrl = imageUrl;
      }

      const { data, error } = await supabase.functions.invoke('ai-correct', { body });
      if (error) {
        const raw = await error?.context?.text?.();
        throw new Error(raw || error.message);
      }
      clearTimers();
      setProgress({ step: 4, label: L('解析完成！', 'Analysis done!', 'Готово!'), percent: 100 });
      setTimeout(async () => {
        const examResult = data as ExamAnalysisData;
        setResult(examResult);
        setProgress(null);
        toast.success(L('考题解析完成！', 'Analysis complete!', 'Анализ завершён!'));

        // 写入历史记录
        if (user) {
          await supabase.from('corrections').insert({
            user_id:     user.id,
            module:      'exam',
            input_text:  inputText.trim() || '[图片识别]',
            hsk_level:   hskLevel,
            module_type: toZhModuleType(moduleType),
            exam_data:   examResult,
            suggestions: examResult.overall_tip ?? null,
          });
        }
      }, 400);
    } catch (err) {
      clearTimers();
      setProgress(null);
      const msg = err instanceof Error ? err.message : L('解析失败，请重试', 'Analysis failed', 'Ошибка анализа');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    clearTimers();
    setResult(null);
    setProgress(null);
    setInputText('');
    setImagePreview(null);
    setImageUrl(null);
  };

  // ── 结果视图 ──────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
              <BookOpenCheck className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">
                {L('HSK 考题解析', 'HSK Exam Analysis', 'Анализ заданий HSK')}
              </h1>
              <p className="text-[11px] text-muted-foreground truncate">
                {result.hsk_level} · {result.module_type}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">{L('重新解析', 'New Analysis', 'Новый анализ')}</span>
          </Button>
        </div>
        <ExamAnalysisResult data={result} language={language} />
      </div>
    );
  }

  // ── 输入视图 ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <BookOpenCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {L('HSK 考题解析', 'HSK Exam Analysis', 'Анализ заданий HSK')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {L(
              '提交真题，AI 生成词汇、考点与详细解析',
              'Submit real exam questions for AI-powered analysis',
              'Отправьте задание — ИИ разберёт слова, темы и ответы'
            )}
          </p>
        </div>
      </div>

      {/* 配置卡：级别 + 题型 */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            {L('选择题目信息', 'Question Settings', 'Настройки задания')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* HSK 级别 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {L('HSK 级别', 'HSK Level', 'Уровень HSK')}
            </p>
            <div className="flex flex-wrap gap-2">
              {HSK_LEVELS.map(lv => (
                <button
                  key={lv}
                  onClick={() => setHskLevel(lv)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                    hskLevel === lv
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          {/* 题型 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {L('题型模块', 'Module Type', 'Тип задания')}
            </p>
            <div className="flex flex-wrap gap-2">
              {moduleOptions.map((mt, idx) => {
                const countMap = [30, 30, 4];
                return (
                  <button
                    key={mt}
                    onClick={() => setModuleType(mt)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                      moduleType === mt
                        ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-violet-400/40 hover:text-foreground'
                    }`}
                  >
                    {mt}
                    <span className={`text-[10px] ${moduleType === mt ? 'opacity-80' : 'opacity-60'}`}>
                      {countMap[idx]}{L('题', '', ' заданий')}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ChevronDown className="w-3 h-3" />
              {L(
                'HSK3.0 标准：听力30题 · 阅读30题 · 书写4题',
                'HSK3.0: Listening 30 · Reading 30 · Writing 4',
                'HSK3.0: Аудирование 30 · Чтение 30 · Письмо 4'
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 输入区 */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">
              {L('输入题目内容', 'Input Question Content', 'Введите содержание задания')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
              <Button
                variant="ghost"
                size="sm"
                disabled={uploadingImg}
                onClick={() => fileRef.current?.click()}
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50"
              >
                <Image className="w-3 h-3" />
                {uploadingImg
                  ? L('上传中…', 'Uploading…', 'Загрузка…')
                  : L('上传图片', 'Upload Image', 'Фото')
                }
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 图片预览 */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-border/50">
              <img src={imagePreview} alt="preview" className="w-full max-h-64 object-contain bg-muted/30" />
              <button
                onClick={() => { setImagePreview(null); setImageUrl(null); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-rose-50 hover:border-rose-300 transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
              {imageUrl && !imageUrl.startsWith('data:') && (
                <div className="absolute bottom-2 left-2">
                  <Badge variant="outline" className="text-[10px] bg-background/80 border-emerald-500/30 text-emerald-600">
                    ✓ {L('已上传', 'Uploaded', 'Загружено')}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <Textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={L(
              '粘贴题目原文（包含阅读文本、题目和选项）…\n\n也可以直接上传题目图片↑',
              'Paste the full question (passage, questions, options)…\n\nOr upload an image above ↑',
              'Вставьте текст задания (текст, вопросы, варианты)…\n\nИли загрузите изображение ↑'
            )}
            className="min-h-[160px] resize-none text-sm px-3"
          />

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {L(
                '建议粘贴完整题组，包括原文和所有题目',
                'Include the full passage and all questions for best results',
                'Вставьте весь текст и все вопросы для точного анализа'
              )}
            </p>
            <span className={`text-[11px] tabular-nums ${inputText.length > 2000 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {inputText.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 提交 */}
      {loading ? (
        <AiLoading
          progress={progress ?? { step: 1, label: '…', percent: 0 }}
          moduleColor="from-violet-500 to-purple-600"
        />
      ) : (
        <Button
          onClick={handleSubmit}
          disabled={!inputText.trim() && !imageUrl}
          className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {L('开始 AI 考题解析', 'Start AI Exam Analysis', 'Начать анализ ИИ')}
        </Button>
      )}
    </div>
  );
}
