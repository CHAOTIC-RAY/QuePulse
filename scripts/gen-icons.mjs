import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'public/icons');
mkdirSync(dir, { recursive: true });

const markSvg = readFileSync(join(dir, 'logo-mark.svg'));

// Transparent PNGs for PWA / favicon / notifications
for (const size of [192, 512]) {
  await sharp(markSvg).resize(size, size).png().toFile(join(dir, `icon-${size}.png`));
}

await sharp(markSvg).resize(512, 512).png().toFile(join(dir, 'icon.png'));

// Maskable icon with safe padding on transparent canvas
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <circle cx="256" cy="220" r="100" stroke="#F9A825" stroke-width="20" fill="none"/>
  <circle cx="256" cy="220" r="78" stroke="#7B4397" stroke-width="16" fill="none"/>
  <path d="M256 300 L256 360 L284 332 L312 372 L338 328 L364 360" stroke="#7B4397" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(join(dir, 'icon-maskable-512.png'));

// Wordmark-style transparent PNG for header (logo + text is separate in UI)
writeFileSync(
  join(dir, 'icon.svg'),
  markSvg.toString()
);

console.log('Generated transparent PNG icons in public/icons/');
