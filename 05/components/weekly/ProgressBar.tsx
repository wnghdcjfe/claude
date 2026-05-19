interface ProgressBarProps {
  value: number;
  label?: string;
  showPercent?: boolean;
}

export default function ProgressBar({ value, label, showPercent = true }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1">
      {(label || showPercent) && (
        <div className="flex justify-between text-sm text-gray-600">
          {label && <span>{label}</span>}
          {showPercent && <span className="font-medium">{clamped}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
