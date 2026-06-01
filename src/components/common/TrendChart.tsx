interface TrendPoint {
  date: string;
  score: number;
}

interface TrendChartProps {
  data: TrendPoint[];
}

export default function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) return null;

  const maxScore = Math.max(...data.map((d: TrendPoint) => d.score));
  const minScore = Math.min(...data.map((d: TrendPoint) => d.score));
  const range = maxScore - minScore || 1;

  const w = 500;
  const h = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const points = data.map((d: TrendPoint, i: number) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * plotW,
    y: padding.top + plotH - ((d.score - minScore) / range) * plotH,
    ...d,
  }));

  const pathD = points.map((p: TrendPoint & { x: number; y: number }, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((frac: number) => {
        const y = padding.top + plotH * (1 - frac);
        const val = Math.round(minScore + range * frac);
        return (
          <g key={frac}>
            <line
              x1={padding.left}
              y1={y}
              x2={w - padding.right}
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-[10px] fill-muted-foreground"
            >
              {val}
            </text>
          </g>
        );
      })}

      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p: TrendPoint & { x: number; y: number }, i: number) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill="hsl(var(--primary))"
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={p.x}
            y={h - 8}
            textAnchor="middle"
            className="text-[10px] fill-muted-foreground"
          >
            {p.date}
          </text>
        </g>
      ))}
    </svg>
  );
}