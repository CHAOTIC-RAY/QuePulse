export function AppFooter() {
  return (
    <footer className="mt-8 mb-2 pt-6 border-t border-[var(--border)] text-center space-y-2">
      <p className="text-[10px] text-[var(--muted)] leading-relaxed">
        Open source · Built for patients in the Maldives
      </p>
      <p className="text-[10px] text-[var(--muted)]">
        <a href="mailto:chaos.studio.mv@gmail.com" className="text-[var(--primary)] hover:underline">
          chaos.studio.mv@gmail.com
        </a>
      </p>
      <p className="text-[10px] text-[var(--muted)] leading-relaxed">
        Created from Passion by{' '}
        <a
          href="https://portfolio.chaoticstudio.workers.dev/studio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] hover:underline font-semibold"
        >
          chaos.studio
        </a>
      </p>
      <p className="text-[10px] text-[var(--muted)]">
        <a href="https://t.me/+9609401011" className="hover:underline">
          +960 9401011
        </a>{' '}
        <span className="opacity-70">(Telegram)</span>
      </p>
    </footer>
  );
}
