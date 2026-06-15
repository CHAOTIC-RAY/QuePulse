interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'mobile';
  showText?: boolean;
  className?: string;
}

const logoSizes = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
  mobile: 'h-8 w-8',
};

const textSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  mobile: 'text-lg',
};

export function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/icons/logo-transparent.png"
        alt=""
        className={`${logoSizes[size]} object-contain shrink-0`}
        draggable={false}
      />
      {showText && (
        <span className={`font-black tracking-tight leading-none ${textSizes[size]}`}>
          Que<span className="text-[var(--accent)]">Pulse</span>
        </span>
      )}
    </span>
  );
}
