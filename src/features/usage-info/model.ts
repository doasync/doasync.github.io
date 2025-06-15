import { createEffect, createEvent, createStore, sample } from 'effector';

import { $currentChatTokens } from '@/features/chat';
import { $currentChatSession, ChatSession } from '@/features/chat-history';

import { calculateApiCost, navigatorStorageEstimate } from './utils';

interface UsageStatsParams {
  chatSession: ChatSession | null;
  totalTokens: number;
}

// Event to trigger refresh
export const refreshUsageInfo = createEvent();

// Main usage stats store
export const $usageStats = createStore({
  tokensSent: 0,
  tokensReceived: 0,
  contextTokensUsed: 0,
  contextTokensMax: 1_000_000, // default to 1M
  apiCost: 0,
  chatSizeMB: 0,
  dbSizeMB: 0,
  quotaMB: 0,
  totalUsageMB: 0,
  chatId: null as string | null,
});

// Derived store for context window percent
export const $contextWindowPercent = $usageStats.map((stats) =>
  stats.contextTokensMax > 0
    ? (stats.contextTokensUsed / stats.contextTokensMax) * 100
    : 0,
);

// Effect to fetch storage info
export const fetchStorageInfoFx = createEffect(async () => {
  const { quota, usage } = await navigatorStorageEstimate();

  // Placeholder: you will replace this with real IDB chat size calc
  const databaseSizeMB = usage / (1024 * 1024);

  return {
    quotaMB: quota / (1024 * 1024),
    dbSizeMB: databaseSizeMB,
    totalUsageMB: usage / (1024 * 1024),
    chatSizeMB: 0, // will be updated separately
  };
});

// Effect to calculate tokens, context, API cost
export const calculateUsageStatsFx = createEffect(
  async ({ chatSession, totalTokens }: UsageStatsParams) => {
    const tokensSent = totalTokens;
    const tokensReceived = 0;
    const contextTokensUsed = totalTokens;
    const contextTokensMax =
      chatSession?.settings?.model?.context_length ?? 1_000_000;
    const pricing = chatSession?.settings?.model?.pricing;
    const apiCost = calculateApiCost(
      tokensSent,
      tokensReceived,
      pricing
        ? {
            prompt:
              typeof pricing.prompt === 'string'
                ? Number.parseFloat(pricing.prompt)
                : pricing.prompt || 0,
            completion:
              typeof pricing.completion === 'string'
                ? Number.parseFloat(pricing.completion)
                : pricing.completion || 0,
          }
        : undefined,
    );

    return {
      tokensSent,
      tokensReceived,
      contextTokensUsed,
      contextTokensMax,
      apiCost,
      chatId: chatSession?.id ?? null,
    };
  },
);

// When refreshUsageInfo is triggered, fetch storage info
sample({
  clock: refreshUsageInfo,
  target: fetchStorageInfoFx,
});

// When chat or tokens change, recalc usage stats
sample({
  clock: [
    refreshUsageInfo,
    $currentChatSession.updates,
    $currentChatTokens.updates,
  ],
  source: {
    chatSession: $currentChatSession,
    totalTokens: $currentChatTokens,
  },
  fn: ({ chatSession, totalTokens }): UsageStatsParams => ({
    chatSession,
    totalTokens,
  }),
  target: calculateUsageStatsFx,
});

// Merge storage info and usage stats into $usageStats
sample({
  clock: [fetchStorageInfoFx.doneData, calculateUsageStatsFx.doneData],
  source: $usageStats,
  fn: (current, payload) => ({ ...current, ...payload }),
  target: $usageStats,
});
