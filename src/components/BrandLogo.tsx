interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'mobile';
  showText?: boolean;
  className?: string;
  /** Plain single-tone style matching muted body text */
  variant?: 'default' | 'muted';
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

export function BrandLogo({
  size = 'md',
  showText = true,
  className = '',
  variant = 'default',
}: BrandLogoProps) {
  const muted = variant === 'muted';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/icons/logo-transparent.png"
        alt=""
        className={`${logoSizes[size]} object-contain shrink-0 ${muted ? 'brand-logo-muted' : ''}`}
        draggable={false}
      />
      {showText && (
        <span
          className={`font-black tracking-tight leading-none ${textSizes[size]} ${
            muted ? 'text-[var(--muted)]' : ''
          }`}
        >
          {muted ? (
            'QuePulse'
          ) : (
            <>
              Que<span className="text-[var(--accent)]">Pulse</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
