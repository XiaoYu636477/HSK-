import { useLanguage } from '@/contexts/LanguageContext';
import type { ProgressStage } from '@/hooks/useAiCorrect';
import { Brain, FileSearch, ClipboardList, Lightbulb } from 'lucide-react';

interface AiLoadingProps {
  progress: ProgressStage;
  moduleColor?: string; // tailwind gradient class
}

const STEP_ICONS = [FileSearch, Brain, ClipboardList, Lightbulb];

export default function AiLoading({ progress, moduleColor = 'from-primary to-primary/80' }: AiLoadingProps) {
  const { language } = useLanguage();
  const steps = language === 'zh'
    ? ['识别内容', 'AI 分析', '生成报告', '提升建议']
    : language === 'ru'
      ? ['Контент', 'Анализ', 'Отчёт', 'Советы']
      : ['Detect', 'Analyze', 'Report', 'Tips'];

  return (
    <div className="max-w-sm mx-auto py-10 px-6 flex flex-col items-center gap-7 animate-fade-up">
      {/* 主图标：脉冲动画 */}
      <div className="relative flex items-center justify-center">
        {/* 外圈脉冲 */}
        <div className={`absolute w-24 h-24 rounded-full bg-gradient-to-br ${moduleColor} opacity-15 animate-ping`} />
        <div className={`absolute w-20 h-20 rounded-full bg-gradient-to-br ${moduleColor} opacity-20 animate-pulse`} />
        <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${moduleColor} flex items-center justify-center shadow-xl`}>
          <Brain className="w-8 h-8 text-white animate-pulse" />
        </div>
      </div>

      {/* 当前阶段文案 */}
      <div className="text-center space-y-1">
        <p className="text-base font-bold text-foreground">{progress.label}</p>
        <p className="text-xs text-muted-foreground">
          {language === 'zh' ? '豆包大模型分析中，请稍候…' : language === 'ru' ? 'Doubao анализирует…' : 'Doubao AI analyzing…'}
        </p>
      </div>

      {/* 进度条 */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.step} / 4</span>
          <span className="tabular-nums font-medium">{progress.percent}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${moduleColor} transition-all duration-700 ease-out`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="w-full flex items-center justify-between gap-1">
        {steps.map((label, i) => {
          const StepIcon = STEP_ICONS[i];
          const stepNum  = i + 1;
          const done     = progress.step > stepNum;
          const active   = progress.step === stepNum;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                done   ? `bg-gradient-to-br ${moduleColor} shadow-md` :
                active ? `bg-gradient-to-br ${moduleColor} opacity-90 shadow-md ring-2 ring-offset-1 ring-primary/30` :
                         'bg-muted'
              }`}>
                <StepIcon className={`w-4 h-4 ${done || active ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-[10px] text-center leading-tight ${active ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
