export interface Word {
  text: string;
  start: number;
  end: number;
}

export interface WordsDoc {
  language_code: string;
  audio_duration_ms: number;
  text: string;
  words: Word[];
}

export type AssetKind = "emoticon" | "photo";
export type VisualMode = "emoticon" | "photo";

export interface EmoticonCue {
  emoticonFileName: string;
  startMs: number;
  durationMs: number;
  assetKind: AssetKind;
  visualMode: VisualMode;
  keywords?: string[];
  primaryVisualSubject?: string;
  visualKeywords?: string[];
}

export interface CaptionSegment {
  startMs: number;
  endMs: number;
  text: string;
  wordIndices: number[];
  highlightToken?: string | null;
  highlightColor?: string | null;
}

export interface NumberCard {
  startMs: number;
  durationMs: number;
  text: string;
  unit?: string;
}

export interface CompanyLogoCue {
  startMs: number;
  durationMs: number;
  logoFileName: string;
}

export interface CueProps {
  audioFileName: string;
  wordsFileName: string;
  bgColor: string;
  chunkSize: number;
  emoticonCues: EmoticonCue[];
  captionSegments: CaptionSegment[];
  companyLogoCues: CompanyLogoCue[];
  numberCards: NumberCard[];
  highlightKeywords: string[];
  openingText: string;
  openingDurationMs: number;
  showOpening: boolean;
  ctaText: string;
  showOutro: boolean;
  durationInFrames: number;
}
