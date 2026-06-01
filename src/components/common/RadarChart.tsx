import { useEffect, useRef, useMemo, useState } from 'react';
import type { RadarData } from '@/types/types';

interface RadarChartProps {
  data: RadarData;
  onDimensionClick?: (dim: string) => void;
  selectedDimension?: string | null;
}

export default function RadarChart({ data, onDimensionClick, selectedDimension }: RadarChartProps) {
  const dimensions = Object.keys(data);
  const n = dimensions.length;
  const cx = 160, cy = 152, r = 108;
  const [mounted, setMounted] = useState(false);

  // 入场动画触发
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const angles = useMemo(
    () => dimensions.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2),
    [dimensions, n]
  );

  const outerPts = useMemo(
    () => angles.map(a => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })),
    [angles]
  );

  const labelPts = useMemo(
    () => angles.map(a => ({ x: cx + (r + 28) * Math.cos(a), y: cy + (r + 28) * Math.sin(a) })),
    [angles]
  );

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // 从0动画到真实值
  const animatedValues = dimensions.map(dim =>
    mounted ? (data[dim] ?? 0) : 0
  );

  const valuePts = animatedValues.map((val, i) => {
    const pct = val / 100;
    return { x: cx + r * pct * Math.cos(angles[i]), y: cy + r * pct * Math.sin(angles[i]) };
  });

  const polyPath = valuePts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ') + ' Z';

  // 网格多边形路径
  const gridPath = (level: number) =>
    dimensions
      .map((_, i) => {
        const gr = r * level;
        return `${i === 0 ? 'M' : 'L'}${(cx + gr * Math.cos(angles[i])).toFixed(2)},${(cy + gr * Math.sin(angles[i])).toFixed(2)}`;
      })
      .join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-[320px]">
        <svg
          viewBox="0 0 320 304"
          className="w-full"
          style={{ userSelect: 'none', overflow: 'visible' }}
        >
          <defs>
            {/* 数据面渐变 */}
            <radialGradient id="radarFill" cx="50%" cy="50%" r="55%">
              <stop offset="0%"   stopColor="hsl(226,72%,55%)" stopOpacity="0.45" />
              <stop offset="70%"  stopColor="hsl(256,68%,58%)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="hsl(280,62%,55%)" stopOpacity="0.06" />
            </radialGradient>
            {/* 描边渐变 */}
            <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="hsl(226,72%,58%)" />
              <stop offset="100%" stopColor="hsl(280,62%,62%)" />
            </linearGradient>
            {/* 数据点光晕 */}
            <filter id="dotGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* 外圈光晕 */}
            <filter id="gridGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── 网格背景多边形 ── */}
          {gridLevels.map((lv, li) => (
            <path
              key={li}
              d={gridPath(lv)}
              fill={lv === 1.0 ? 'hsl(226,72%,98%)' : 'none'}
              fillOpacity={lv === 1.0 ? 0.04 : 0}
              stroke={lv === 1.0 ? 'hsl(226,72%,55%)' : 'hsl(220,18%,84%)'}
              strokeOpacity={lv === 1.0 ? 0.35 : 0.45}
              strokeWidth={lv === 1.0 ? 1.2 : 0.7}
              strokeDasharray={lv === 1.0 ? undefined : '3 3'}
            />
          ))}

          {/* ── 辐射线 ── */}
          {outerPts.map((p, i) => (
            <line
              key={i}
              x1={cx} y1={cy} x2={p.x} y2={p.y}
              stroke="hsl(220,18%,82%)"
              strokeOpacity="0.55"
              strokeWidth="0.8"
            />
          ))}

          {/* ── 中心光点 ── */}
          <circle cx={cx} cy={cy} r="3" fill="hsl(226,72%,58%)" fillOpacity="0.5" />

          {/* ── 数据面（带动画） ── */}
          <path
            d={polyPath}
            fill="url(#radarFill)"
            stroke="url(#radarStroke)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            className="animate-radar-fill"
            style={{
              transition: 'all 0.8s cubic-bezier(0.22,1,0.36,1)',
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />

          {/* ── 数据点 ── */}
          {valuePts.map((p, i) => (
            <g key={i} style={{ transition: `all 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s` }}>
              {/* 光晕圈 */}
              <circle
                cx={p.x} cy={p.y} r="8"
                fill="hsl(226,72%,55%)"
                fillOpacity={mounted ? 0.15 : 0}
                style={{ transition: `opacity 0.5s ease ${i * 0.06 + 0.3}s` }}
              />
              {/* 主点 */}
              <circle
                cx={p.x} cy={p.y} r={mounted ? 4.5 : 0}
                fill="white"
                stroke="url(#radarStroke)"
                strokeWidth="2"
                filter="url(#dotGlow)"
                style={{
                  transition: `r 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06 + 0.2}s`,
                }}
              />
            </g>
          ))}

          {/* ── 维度标签 ── */}
          {dimensions.map((dim, i) => {
            const isSelected = selectedDimension === dim;
            const score = data[dim] ?? 0;
            const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
            const lp = labelPts[i];
            const anchor = lp.x < cx - 8 ? 'end' : lp.x > cx + 8 ? 'start' : 'middle';

            return (
              <g
                key={dim}
                onClick={() => onDimensionClick?.(dim)}
                style={{ cursor: 'pointer' }}
                className="animate-fade-in"
                opacity={mounted ? 1 : 0}
              >
                {/* 选中背景 */}
                {isSelected && (
                  <ellipse
                    cx={lp.x + (anchor === 'end' ? -22 : anchor === 'start' ? 22 : 0)}
                    cy={lp.y + 2}
                    rx={28} ry={16}
                    fill="hsl(226,72%,50%)"
                    fillOpacity="0.13"
                  />
                )}
                {/* 维度名 */}
                <text
                  x={lp.x} y={lp.y - 4}
                  textAnchor={anchor}
                  style={{
                    fontSize: '11px',
                    fontWeight: isSelected ? '700' : '500',
                    fill: isSelected ? 'hsl(226,72%,46%)' : 'hsl(220,20%,30%)',
                    transition: 'fill 0.2s',
                  }}
                >
                  {dim}
                </text>
                {/* 分数 */}
                <text
                  x={lp.x} y={lp.y + 11}
                  textAnchor={anchor}
                  style={{ fontSize: '11px', fontWeight: '700', fill: scoreColor }}
                >
                  {score}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── 分数进度条 ── */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-2">
        {dimensions.map((dim, i) => {
          const score = data[dim] ?? 0;
          const isSelected = selectedDimension === dim;
          const barColor = score >= 80
            ? 'bg-emerald-500'
            : score >= 60 ? 'bg-amber-500' : 'bg-rose-500';
          const scoreTxt = score >= 80
            ? 'text-emerald-500'
            : score >= 60 ? 'text-amber-500' : 'text-rose-500';

          return (
            <div
              key={dim}
              onClick={() => onDimensionClick?.(dim)}
              className={`animate-fade-up p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-primary/50 bg-primary/6 shadow-sm'
                  : 'border-border/60 hover:border-primary/30 hover:shadow-sm bg-card'
              }`}
              style={{ animationDelay: `${0.3 + i * 0.06}s` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {dim}
                </span>
                <span className={`text-xs font-black ${scoreTxt}`}>{score}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full animate-bar-grow`}
                  style={{
                    width: mounted ? `${score}%` : '0%',
                    transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.07}s`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
