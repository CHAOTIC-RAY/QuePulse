function hospitalBadge(short, color, bg = '#ffffff') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="24" fill="${bg}"/>
  <rect x="4" y="4" width="88" height="88" rx="20" stroke="${color}" stroke-width="3" fill="${color}22"/>
  <text x="48" y="58" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="22" font-weight="800" fill="${color}">${short}</text>
</svg>`;
}

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'public/hospitals');
mkdirSync(dir, { recursive: true });

const hospitals = [
  ['hmh', 'HMH', '#0EA5E9'],
  ['adk', 'ADK', '#EF4444'],
  ['vitalcare', 'VC', '#14B8A6'],
  ['igmh', 'IGMH', '#8B5CF6'],
  ['vilimale', 'VMH', '#F97316'],
  ['dharumavantha', 'DMH', '#22C55E'],
  ['urh', 'URH', '#3B82F6'],
  ['fah', 'FAH', '#06B6D4'],
  ['shah', 'ShAH', '#A855F7'],
];

for (const [id, short, color] of hospitals) {
  writeFileSync(join(dir, `${id}.svg`), hospitalBadge(short, color));
}
