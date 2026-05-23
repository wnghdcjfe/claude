interface ProgressBarProps {
  value: number;
  label?: string;
  showPercent?: boolean;
}

export default function ProgressBar({ value, label, showPercent = true }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1.5">
      {(label || showPercent) && (
        <div className="flex justify-between text-sm" style={{ color: '#6a6a6a' }}>
          {label && <span>{label}</span>}
          {showPercent && (
            <span className="font-medium" style={{ color: '#222222' }}>
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#f2f2f2' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: '#ff385c' }}
        />
      </div>
    </div>
  );
}
