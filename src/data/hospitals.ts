import type { SiteSource } from '../types';

export type HospitalRegion = 'malé' | 'greater-malé' | 'north' | 'south' | 'atoll';

export interface HospitalConfig {
  id: SiteSource;
  name: string;
  shortName: string;
  location: string;
  region: HospitalRegion;
  logo: string;
  accent: string;
  accentMuted: string;
  live: boolean;
  tagline?: string;
}

export const HOSPITALS: HospitalConfig[] = [
  {
    id: 'hmh',
    name: 'Hulhumalé Hospital',
    shortName: 'HMH',
    location: 'Hulhumalé',
    region: 'greater-malé',
    logo: '/hospitals/hmh.svg',
    accent: '#0EA5E9',
    accentMuted: 'rgba(14,165,233,0.15)',
    live: true,
    tagline: 'Greater Malé region',
  },
  {
    id: 'adk',
    name: 'ADK Hospital',
    shortName: 'ADK',
    location: 'Malé',
    region: 'malé',
    logo: '/hospitals/adk.svg',
    accent: '#EF4444',
    accentMuted: 'rgba(239,68,68,0.15)',
    live: true,
  },
  {
    id: 'vitalcare',
    name: 'Vital Care',
    shortName: 'VitalCare',
    location: 'Malé',
    region: 'malé',
    logo: '/hospitals/vitalcare.svg',
    accent: '#14B8A6',
    accentMuted: 'rgba(20,184,166,0.15)',
    live: true,
  },
  {
    id: 'igmh',
    name: 'Indira Gandhi Memorial Hospital',
    shortName: 'IGMH',
    location: 'Malé',
    region: 'malé',
    logo: '/hospitals/igmh.svg',
    accent: '#8B5CF6',
    accentMuted: 'rgba(139,92,246,0.15)',
    live: true,
  },
  {
    id: 'vilimale',
    name: 'Vilimale Hospital',
    shortName: 'Vilimale',
    location: 'Vilimale',
    region: 'greater-malé',
    logo: '/hospitals/vilimale.svg',
    accent: '#F97316',
    accentMuted: 'rgba(249,115,22,0.15)',
    live: true,
  },
  {
    id: 'dharumavantha',
    name: 'Dharumavantha Hospital',
    shortName: 'Dharumavantha',
    location: 'Malé',
    region: 'malé',
    logo: '/hospitals/dharumavantha.svg',
    accent: '#22C55E',
    accentMuted: 'rgba(34,197,94,0.15)',
    live: true,
  },
  {
    id: 'urh',
    name: 'Ungoofaaru Regional Hospital',
    shortName: 'URH',
    location: 'Raa Atoll',
    region: 'north',
    logo: '/hospitals/urh.svg',
    accent: '#3B82F6',
    accentMuted: 'rgba(59,130,246,0.15)',
    live: true,
    tagline: 'Northern atolls',
  },
  {
    id: 'fah',
    name: 'Faafu Atoll Hospital',
    shortName: 'FAH',
    location: 'Faafu Atoll',
    region: 'atoll',
    logo: '/hospitals/fah.svg',
    accent: '#06B6D4',
    accentMuted: 'rgba(6,182,212,0.15)',
    live: true,
  },
  {
    id: 'shah',
    name: 'Shaviyani Atoll Hospital',
    shortName: 'Sh. Hospital',
    location: 'Sh. Funadhoo',
    region: 'north',
    logo: '/hospitals/shah.svg',
    accent: '#A855F7',
    accentMuted: 'rgba(168,85,247,0.15)',
    live: true,
    tagline: 'May be intermittent',
  },
  {
    id: 'asmh',
    name: 'Dr. Abdul Samad Memorial Hospital',
    shortName: 'ASMH',
    location: 'Thinadhoo, GDh Atoll',
    region: 'south',
    logo: '/hospitals/asmh.svg',
    accent: '#009899',
    accentMuted: 'rgba(0,152,153,0.15)',
    live: true,
    tagline: 'Southern atolls',
  },
];

export const HOSPITAL_MAP = Object.fromEntries(HOSPITALS.map((h) => [h.id, h])) as Record<
  SiteSource,
  HospitalConfig
>;

export const LIVE_HOSPITAL_IDS = HOSPITALS.filter((h) => h.live).map((h) => h.id);

export const REGIONS: { id: HospitalRegion | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'malé', label: 'Malé' },
  { id: 'greater-malé', label: 'Greater Malé' },
  { id: 'north', label: 'North' },
  { id: 'south', label: 'South' },
  { id: 'atoll', label: 'Atolls' },
];
