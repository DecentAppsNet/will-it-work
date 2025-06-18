export const KILOBYTE = 1024;
export const MEGABYTE = KILOBYTE * 1024;
export const GIGABYTE = MEGABYTE * 1024;

export function byteCountToKb(byteCount:number, decimalPlaces:number = 1):number {
  return Math.round((byteCount / KILOBYTE) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

export function byteCountToMb(byteCount:number, decimalPlaces:number = 1):number {
  return Math.round((byteCount / MEGABYTE) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

export function byteCountToGb(byteCount:number, decimalPlaces:number = 1):number {
  return Math.round((byteCount / GIGABYTE) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

export function bytesPerMsecToGbPerSec(bytesPerMs:number, decimalPlaces:number = 1):number {
  return Math.round((bytesPerMs * 1000 / GIGABYTE) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

export function formatByteCount(byteCount:number):string {
  if (byteCount < KILOBYTE) return `${Math.round(byteCount)} B`;
  else if (byteCount < MEGABYTE) return `${byteCountToKb(byteCount)} KB`;
  else if (byteCount < GIGABYTE) return `${byteCountToMb(byteCount)} MB`;
  else return `${byteCountToGb(byteCount)} GB`;
}

// Returns a pseudorandom and reproducible value. Useful for writing values to a buffer that resist memory compression.
export function randomishMemoryValue(offset:number):number {
  let x = offset >>> 0;
  x ^= x >> 17;
  x *= 0xed5ad4bb;
  x ^= x >> 11;
  x *= 0xac4c1b51;
  x ^= x >> 15;
  x *= 0x31848bab;
  x ^= x >> 14;
  return x & 0xFF;
}

type NullableNumber = number | null;
let availableSystemMemoryOverride:NullableNumber = null;

export function estimateSystemMemory():number {
  if (availableSystemMemoryOverride !== null) return availableSystemMemoryOverride;
  if ('deviceMemory' in navigator) return (navigator as any).deviceMemory;
  if ('memory' in performance) return (performance as any).memory.jsHeapSizeLimit;
  return 0;
}

export function overrideSystemMemory(memoryInBytes:NullableNumber):void {
  availableSystemMemoryOverride = memoryInBytes;
}