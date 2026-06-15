import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'public/icons');
const androidRes = join(process.cwd(), 'android/app/src/main/res');
mkdirSync(dir, { recursive: true });

const sourcePath = join(dir, 'logo-source.png');
if (!existsSync(sourcePath)) {
  console.error('Missing public/icons/logo-source.png — add your transparent logo PNG first.');
  process.exit(1);
}

/** Trim and normalize the source transparent PNG */
async function getLogoBuffer() {
  return sharp(sourcePath).trim({ threshold: 10 }).ensureAlpha().png().toBuffer();
}

/** Transparent logo for in-app UI (header, sidebar) */
async function writeTransparentLogo(logo) {
  for (const size of [128, 256, 512]) {
    await sharp(logo)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(dir, `logo-transparent-${size}.png`));
  }
  await sharp(logo)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(dir, 'logo-transparent.png'));
}

/** White rounded-square app icon (PWA install, favicon, notifications) */
async function composeAppIcon(logo, size, logoScale = 0.72, cornerRadius = 0.2) {
  const logoSize = Math.round(size * logoScale);
  const pad = Math.round((size - logoSize) / 2);
  const mark = await sharp(logo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const radius = Math.round(size * cornerRadius);

  const whitePlate = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="#FFFFFF"/>
    </svg>`
  );

  return sharp(whitePlate).composite([{ input: mark, top: pad, left: pad }]).png().toBuffer();
}

async function writeAppIcons(logo) {
  const icon192 = await composeAppIcon(logo, 192);
  const icon512 = await composeAppIcon(logo, 512);
  const maskable512 = await composeAppIcon(logo, 512, 0.6, 0.18);

  await sharp(icon192).toFile(join(dir, 'icon-192.png'));
  await sharp(icon512).toFile(join(dir, 'icon-512.png'));
  await sharp(maskable512).toFile(join(dir, 'icon-maskable-512.png'));
  await sharp(icon512).toFile(join(dir, 'icon.png'));
}

/** Android launcher mipmaps */
async function writeAndroidIcons(logo) {
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
    const buf = await composeAppIcon(logo, size, 0.72, 0.2);
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      await sharp(buf).toFile(join(outDir, name));
    }
  }

  const fgSize = 432;
  const logoSize = Math.round(fgSize * 0.58);
  const pad = Math.round((fgSize - logoSize) / 2);
  const fgMark = await sharp(logo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const foreground = await sharp({
    create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fgMark, top: pad, left: pad }])
    .png()
    .toBuffer();

  const fgSizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
  };
  for (const [folder, size] of Object.entries(fgSizes)) {
    await sharp(foreground).resize(size, size).toFile(join(androidRes, `${folder}/ic_launcher_foreground.png`));
  }
}

const logo = await getLogoBuffer();

await writeTransparentLogo(logo);
await writeAppIcons(logo);
await writeAndroidIcons(logo);

console.log('Icons generated from public/icons/logo-source.png');
