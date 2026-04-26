type Series = {
  label: string;
  color: string;
  values: number[];
};

export function MonthlyBarChart({
  labels,
  series,
  formatValue,
}: {
  labels: string[];
  series: Series[];
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(
    1,
    ...series.flatMap((s) => s.values.map((v) => Number(v) || 0)),
  );
  const fmt = formatValue ?? ((n: number) => n.toLocaleString("en-IN"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="flex items-end gap-3 overflow-x-auto pb-2">
        {labels.map((label, idx) => (
          <div key={label} className="flex flex-col items-center gap-1.5 min-w-16">
            <div className="flex h-40 items-end gap-1">
              {series.map((s) => {
                const v = Number(s.values[idx] ?? 0);
                const h = Math.round((v / max) * 100);
                return (
                  <div
                    key={s.label}
                    title={`${s.label}: ${fmt(v)}`}
                    className="w-4 rounded-t transition-all"
                    style={{
                      height: `${h}%`,
                      minHeight: v > 0 ? 2 : 0,
                      background: s.color,
                    }}
                  />
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
