/**
 * Utility functions for Usage Info feature
 */

// Wrapper for navigator.storage.estimate() with fallback
export async function navigatorStorageEstimate(): Promise<{
  quota: number;
  usage: number;
}> {
  if (navigator?.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota ?? 0,
      usage: estimate.usage ?? 0,
    };
  }
  return { quota: 0, usage: 0 };
}

/**
 * Calculate API cost based on tokens and pricing info.
 * @param tokensSent number of prompt tokens
 * @param tokensReceived number of completion tokens
 * @param pricing optional pricing info { prompt: number, completion: number } in $/million tokens
 */
export function calculateApiCost(
  tokensSent: number,
  tokensReceived: number,
  pricing?: { prompt: number; completion: number }
): number {
  if (!pricing) return 0;
  const promptCost = (tokensSent / 1_000_000) * (pricing.prompt ?? 0);
  const completionCost =
    (tokensReceived / 1_000_000) * (pricing.completion ?? 0);
  return +(promptCost + completionCost).toFixed(6);
}
