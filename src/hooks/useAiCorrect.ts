import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { CorrectionResultData } from '@/types/types';

/** 批改进度阶段 */
export interface ProgressStage {
  step: number;      // 当前步骤 1-4
  label: string;     // 当前阶段文案
  percent: number;   // 0-100
}

const STAGES_ZH = [
  { label: '正在识别内容…',        percent: 15 },
  { label: 'AI 深度分析中…',       percent: 40 },
  { label: '生成批改报告…',         percent: 72 },
  { label: '整理提升建议…',         percent: 92 },
];
const STAGES_EN = [
  { label: 'Recognizing content…', percent: 15 },
  { label: 'AI deep analysis…',    percent: 40 },
  { label: 'Generating report…',   percent: 72 },
  { label: 'Preparing tips…',      percent: 92 },
];
const STAGES_RU = [
  { label: 'Распознавание…',       percent: 15 },
  { label: 'Глубокий анализ…',     percent: 40 },
  { label: 'Формирование отчёта…', percent: 72 },
  { label: 'Советы по улучшению…', percent: 92 },
];

function getStages(lang: string) {
  if (lang === 'ru') return STAGES_RU;
  if (lang === 'en') return STAGES_EN;
  return STAGES_ZH;
}

/** sessionStorage 缓存 key */
function cacheKey(mod: string, content: string): string {
  // 使用前128字符做 key，避免过长
  return `hsk_cache_${mod}_${content.slice(0, 128)}`;
}

function readCache(key: string): CorrectionResultData | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    // 缓存有效期 10 分钟
    if (Date.now() - ts > 10 * 60 * 1000) { sessionStorage.removeItem(key); return null; }
    return data as CorrectionResultData;
  } catch { return null; }
}

function writeCache(key: string, data: CorrectionResultData) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* 忽略存储失败 */ }
}

/** 持久化最近一次批改结果，防止切后台/页面刷新丢失 */
const LAST_RESULT_KEY = (mod: string) => `hsk_last_${mod}`;

function readLastResult(key: string): CorrectionResultData | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    return data as CorrectionResultData;
  } catch { return null; }
}

function writeLastResult(key: string, data: CorrectionResultData) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data }));
  } catch { /* ignore */ }
}

function clearLastResult(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}

interface UseAiCorrectOptions {
  module: string;
  language: string;
}

export function useAiCorrect({ module: mod, language }: UseAiCorrectOptions) {
  const lastKey = LAST_RESULT_KEY(mod);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState<ProgressStage | null>(null);
  const [result, setResult]     = useState<CorrectionResultData | null>(() => readLastResult(lastKey));
  const timerRefs               = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** 清除所有进度计时器 */
  const clearTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  };

  /** 启动进度阶段动画（模拟，真实结果从 API 回来时完成） */
  const startProgress = useCallback(() => {
    const stages = getStages(language);
    clearTimers();
    setProgress({ step: 1, label: stages[0].label, percent: stages[0].percent });

    // 阶段 2: 2.5s 后
    timerRefs.current.push(setTimeout(() => {
      setProgress({ step: 2, label: stages[1].label, percent: stages[1].percent });
    }, 2500));
    // 阶段 3: 5.5s 后
    timerRefs.current.push(setTimeout(() => {
      setProgress({ step: 3, label: stages[2].label, percent: stages[2].percent });
    }, 5500));
    // 阶段 4: 9s 后
    timerRefs.current.push(setTimeout(() => {
      setProgress({ step: 4, label: stages[3].label, percent: stages[3].percent });
    }, 9000));
  }, [language]);

  const correct = useCallback(async (params: {
    text?: string;
    imageBase64?: string;
    imageUrl?: string;
  }) => {
    const cacheContent = params.text || params.imageUrl || params.imageBase64?.slice(0, 64) || '';
    const key = cacheKey(mod, cacheContent);

    // 命中缓存则直接返回
    const cached = readCache(key);
    if (cached) {
      setResult(cached);
      writeLastResult(lastKey, cached);
      toast.success(language === 'zh' ? '已加载上次批改结果' : language === 'ru' ? 'Загружен кэш' : 'Loaded from cache');
      return;
    }

    setLoading(true);
    startProgress();

    try {
      const body: Record<string, string> = { module: mod, language };
      if (params.text)        body.text        = params.text;
      if (params.imageBase64) body.imageBase64  = params.imageBase64;
      if (params.imageUrl)    body.imageUrl     = params.imageUrl;

      const { data, error } = await supabase.functions.invoke('ai-correct', { body });

      if (error) {
        const raw = await error?.context?.text?.();
        let msg = raw || error.message;
        // 友好化错误信息
        if (msg.includes('timeout') || msg.includes('超时'))
          msg = language === 'zh' ? 'AI 响应超时，请稍后重试' : 'AI timeout, please retry';
        else if (msg.includes('API') || msg.includes('豆包'))
          msg = language === 'zh' ? 'AI 服务暂时不可用，请稍后重试' : 'AI service unavailable';
        else if (msg.includes('network') || msg.includes('fetch'))
          msg = language === 'zh' ? '网络连接失败，请检查网络后重试' : 'Network error, check connection';
        throw new Error(msg);
      }

      if (!data || typeof data !== 'object') {
        throw new Error(language === 'zh' ? 'AI 返回数据异常，请重试' : 'Invalid AI response');
      }

      // 完成进度 → 100%
      clearTimers();
      setProgress({ step: 4, label: language === 'zh' ? '批改完成！' : language === 'ru' ? 'Готово!' : 'Done!', percent: 100 });

      setTimeout(() => {
        setResult(data as CorrectionResultData);
        setProgress(null);
        writeCache(key, data as CorrectionResultData);
        writeLastResult(lastKey, data as CorrectionResultData);
        toast.success(language === 'zh' ? '批改完成！' : language === 'ru' ? 'Готово!' : 'Done!');
      }, 400);

    } catch (err: unknown) {
      clearTimers();
      setProgress(null);
      const msg = err instanceof Error ? err.message : (language === 'zh' ? '分析失败，请重试' : 'Analysis failed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [mod, language, startProgress]);

  const reset = useCallback(() => {
    clearTimers();
    setResult(null);
    setProgress(null);
    clearLastResult(lastKey);
  }, [lastKey]);

  return { loading, progress, result, correct, reset };
}
