import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, ExternalLink, Smartphone } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { APK_DOWNLOAD_URL, GITHUB_RELEASES_URL } from '../config';

export function DesktopSidebar() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(APK_DOWNLOAD_URL, {
      width: 200,
      margin: 2,
      color: { dark: '#1A1028', light: '#FFFFFF' },
    }).then(setQrDataUrl);
  }, []);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 shrink-0 sticky top-[3.5rem] h-[calc(100dvh-3.5rem)] p-5 border-r border-[var(--border)]">
      <div className="mb-8">
        <BrandLogo size="lg" />
        <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
          Live hospital queue tracking for the Maldives. Pick a hospital to view counters and set token alerts.
        </p>
      </div>

      <div
        className="rounded-2xl p-5 border border-[var(--border)] mb-5"
        style={{ background: 'var(--surface-elevated)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="text-sm font-bold">Get the Android app</h2>
        </div>
        <p className="text-xs text-[var(--muted)] mb-4 leading-relaxed">
          Scan with your phone to download the APK, or open the release page on desktop.
        </p>
        {qrDataUrl && (
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl border border-[var(--border)] bg-white/5">
              <img src={qrDataUrl} alt="QR code to download QuePulse APK" className="w-[180px] h-[180px]" />
            </div>
          </div>
        )}
        <a
          href={APK_DOWNLOAD_URL}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl brand-gradient text-white text-xs font-bold mb-2"
        >
          <Download className="w-4 h-4" /> Download APK
        </a>
        <a
          href={GITHUB_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--primary)]"
        >
          <ExternalLink className="w-3 h-3" /> All releases on GitHub
        </a>
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--border)] text-[10px] text-[var(--muted)] space-y-1.5">
        <p>Open source · Not affiliated with hospitals</p>
        <p>
          <a href="mailto:chaos.studio.mv@gmail.com" className="text-[var(--primary)] hover:underline">
            chaos.studio.mv@gmail.com
          </a>
        </p>
        <p>
          <a href="https://portfolio.chaoticstudio.workers.dev/studio" target="_blank" rel="noopener noreferrer" className="hover:underline">
            chaos.studio
          </a>
          {' · '}
          <a href="https://t.me/+9609401011" className="hover:underline">+960 9401011</a>
        </p>
      </div>
    </aside>
  );
}
