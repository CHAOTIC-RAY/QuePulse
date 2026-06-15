interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

const textSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

export function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/icons/icon.png"
        alt="QuePulse"
        className={`${sizes[size]} object-contain shrink-0`}
        width={size === 'lg' ? 56 : size === 'md' ? 40 : 32}
        height={size === 'lg' ? 56 : size === 'md' ? 40 : 32}
      />
      {showText && (
        <span className={`font-black tracking-tight ${textSizes[size]}`}>
          Que<span className="text-[var(--accent)]">Pulse</span>
        </span>
      )}
    </span>
  );
}
