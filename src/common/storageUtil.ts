import { hasStorageSupport } from "./featureUtil";

type NullableNumber = number | null;
let availableStorageOverride:NullableNumber = null;

export async function estimateAvailableStorage() {
  if (availableStorageOverride !== null) return availableStorageOverride;

  if (!hasStorageSupport()) return 0;
  const estimate = await navigator.storage.estimate();
  if (!estimate || estimate.quota === undefined || estimate.usage === undefined) return 0;
  
  const quota = estimate.quota;
  const usage = estimate.usage;
  return quota - usage;
}

export function overrideAvailableStorage(availableBytes:NullableNumber):void {
  availableStorageOverride = availableBytes;
}