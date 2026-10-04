import type { TranslatedSegment } from "./segments";

/**
 * Minimal translation input contract.
 * Context is provided by passing sequences of neighboring segments together,
 * keeping the item-level contract simple and provider-independent.
 */
export interface TranslationInput {
  id: string; // prefix: seg_
  arabic: string;
}

export interface TranslationOutput {
  id: string; // prefix: seg_
  english: string;
}

export interface TranslationProviderInfo {
  provider: string;
  model: string;
}

export interface TranslationResult {
  segments: TranslatedSegment[];
  translation: TranslationProviderInfo;
}
