
export enum AdArchetype {
  US_VS_THEM = 'Us vs. Them',
  THE_SKEPTIC = 'The Skeptic (UGC)',
  AESTHETIC_ASMR = 'Aesthetic / ASMR',
  THE_UGLY_AD = 'The Ugly Ad',
  FOUNDER_STORY = 'Founder Story',
}

export enum AdFormat {
  SQUARE = '1:1 (Instagram/Facebook Feed)',
  STORY = '9:16 (TikTok/Reels/Stories)',
  LANDSCAPE = '16:9 (YouTube/Web)',
  CAROUSEL = 'Carrusel (Secuencia 4+ Slides)',
}

export enum AdTone {
  URGENT = 'Urgente / Escasez',
  HUMOROUS = 'Humorístico / Meme',
  EMOTIONAL = 'Emocional / Inspirador',
  CONTROVERSIAL = 'Controversial / Polarizante',
  EDUCATIONAL = 'Educativo / Autoridad',
  RELAXED = 'Relajado / Chill',
}

export interface AdInputData {
  productName: string;
  painPoint: string;
  targetAudience: string;
  archetype: AdArchetype;
  format: AdFormat;
  tone: AdTone; // New field
  // New features
  useResearch: boolean;
  useProMode: boolean;
  colorPalette: string;
  customColors?: string[]; // [Primary, Secondary, Accent] in Hex
  referenceImage?: string; // Base64 string for product reference
  logoImage?: string; // New field: Base64 for Logo
}

export interface CarouselSlide {
  slideNumber: number;
  visualDescription: string; // Description for the designer
  headline: string;
  body: string;
}

export interface AdScript {
  title: string;
  hook: string;
  body: string;
  cta: string;
  // For Carousel Format
  slides?: CarouselSlide[];
}

export interface ResearchSource {
  title: string;
  uri: string;
}

export interface GeneratedAd {
  id: string;
  timestamp: number;
  scripts: AdScript[]; // Now an array of 5 scripts
  selectedScriptIndex?: number; // UI state for saved selection
  imagePrompt: string;
  imageUrl: string;
  videoUrl?: string; 
  userRequest?: string;
  researchSources?: ResearchSource[];
}

export interface AdSet {
  id: string;
  name: string;
  targetAudience: string;
  archetype: AdArchetype;
  format: AdFormat;
  ads: GeneratedAd[];
  createdAt: number;
  // Store context for custom colors if used
  customColors?: string[];
  // Store original reference image to allow persistent image-to-image edits
  referenceImage?: string;
  logoImage?: string; // Persist logo
}

export interface Session {
  id: string;
  title: string;
  productInfo: {
    name: string;
    painPoint: string;
  };
  adSets: AdSet[];
  lastModified: number;
}

export const ARCHETYPES_LIST = [
  { value: AdArchetype.US_VS_THEM, label: "Us vs. Them (Comparativo)" },
  { value: AdArchetype.THE_SKEPTIC, label: "The Skeptic (Testimonio UGC)" },
  { value: AdArchetype.AESTHETIC_ASMR, label: "Aesthetic / ASMR (Visual)" },
  { value: AdArchetype.THE_UGLY_AD, label: "The Ugly Ad (Brutalismo/Oferta)" },
  { value: AdArchetype.FOUNDER_STORY, label: "Founder Story (Narrativa)" },
];

export const FORMATS_LIST = [
  { value: AdFormat.SQUARE, label: "Cuadrado (1:1)" },
  { value: AdFormat.STORY, label: "Vertical / Stories (9:16)" },
  { value: AdFormat.LANDSCAPE, label: "Horizontal (16:9)" },
  { value: AdFormat.CAROUSEL, label: "Carrusel (4:5 / 1:1 - Multi-Slide)" },
];

export const TONES_LIST = [
  { value: AdTone.URGENT, label: "🔥 Urgente" },
  { value: AdTone.HUMOROUS, label: "😂 Humorístico" },
  { value: AdTone.EMOTIONAL, label: "❤️ Emocional" },
  { value: AdTone.CONTROVERSIAL, label: "👀 Controversial" },
  { value: AdTone.EDUCATIONAL, label: "🧠 Educativo" },
  { value: AdTone.RELAXED, label: "🧘 Relajado" },
];

export const COLOR_PALETTES = [
  { id: 'default', name: 'Inteligente (AI)', colors: ['bg-slate-700', 'bg-slate-500', 'bg-slate-300'] },
  { id: 'high-contrast', name: 'Alto Impacto', colors: ['bg-yellow-400', 'bg-black', 'bg-red-500'] },
  { id: 'aesthetic', name: 'Minimal / Luxury', colors: ['bg-stone-100', 'bg-stone-300', 'bg-stone-800'] },
  { id: 'neon', name: 'Cyber / GenZ', colors: ['bg-pink-500', 'bg-cyan-400', 'bg-purple-600'] },
  { id: 'nature', name: 'Orgánico / Eco', colors: ['bg-green-700', 'bg-green-300', 'bg-amber-100'] },
  { id: 'pastel', name: 'Soft / Care', colors: ['bg-rose-200', 'bg-blue-200', 'bg-purple-200'] },
  { id: 'custom', name: 'Personalizado', colors: ['bg-white', 'bg-gray-400', 'bg-black'] }, // Placeholder for custom UI
];
