import { useIsMobile, useIsNativeApp } from '../hooks/useMediaQuery';

export function AppFooter() {
  const isMobile = useIsMobile();
  const isNative = useIsNativeApp();

  if (isNative) return null;

  if (isMobile) {
    return (
      <footer className="mt-6 mb-1 pt-4 border-t border-[var(--border)] text-center">
        <p className="text-[10px] text-[var(--muted)]">
          <a
            href="https://portfolio.chaoticstudio.workers.dev/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--primary)] font-semibold"
          >
            chaos.studio
          </a>
          {' · '}
          <a href="mailto:chaos.studio.mv@gmail.com" className="hover:underline">
            Contact
          </a>
        </p>
      </footer>
    );
  }

  return null;
}
