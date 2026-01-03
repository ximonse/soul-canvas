// src/utils/tokenLogging.ts
import { FEATURE_FLAGS } from './featureFlags';

type TokenEstimateItem = {
  label?: string;
  text: string;
};

type TokenEstimateDetail = {
  label: string;
  chars: number;
  tokens: number;
};

const estimateTokens = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.round(trimmed.length / 4));
};

const buildTokenEstimate = (items: TokenEstimateItem[], includeDetails: boolean) => {
  if (!includeDetails) {
    const total = items.reduce((sum, item) => sum + estimateTokens(item.text), 0);
    return { total };
  }

  const details: TokenEstimateDetail[] = items.map((item, index) => ({
    label: item.label ?? `item ${index + 1}`,
    chars: item.text.length,
    tokens: estimateTokens(item.text),
  }));
  const total = details.reduce((sum, item) => sum + item.tokens, 0);
  return { details, total };
};

export const logTokenEstimate = (
  label: string,
  items: TokenEstimateItem[],
  options?: { logDetails?: boolean }
) => {
  if (!FEATURE_FLAGS.logChatTokens) return;
  const includeDetails = options?.logDetails !== false;
  const estimate = buildTokenEstimate(items, includeDetails);
  const suffix = items.length > 1 ? ` | items ${items.length}` : '';
  console.groupCollapsed(`[AI][estimate] ${label} | est tokens ${estimate.total}${suffix}`);
  if (includeDetails && 'details' in estimate) {
    console.table(estimate.details);
  }
  console.groupEnd();
};

export const logUsage = (label: string, usage: unknown) => {
  if (!FEATURE_FLAGS.logChatTokens || !usage) return;
  console.info(`[AI][usage] ${label}`, usage);
};
