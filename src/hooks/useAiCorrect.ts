import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { CorrectionResultData } from '@/types/types';

export interface ProgressStage {
  step: number;
  label: string;
  percent: number;
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

// ─── 模块级缓存，跨组件生命周期 ────────────────────────────────────────────────
// sessionStorage 用于跨 TAB/页面刷新；模块变量用于同页切路由
const _moduleCache: Record<string, CorrectionResultData | null> = {};

function modCacheKey(mod: string): string {
  return `hsk_result_${mod}`;
}
function readModuleCache(key: string): CorrectionResultData | null {
  return _moduleCache[key] ?? null;
}
function writeModuleCache(key: string, data: CorrectionResultData) {
  _moduleCache[key] = data;
  // 同时写 sessionStorage，防止页面刷新丢失
  try { sessionStorage.setItem(key, JSON.stringify({ data })); } catch {}
}
function clearModuleCache(key: string) {
  _moduleCache[key] = null;
  try { sessionStorage.removeItem(key); } catch {}
}

/** sessionStorage 内容回填缓存 key */
function cacheKey(mod: string, content: string): string {
  return `hsk_cache_${mod}_${content.slice(0, 128)}`;
}
function readCache(key: string): CorrectionResultData | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > 10 * 60 * 1000) { sessionStorage.removeItem(key); return null; }
    return data as CorrectionResultData;
  } catch { return null; }
}
function writeCache(key: string, data: CorrectionResultData) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

interface UseAiCorrectOptions {
  module: string;
  language: string;
}

export function useAiCorrect({ module: mod, language }: UseAiCorrectOptions) {
  const lastKey = modCacheKey(mod);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState<ProgressStage | null>(null);
  const [result, setResult]     = useState<CorrectionResultData | null>(() => {
    // 先从模块缓存读，再从 sessionStorage 读
    const mc = readModuleCache(lastKey);
    if (mc) return mc;
    try {
      const raw = sessionStorage.getItem(lastKey);
      if (!raw) return null;
      const { data } = JSON.parse(raw);
      if (data) { _moduleCache[lastKey] = data; return data; }
    } catch {}
    return null;
  });
  const timerRefs               = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loadingRef              = useRef(false); // 同步锁，防止重复点击

  // 每次挂载 + 页面可见时重新检查缓存
  useEffect(() => {
    if (result) return;
    const check = () => {
      const mc = readModuleCache(lastKey);
      if (mc && !result) {
        setResult(mc);
        setProgress(null);
        setLoading(false);
        loadingRef.current = false;
      }
    };
    check();
    const interval = setInterval(check, 800);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [lastKey, result]);

  const clearTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  };

  const startProgress = useCallback(() => {
    const stages = getStages(language);
    clearTimers();
    setProgress({ step: 1, label: stages[0].label, percent: stages[0].percent });
    timerRefs.current.push(setTimeout(() => {
      setProgress({ step: 2, label: stages[1].label, percent: stages[1].percent });
    }, 2500));
    timerRefs.current.push(setTimeout(() => {
      setProgress({ step: 3, label: stages[2].label, percent: stages[2].percent });
    }, 5500));
    timerRefs.current.push(setTimeout(() => {
      setProgress({ step: 4, label: stages[3].label, percent: stages[3].percent });
    }, 9000));
  }, [language]);

  const correct = useCallback(async (params: {
    text?: string;
    imageBase64?: string;
    imageUrl?: string;
  }) => {
    // 同步锁，彻底杜绝连点
    if (loadingRef.current) {
      toast.info(language === 'zh' ? '上一次批改正在进行中，请稍候查看结果' : language === 'ru' ? 'Идёт обработка, дождитесь результата' : 'Previous correction is still processing, please wait');
      return;
    }
    loadingRef.current = true;

    const cacheContent = params.text || params.imageUrl || params.imageBase64?.slice(0, 64) || '';
    const cacheK = cacheKey(mod, cacheContent);

    const cached = readCache(cacheK);
    if (cached) {
      setResult(cached);
      writeModuleCache(lastKey, cached);
      loadingRef.current = false;
      toast.success(language === 'zh' ? '已加载上次批改结果' : language === 'ru' ? 'Загружен кэш' : 'Loaded from cache');
      return;
    }

    setLoading(true);
    setResult(null);
    clearModuleCache(lastKey);
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

      clearTimers();
      setProgress({ step: 4, label: language === 'zh' ? '批改完成！' : language === 'ru' ? 'Готово!' : 'Done!', percent: 100 });

      setTimeout(() => {
        const resultData = data as CorrectionResultData;
        setResult(resultData);
        setProgress(null);
        writeCache(cacheK, resultData);
        writeModuleCache(lastKey, resultData);
        loadingRef.current = false;
        toast.success(language === 'zh' ? '批改完成！' : language === 'ru' ? 'Готово!' : 'Done!');
      }, 400);

    } catch (err: unknown) {
      clearTimers();
      setProgress(null);
      loadingRef.current = false;
      const msg = err instanceof Error ? err.message : (language === 'zh' ? '分析失败，请重试' : 'Analysis failed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [mod, language, startProgress, lastKey]);

  const reset = useCallback(() => {
    clearTimers();
    setResult(null);
    setProgress(null);
    clearModuleCache(lastKey);
    loadingRef.current = false;
  }, [lastKey]);

  return { loading, progress, result, correct, reset };
}
