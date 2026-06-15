import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'public/icons');
const androidRes = join(process.cwd(), 'android/app/src/main/res');
mkdirSync(dir, { recursive: true });

const markSvg = readFileSync(join(dir, 'logo-mark.svg'));

/** Transparent logo for in-app UI (header, sidebar) */
async function writeTransparentLogo() {
  for (const size of [128, 256, 512]) {
    await sharp(markSvg).resize(size, size).png().toFile(join(dir, `logo-transparent-${size}.png`));
  }
  await sharp(markSvg).resize(256, 256).png().toFile(join(dir, 'logo-transparent.png'));
}

/** White rounded-square app icon (PWA install, favicon, notifications) */
async function composeAppIcon(size, logoScale = 0.68, cornerRadius = 0.2) {
  const logoSize = Math.round(size * logoScale);
  const pad = Math.round((size - logoSize) / 2);
  const logo = await sharp(markSvg).resize(logoSize, logoSize).png().toBuffer();
  const radius = Math.round(size * cornerRadius);

  const whitePlate = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="#FFFFFF"/>
    </svg>`
  );

  return sharp(whitePlate).composite([{ input: logo, top: pad, left: pad }]).png().toBuffer();
}

async function writeAppIcons() {
  const icon192 = await composeAppIcon(192);
  const icon512 = await composeAppIcon(512);
  const maskable512 = await composeAppIcon(512, 0.58, 0.18);

  await sharp(icon192).toFile(join(dir, 'icon-192.png'));
  await sharp(icon512).toFile(join(dir, 'icon-512.png'));
  await sharp(maskable512).toFile(join(dir, 'icon-maskable-512.png'));
  await sharp(icon512).toFile(join(dir, 'icon.png'));
}

/** Android launcher mipmaps (full icon with white background) */
async function writeAndroidIcons() {
  const densities = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };

  for (const [folder, size] of Object.entries(densities)) {
    const outDir = join(androidRes, folder);
    mkdirSync(outDir, { recursive: true });
    const buf = await composeAppIcon(size, 0.68, 0.2);
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      await sharp(buf).toFile(join(outDir, name));
    }
  }

  // Adaptive icon foreground: transparent logo only (background is white in XML)
  const fgSize = 432;
  const logoSize = Math.round(fgSize * 0.55);
  const pad = Math.round((fgSize - logoSize) / 2);
  const fgLogo = await sharp(markSvg).resize(logoSize, logoSize).png().toBuffer();
  const transparent = await sharp({
    create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fgLogo, top: pad, left: pad }])
    .png()
    .toBuffer();

  await sharp(transparent).toFile(join(androidRes, 'mipmap-xxxhdpi/ic_launcher_foreground.png'));
  for (const folder of ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi']) {
    const size = { 'mipmap-mdpi': 108, 'mipmap-hdpi': 162, 'mipmap-xhdpi': 216, 'mipmap-xxhdpi': 324 }[folder];
    await sharp(transparent).resize(size, size).toFile(join(androidRes, `${folder}/ic_launcher_foreground.png`));
  }
}

writeFileSync(join(dir, 'icon.svg'), markSvg.toString());

await writeTransparentLogo();
await writeAppIcons();
await writeAndroidIcons();

console.log('Generated transparent UI logo + white-background app icons');
