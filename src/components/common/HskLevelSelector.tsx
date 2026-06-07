interface HskLevelSelectorProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function HskLevelSelector({ options, value, onChange }: HskLevelSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
        HSK Level
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 ${
              value === opt.value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-muted/40 text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
