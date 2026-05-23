interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, { bg: string; color: string }> = {
  default: { bg: '#f7f7f7', color: '#6a6a6a' },
  success: { bg: '#f0fdf4', color: '#16a34a' },
  warning: { bg: '#fff8ed', color: '#b45309' },
  danger: { bg: '#fff0f0', color: '#c13515' },
};

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const { bg, color } = variantStyles[variant];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {children}
    </span>
  );
}
