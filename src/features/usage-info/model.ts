import {
  createStore,
  createEvent,
  createEffect,
  sample,
  combine,
} from "effector";
import { $currentChatSession } from "@/features/chat-history/model";
import { $currentChatTokens } from "@/features/chat";
import { navigatorStorageEstimate } from "./utils";
import { calculateApiCost } from "./utils";

interface UsageStatsParams {
  chatSession: any; // Replace with ChatSession type if available
  totalTokens: number;
}

// Event to trigger refresh
export const refreshUsageInfo = createEvent();

// Main usage stats store
export const $usageStats = createStore({
  tokensSent: 0,
  tokensReceived: 0,
  contextTokensUsed: 0,
  contextTokensMax: 1000000, // default to 1M
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
    : 0
);

// Effect to fetch storage info
export const fetchStorageInfoFx = createEffect(async () => {
  const { quota, usage } = await navigatorStorageEstimate();

  // Placeholder: you will replace this with real IDB chat size calc
  const dbSizeMB = usage / (1024 * 1024);

  return {
    quotaMB: quota / (1024 * 1024),
    dbSizeMB,
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
    const contextTokensMax = chatSession?.contextWindow ?? 1000000; // fallback 1M
    const apiCost = calculateApiCost(
      tokensSent,
      tokensReceived,
      chatSession?.pricing
    );

    return {
      tokensSent,
      tokensReceived,
      contextTokensUsed,
      contextTokensMax,
      apiCost,
      chatId: chatSession?.id ?? null,
    };
  }
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
  source: combine({
    chatSession: $currentChatSession,
    totalTokens: $currentChatTokens,
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
